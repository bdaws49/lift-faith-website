"""Stage 4 — Reels.

Take the three reel quotes flagged in the script, find the block each one lives
in, and cut that block's audio straight out of the assembled episode (using the
timeline from stage 3). Each clip becomes a vertical 1080x1920 video with the
quote captioned over the show's burgundy background — ready for
Reels / TikTok / Shorts.

Writes: reels/reel_1.mp4 … reel_3.mp4
"""

from __future__ import annotations

import subprocess
import textwrap
from pathlib import Path

from ..config import Config, log
from ..project import Project

BG_COLOR = "0x5C0F28"      # deep burgundy, matches the Lift / Under the Scope look
ACCENT = "0xC98BA0"        # muted rose for the footer line
MAX_REEL_SECONDS = 75      # keep shorts short; trim long blocks
FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Georgia.ttf",   # macOS (show font)
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",  # Linux
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def run(project: Project, cfg: Config) -> None:
    episode = project.data.get("episode")
    full = project.audio_dir / "full_episode.mp3"
    if not episode or not full.exists():
        raise RuntimeError("Assemble the episode first — no full_episode.mp3 found.")

    font = _find_font()
    blocks = {b["index"]: b for b in episode["blocks"]}
    made = []

    for n, reel in enumerate(episode.get("reels", []), start=1):
        block = blocks.get(reel["block_index"])
        if not block or "start" not in block:
            log("reels", f"reel {n}: block {reel['block_index']} has no timeline, skipping.")
            continue

        start = block["start"]
        dur = min(block.get("duration", 0.0), MAX_REEL_SECONDS)
        stamp = _timestamp(start)
        out = project.reels_dir / f"reel_{n}.mp4"

        _render_reel(full, out, start, dur, reel["quote"], stamp, cfg, font, project)
        reel["file"] = out.name
        reel["timestamp"] = stamp
        made.append(out.name)
        log("reels", f"reel {n} @ {stamp} → {out.name}")

    project.mark_done("reels")
    project.save()
    log("reels", f"cut {len(made)} reels.")


def _render_reel(full: Path, out: Path, start: float, dur: float, quote: str,
                 stamp: str, cfg: Config, font: str, project: Project) -> None:
    # Pre-wrap the caption so we don't fight ffmpeg's text layout; write to a
    # file to avoid quote/escaping headaches inside the filtergraph.
    wrapped = "\n".join(textwrap.wrap(f"“{quote}”", width=22)) or quote
    cap = project.reels_dir / f"_cap_{out.stem}.txt"
    cap.write_text(wrapped)

    footer = f"{cfg.show_name}  ·  {stamp}"
    fontfile = f":fontfile='{font}'" if font else ""

    vf = (
        f"drawtext=textfile='{cap}'{fontfile}:fontcolor=white:fontsize=64:"
        f"line_spacing=16:x=(w-text_w)/2:y=(h-text_h)/2-120:"
        f"box=0:text_align=C,"
        f"drawtext=text='{footer}'{fontfile}:fontcolor={ACCENT}:fontsize=38:"
        f"x=(w-text_w)/2:y=h-260"
    )

    subprocess.run(
        [
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", f"color=c={BG_COLOR}:s=1080x1920:d={dur:.3f}",
            "-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", str(full),
            "-vf", vf,
            "-map", "0:v", "-map", "1:a",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30",
            "-c:a", "aac", "-b:a", "192k", "-shortest",
            str(out),
        ],
        check=True, capture_output=True,
    )


def _find_font() -> str:
    for f in FONT_CANDIDATES:
        if Path(f).exists():
            return f
    return ""  # ffmpeg will fall back to its default; captions still render


def _timestamp(seconds: float) -> str:
    m, s = divmod(int(seconds), 60)
    return f"{m}:{s:02d}"
