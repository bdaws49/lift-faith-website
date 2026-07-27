"""Stage 2 — Voice.

Send each narration block to your cloned voice and save one mp3 per block. We
also measure each clip's duration, which is what lets stage 3 know the exact
start time of every block (and therefore every reel quote) in the final episode.

Default provider: ElevenLabs. Using a different service? This is the ONLY file
you need to change — keep `synthesize_block(text, path, cfg)` writing an audio
file and the rest of the pipeline doesn't care who made it.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

import requests

from ..config import Config, log
from ..project import Project

ELEVEN_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"


def run(project: Project, cfg: Config) -> None:
    cfg.require("elevenlabs_api_key", "elevenlabs_voice_id")
    episode = project.data.get("episode")
    if not episode:
        raise RuntimeError("No episode script found — run the script stage first.")

    blocks = episode["blocks"]
    log("voice", f"synthesizing {len(blocks)} blocks with your cloned voice…")

    for block in blocks:
        idx = block["index"]
        path = project.audio_dir / f"block_{idx:02d}.mp3"
        if path.exists() and block.get("audio"):
            log("voice", f"block {idx:02d} already done, skipping.")
        else:
            synthesize_block(block["text"], path, cfg)
            log("voice", f"block {idx:02d} → {path.name}")
        block["audio"] = path.name
        block["duration"] = _duration_seconds(path)
        project.save()  # persist after each block so a crash never wastes work

    project.mark_done("voice")
    total = sum(b["duration"] for b in blocks)
    log("voice", f"done — {total/60:.1f} min of audio across {len(blocks)} files.")


def synthesize_block(text: str, path: Path, cfg: Config) -> None:
    """Turn one block of text into an audio file. Swap this for another
    provider by keeping the same signature."""
    resp = requests.post(
        ELEVEN_URL.format(voice_id=cfg.elevenlabs_voice_id),
        headers={
            "xi-api-key": cfg.elevenlabs_api_key,
            "accept": "audio/mpeg",
            "content-type": "application/json",
        },
        json={
            "text": text,
            "model_id": cfg.elevenlabs_model,
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
        },
        timeout=120,
    )
    if resp.status_code != 200:
        raise RuntimeError(
            f"Voice API returned {resp.status_code}: {resp.text[:300]}"
        )
    path.write_bytes(resp.content)


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
