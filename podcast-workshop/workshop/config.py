"""Configuration and small shared helpers.

Everything the pipeline needs from the environment is read here, so the stages
stay clean and there is one obvious place to look when a key is missing.
"""

from __future__ import annotations

import os
import re
import shutil
import sys
from dataclasses import dataclass

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # dotenv is optional; real env vars still work without it.
    pass


@dataclass
class Config:
    openai_api_key: str
    openai_model: str
    elevenlabs_api_key: str
    elevenlabs_voice_id: str
    elevenlabs_model: str
    show_name: str
    show_host: str

    @classmethod
    def load(cls) -> "Config":
        return cls(
            openai_api_key=os.getenv("OPENAI_API_KEY", ""),
            openai_model=os.getenv("OPENAI_MODEL", "gpt-4o"),
            elevenlabs_api_key=os.getenv("ELEVENLABS_API_KEY", ""),
            elevenlabs_voice_id=os.getenv("ELEVENLABS_VOICE_ID", ""),
            elevenlabs_model=os.getenv("ELEVENLABS_MODEL", "eleven_multilingual_v2"),
            show_name=os.getenv("SHOW_NAME", "Under the Scope"),
            show_host=os.getenv("SHOW_HOST", "Pastor Billy Daws"),
        )

    def require(self, *keys: str) -> None:
        """Fail early with a clear message if a needed key is blank."""
        missing = [k for k in keys if not getattr(self, k)]
        if missing:
            names = ", ".join(m.upper() for m in missing)
            sys.exit(
                f"\n  Missing required setting(s): {names}\n"
                f"  Add them to podcast-workshop/.env (see .env.example).\n"
            )


def slugify(text: str) -> str:
    """Turn an episode title into a safe folder name."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-")[:60] or "episode"


def require_ffmpeg() -> None:
    """The audio/video stages shell out to ffmpeg; make sure it exists."""
    for tool in ("ffmpeg", "ffprobe"):
        if shutil.which(tool) is None:
            sys.exit(
                f"\n  '{tool}' not found on your PATH.\n"
                f"  Install ffmpeg (macOS: 'brew install ffmpeg') and try again.\n"
            )


def log(stage: str, message: str) -> None:
    print(f"  [{stage}] {message}", flush=True)
