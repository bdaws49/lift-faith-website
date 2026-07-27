"""Stage 3 — Assemble.

Pick up the six segment audio files you generated in CloneVoice and stitch them
into one full episode, in play order (hook → intro → part1 → ad → part2 →
outro). As we lay them end to end we record each segment's start time, giving an
exact timeline.

Reads:  audio/01_hook.mp3 … audio/06_outro.mp3  (mp3 or wav)
Writes: audio/full_episode.mp3, plus a "timeline" onto each segment.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

from ..config import SEGMENTS, Config, log
from ..project import Project

GAP_SECONDS = 0.6  # a short breath between segments


def run(project: Project, cfg: Config) -> None:
    episode = project.data.get("episode")
    if not episode:
        raise RuntimeError("No script yet — run the earlier stages first.")

    files = _locate_segment_audio(project)  # errors clearly if any are missing

    # Compute each segment's start time and duration.
    timeline = {}
    cursor = 0.0
    for i, seg in enumerate(SEGMENTS, start=1):
        path = files[seg]
        dur = _duration_seconds(path)
        timeline[seg] = {"file": path.name, "start": round(cursor, 3), "duration": dur}
        cursor += dur + GAP_SECONDS
    episode["timeline"] = timeline
    episode["episode_seconds"] = round(cursor, 3)

    out = project.audio_dir / "full_episode.mp3"
    _concat_with_gaps([files[s] for s in SEGMENTS], out, project.audio_dir)

    project.mark_done("assemble")
    log("assemble", f"full episode → {out.name} ({episode['episode_seconds']/60:.1f} min)")


def _locate_segment_audio(project: Project) -> dict[str, Path]:
    """Find audio/NN_seg.(mp3|wav) for each segment; list what's missing."""
    found, missing = {}, []
    for i, seg in enumerate(SEGMENTS, start=1):
        stem = f"{i:02d}_{seg}"
        hit = next(
            (project.audio_dir / f"{stem}{ext}"
             for ext in (".mp3", ".wav", ".m4a")
             if (project.audio_dir / f"{stem}{ext}").exists()),
            None,
        )
        if hit:
            found[seg] = hit
        else:
            missing.append(f"audio/{stem}.mp3")
    if missing:
        raise RuntimeError(
            "Missing CloneVoice audio for:\n    " + "\n    ".join(missing)
            + "\n  Generate them (see voice/GENERATE_VOICES.md) and re-run."
        )
    return found


def _concat_with_gaps(paths: list[Path], out: Path, audio_dir: Path) -> None:
    silence = audio_dir / "_gap.mp3"
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi", "-i",
         "anullsrc=channel_layout=mono:sample_rate=44100",
         "-t", str(GAP_SECONDS), "-q:a", "9", str(silence)],
        check=True, capture_output=True,
    )
    listfile = audio_dir / "_concat.txt"
    lines = []
    for i, p in enumerate(paths):
        lines.append(f"file '{p}'")
        if i < len(paths) - 1:
            lines.append(f"file '{silence}'")
    listfile.write_text("\n".join(lines))

    # Re-encode to a single consistent mp3 (inputs may be mp3/wav/m4a).
    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listfile),
         "-c:a", "libmp3lame", "-q:a", "2", "-ar", "44100", "-ac", "1", str(out)],
        check=True, capture_output=True,
    )


def _duration_seconds(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True,
    )
    try:
        return round(float(out.stdout.strip()), 3)
    except ValueError:
        return 0.0
