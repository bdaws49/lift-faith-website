"""Pipeline stages, in run order."""

from . import script, voice, assemble, reels, package

# Ordered list the CLI iterates over.
ALL = ["script", "voice", "assemble", "reels", "package"]

__all__ = ["script", "voice", "assemble", "reels", "package", "ALL"]
