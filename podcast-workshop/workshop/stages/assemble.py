"""Stage 3 — Assemble.

Stitch the per-block audio files into one full episode, in order. As we lay the
blocks end to end we record each block's start time, which gives us an exact
timeline — so we know precisely where every reel quote lives in the episode.

Writes: audio/full_episode.mp3, and a "timeline" onto each block in episode.json.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

from ..config import Config, log
from ..project import Project

GAP_SECONDS = 0.6  # a short breath between blocks


def run(project: Project, cfg: Config) -> None:
    episode = project.data.get("episode")
    if not episode or not episode.get("blocks"):
        raise RuntimeError("Nothing to assemble — run script and voice first.")

    blocks = episode["blocks"]
    for b in blocks:
        if not (project.audio_dir / f"block_{b['index']:02d}.mp3").exists():
            raise RuntimeError(
                f"Missing audio for block {b['index']} — run the voice stage."
            )

    # Compute the start time of each block (accounting for the gap between them).
    cursor = 0.0
    for b in blocks:
        b["start"] = round(cursor, 3)
        cursor += b.get("duration", 0.0) + GAP_SECONDS
    episode["episode_seconds"] = round(cursor, 3)

    out = project.audio_dir / "full_episode.mp3"
    _concat_with_gaps(project.audio_dir, blocks, out)

    project.mark_done("assemble")
    log("assemble", f"full episode → {out.name} "
                    f"({episode['episode_seconds']/60:.1f} min)")


def _concat_with_gaps(audio_dir: Path, blocks: list[dict], out: Path) -> None:
    """Build a concat list with a short silence between blocks, then encode.

    We generate one silence file once and reference it between blocks. Using the
    concat demuxer keeps this fast and lossless-ish for mp3 inputs.
    """
    silence = audio_dir / "_gap.mp3"
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi", "-i",
         "anullsrc=channel_layout=mono:sample_rate=44100",
         "-t", str(GAP_SECONDS), "-q:a", "9", str(silence)],
        check=True, capture_output=True,
    )

    listfile = audio_dir / "_concat.txt"
    lines = []
    for i, b in enumerate(blocks):
        block_path = audio_dir / f"block_{b['index']:02d}.mp3"
        lines.append(f"file '{block_path}'")
        if i < len(blocks) - 1:
            lines.append(f"file '{silence}'")
    listfile.write_text("\n".join(lines))

    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listfile),
         "-c:a", "libmp3lame", "-q:a", "2", str(out)],
        check=True, capture_output=True,
    )
