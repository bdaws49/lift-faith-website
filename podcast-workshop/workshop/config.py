"""Configuration and small shared helpers.

Everything the pipeline needs from the environment is read here, so the stages
stay clean and there is one obvious place to look when a key is missing.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # dotenv is optional; real env vars still work without it.
    pass


# Fallback background color when no cover/reel image is generated (deep burgundy).
BG_COLOR_FALLBACK = "0x5C0F28"

# Loudness target for leveling the voices. -16 LUFS is the podcast standard for
# mono; true-peak capped at -1.5 dBTP to avoid clipping.
LOUDNESS_LUFS = -16.0
LOUDNESS_TRUE_PEAK = -1.5
LOUDNESS_RANGE = 11.0

# The episode's script structure, in play order. Each is generated separately
# and voiced separately in CloneVoice.
SEGMENTS = ["hook", "intro", "part1", "ad", "part2", "outro"]

# Friendly labels for the segments (used in prompts and instruction sheets).
SEGMENT_LABELS = {
    "hook": "Hook",
    "intro": "Intro",
    "part1": "Part 1",
    "ad": "Ad",
    "part2": "Part 2",
    "outro": "Outro",
}


@dataclass
class Config:
    openai_api_key: str
    openai_model: str
    show_name: str
    show_host: str

    # Distribution / appeals (used in the reel first-comment).
    support_url: str = ""
    book_title: str = ""
    book_url: str = ""

    @classmethod
    def load(cls) -> "Config":
        # Non-secret show settings live in a committed show.json so they persist
        # across machines/sessions. Environment variables override them, and the
        # secret (OPENAI_API_KEY) only ever comes from the environment.
        show = _load_show_json()

        def pick(env_key: str, json_key: str, default: str = "") -> str:
            return os.getenv(env_key) or show.get(json_key, default)

        return cls(
            openai_api_key=os.getenv("OPENAI_API_KEY", ""),
            openai_model=os.getenv("OPENAI_MODEL", "gpt-4o"),
            show_name=pick("SHOW_NAME", "show_name", "Under the Scope"),
            show_host=pick("SHOW_HOST", "show_host", "Pastor Billy Daws"),
            support_url=pick("SUPPORT_URL", "support_url"),
            book_title=pick("BOOK_TITLE", "book_title"),
            book_url=pick("BOOK_URL", "book_url"),
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


def _load_show_json() -> dict:
    """Read the committed show.json next to the workshop, if present."""
    path = Path(__file__).resolve().parent.parent / "show.json"
    if path.exists():
        try:
            return json.loads(path.read_text())
        except (ValueError, OSError):
            return {}
    return {}


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
