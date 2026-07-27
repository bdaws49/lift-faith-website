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
        return cls(
            openai_api_key=os.getenv("OPENAI_API_KEY", ""),
            openai_model=os.getenv("OPENAI_MODEL", "gpt-4o"),
            show_name=os.getenv("SHOW_NAME", "Under the Scope"),
            show_host=os.getenv("SHOW_HOST", "Pastor Billy Daws"),
            support_url=os.getenv("SUPPORT_URL", ""),
            book_title=os.getenv("BOOK_TITLE", ""),
            book_url=os.getenv("BOOK_URL", ""),
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
