"""Stage 8 — Video (for YouTube).

Build a single full-length video: the cover image held for the whole episode as
the background, the episode audio, and the captions burned in from the SRT. This
is the file you upload to YouTube.

Writes: video/youtube_episode.mp4
"""

from __future__ import annotations

import subprocess
from pathlib import Path

from ..config import BG_COLOR_FALLBACK, Config, log
from ..project import Project


def run(project: Project, cfg: Config) -> None:
    episode = project.data.get("episode")
    full = project.audio_dir / "full_episode.mp3"
    if not episode or not full.exists():
        raise RuntimeError("Assemble the episode first — no full_episode.mp3.")

    video_dir = project.root / "video"
    video_dir.mkdir(exist_ok=True)
    out = video_dir / "youtube_episode.mp4"

    cover = project.root / "images" / "cover.png"
    srt = project.root / "captions" / "episode.srt"
    dur = episode.get("episode_seconds", 0.0)

    if cover.exists():
        inputs = ["-loop", "1", "-i", str(cover)]
        vf = "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080"
    else:
        inputs = ["-f", "lavfi", "-i", f"color=c={BG_COLOR_FALLBACK}:s=1920x1080"]
        vf = "null"

    if srt.exists():
        # subtitles filter needs the path escaped for the filtergraph.
        esc = str(srt).replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
        vf += (f",subtitles='{esc}':force_style="
               "'Fontsize=22,PrimaryColour=&HFFFFFF&,Outline=2,Shadow=1'")

    subprocess.run(
        ["ffmpeg", "-y", *inputs, "-i", str(full),
         "-vf", vf, "-map", "0:v", "-map", "1:a",
         "-c:v", "libx264", "-tune", "stillimage", "-pix_fmt", "yuv420p", "-r", "2",
         "-c:a", "aac", "-b:a", "192k", "-shortest", str(out)],
        check=True, capture_output=True,
    )
    project.mark_done("video")
    log("video", f"YouTube video → {out.name} ({dur/60:.1f} min)")
