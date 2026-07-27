"""Stage 6 — Reels.

For each of the three flagged quotes, find the exact word span in the transcript
(this is the "scan"), cut that slice out of the full episode audio, and build a
vertical 1080x1920 video with the quote captioned over a background — the reel
background image if the images stage made one, otherwise the show's burgundy.

Writes: reels/reel_1.mp4 … reel_3.mp4
"""

from __future__ import annotations

import re
import subprocess
import textwrap
from pathlib import Path

from ..config import Config, log
from ..project import Project

BG_COLOR = "0x5C0F28"
ACCENT = "0xC98BA0"
PAD_BEFORE = 0.4
PAD_AFTER = 0.6
MAX_REEL_SECONDS = 75
FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Georgia.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def run(project: Project, cfg: Config) -> None:
    episode = project.data.get("episode")
    full = project.audio_dir / "full_episode.mp3"
    transcript = episode.get("transcript") if episode else None
    if not full.exists() or not transcript:
        raise RuntimeError("Need the assembled episode and a transcript first.")

    words = transcript["words"]
    font = _find_font()
    images_dir = project.root / "images"
    made = []

    for n, reel in enumerate(episode.get("reels", []), start=1):
        span = _locate(words, reel["quote"])
        if not span:
            log("reels", f"reel {n}: couldn't locate quote in audio, skipping.")
            continue
        start = max(0.0, span[0] - PAD_BEFORE)
        end = min(episode.get("episode_seconds", span[1] + PAD_AFTER), span[1] + PAD_AFTER)
        dur = min(end - start, MAX_REEL_SECONDS)
        stamp = _timestamp(start)
        bg = images_dir / f"reel_{n}.png"
        out = project.reels_dir / f"reel_{n}.mp4"

        _render(full, out, start, dur, reel["quote"], stamp, cfg, font,
                bg if bg.exists() else None, project)
        reel["file"] = out.name
        reel["timestamp"] = stamp
        made.append(out.name)
        log("reels", f"reel {n} @ {stamp} ({dur:.0f}s) → {out.name}")

    project.mark_done("reels")
    project.save()
    log("reels", f"cut {len(made)} reels.")


def _locate(words: list[dict], quote: str) -> tuple[float, float] | None:
    """Find the contiguous run of transcript words that best matches the quote."""
    target = _norm(quote)
    if not target:
        return None
    toks = [_norm(w["w"]) for w in words]
    tgt_join = " ".join(target)
    # Slide a window the size of the quote across the transcript.
    best, best_score = None, 0.0
    win = len(target)
    for i in range(0, max(1, len(toks) - win + 1)):
        window = toks[i:i + win]
        score = _overlap(" ".join(window), tgt_join)
        if score > best_score:
            best_score, best = score, (i, i + win)
    if not best or best_score < 0.5:
        return None
    i, j = best
    return (words[i]["start"], words[min(j, len(words)) - 1]["end"])


def _overlap(a: str, b: str) -> float:
    aw, bw = set(a.split()), set(b.split())
    if not bw:
        return 0.0
    return len(aw & bw) / len(bw)


def _norm(text: str) -> list[str] | str:
    cleaned = re.sub(r"[^\w\s]", "", text.lower()).split()
    return cleaned


def _render(full, out, start, dur, quote, stamp, cfg, font, bg: Path | None,
            project: Project) -> None:
    wrapped = "\n".join(textwrap.wrap(f"“{quote}”", width=22)) or quote
    cap = project.reels_dir / f"_cap_{out.stem}.txt"
    cap.write_text(wrapped)
    footer = f"{cfg.show_name}  ·  {stamp}"
    ff = f":fontfile='{font}'" if font else ""

    vf = (
        f"drawtext=textfile='{cap}'{ff}:fontcolor=white:fontsize=64:"
        f"line_spacing=16:x=(w-text_w)/2:y=(h-text_h)/2-120:text_align=C:"
        f"shadowcolor=black@0.6:shadowx=2:shadowy=2,"
        f"drawtext=text='{footer}'{ff}:fontcolor={ACCENT}:fontsize=38:"
        f"x=(w-text_w)/2:y=h-260"
    )

    if bg:
        # Ken-Burns-free static background image scaled/cropped to vertical.
        inputs = ["-loop", "1", "-t", f"{dur:.3f}", "-i", str(bg)]
        pre = ("scale=1080:1920:force_original_aspect_ratio=increase,"
               "crop=1080:1920,eq=brightness=-0.10,")
    else:
        inputs = ["-f", "lavfi", "-i", f"color=c={BG_COLOR}:s=1080x1920:d={dur:.3f}"]
        pre = ""

    subprocess.run(
        ["ffmpeg", "-y", *inputs,
         "-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", str(full),
         "-vf", pre + vf,
         "-map", "0:v", "-map", "1:a",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30",
         "-c:a", "aac", "-b:a", "192k", "-shortest", str(out)],
        check=True, capture_output=True,
    )


def _find_font() -> str:
    for f in FONT_CANDIDATES:
        if Path(f).exists():
            return f
    return ""


def _timestamp(seconds: float) -> str:
    m, s = divmod(int(seconds), 60)
    return f"{m}:{s:02d}"
