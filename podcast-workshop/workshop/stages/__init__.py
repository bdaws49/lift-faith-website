"""Pipeline stages, in run order."""

from . import (
    script,
    voiceprep,
    assemble,
    transcribe,
    captions,
    reels,
    images,
    video,
    socialcopy,
    package,
)

# Ordered list the CLI iterates over. The manual CloneVoice step happens between
# `voiceprep` and `assemble`.
ALL = [
    "script",
    "voiceprep",
    "assemble",
    "transcribe",
    "captions",
    "reels",
    "images",
    "video",
    "socialcopy",
    "package",
]

# Stages that don't need ffmpeg (pure text / API).
NO_FFMPEG = {"script", "voiceprep", "socialcopy"}

__all__ = ["ALL", "NO_FFMPEG", *ALL]
