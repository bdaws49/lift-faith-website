"""Stage 5 — Captions.

Turn the transcript's cues into a standard .srt subtitle file for the YouTube
upload. (The reels burn their own quote captions in the reels stage.)

Writes: captions/episode.srt
"""

from __future__ import annotations

from ..config import Config, log
from ..project import Project


def run(project: Project, cfg: Config) -> None:
    episode = project.data.get("episode")
    transcript = episode.get("transcript") if episode else None
    if not transcript or not transcript.get("cues"):
        raise RuntimeError("No transcript — run the transcribe stage first.")

    cap_dir = project.root / "captions"
    cap_dir.mkdir(exist_ok=True)
    srt = _to_srt(transcript["cues"])
    (cap_dir / "episode.srt").write_text(srt)

    project.mark_done("captions")
    log("captions", f"wrote captions/episode.srt ({len(transcript['cues'])} cues).")


def _to_srt(cues: list[dict]) -> str:
    lines = []
    for i, cue in enumerate(cues, start=1):
        lines.append(str(i))
        lines.append(f"{_ts(cue['start'])} --> {_ts(cue['end'])}")
        lines.append(cue["text"])
        lines.append("")
    return "\n".join(lines)


def _ts(seconds: float) -> str:
    ms = int(round(seconds * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
