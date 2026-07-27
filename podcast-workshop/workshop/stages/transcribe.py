"""Stage 4 — Transcribe ("scanning" the audio).

Run each segment's audio through Whisper to get word-level timestamps, then
offset them by the segment's start time so every word has an absolute position
in the full episode. This is what lets the reels stage cut a quote out precisely,
and what the captions stage turns into an SRT.

Transcribing per-segment (not the whole episode at once) keeps every file well
under the API size limit.

Writes: episode.json -> transcript = { words:[...], cues:[...] }
"""

from __future__ import annotations

from ..config import SEGMENTS, Config, log
from ..project import Project


def run(project: Project, cfg: Config) -> None:
    cfg.require("openai_api_key")
    from openai import OpenAI

    episode = project.data.get("episode")
    timeline = episode.get("timeline") if episode else None
    if not timeline:
        raise RuntimeError("Assemble the episode first — no timeline found.")

    client = OpenAI(api_key=cfg.openai_api_key)
    words: list[dict] = []
    cues: list[dict] = []

    for seg in SEGMENTS:
        info = timeline[seg]
        offset = info["start"]
        path = project.audio_dir / info["file"]
        log("transcribe", f"scanning {seg} ({info['duration']:.0f}s)…")

        with open(path, "rb") as fh:
            result = client.audio.transcriptions.create(
                model="whisper-1",
                file=fh,
                response_format="verbose_json",
                timestamp_granularities=["word", "segment"],
            )

        for w in getattr(result, "words", None) or []:
            words.append({
                "w": w.word if hasattr(w, "word") else w["word"],
                "start": round(_start(w) + offset, 3),
                "end": round(_end(w) + offset, 3),
            })
        for s in getattr(result, "segments", None) or []:
            cues.append({
                "start": round(_start(s) + offset, 3),
                "end": round(_end(s) + offset, 3),
                "text": (s.text if hasattr(s, "text") else s["text"]).strip(),
            })

    episode["transcript"] = {"words": words, "cues": cues}
    project.mark_done("transcribe")
    log("transcribe", f"{len(words)} words, {len(cues)} caption cues located.")


def _start(obj):
    return float(obj.start if hasattr(obj, "start") else obj["start"])


def _end(obj):
    return float(obj.end if hasattr(obj, "end") else obj["end"])
