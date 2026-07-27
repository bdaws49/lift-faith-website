"""The Project: a folder on disk that holds one episode's whole life.

    output/<slug>/
      episode.json     <- the single source of truth (script, timings, reels)
      audio/           <- one file per narration block, plus the full episode
      reels/           <- the 3 short videos
      upload/          <- final, ready-to-post bundle

Every stage loads the Project, does its work, writes files, updates
episode.json, and saves. Because it is all on disk, you can stop after any
stage and pick up later, or re-run a single stage without redoing the rest.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class Project:
    root: Path
    data: dict[str, Any] = field(default_factory=dict)

    # --- lifecycle -------------------------------------------------------
    @classmethod
    def create(cls, base: Path, slug: str, idea: str) -> "Project":
        root = base / slug
        root.mkdir(parents=True, exist_ok=True)
        proj = cls(root=root, data={"idea": idea, "slug": slug, "stages_done": []})
        proj.save()
        return proj

    @classmethod
    def open(cls, root: Path) -> "Project":
        root = Path(root)
        state = root / "episode.json"
        if not state.exists():
            raise FileNotFoundError(
                f"No episode.json in {root} — run the script stage first."
            )
        return cls(root=root, data=json.loads(state.read_text()))

    def save(self) -> None:
        (self.root / "episode.json").write_text(
            json.dumps(self.data, indent=2, ensure_ascii=False)
        )

    # --- folders ---------------------------------------------------------
    @property
    def audio_dir(self) -> Path:
        return self._dir("audio")

    @property
    def reels_dir(self) -> Path:
        return self._dir("reels")

    @property
    def upload_dir(self) -> Path:
        return self._dir("upload")

    def _dir(self, name: str) -> Path:
        d = self.root / name
        d.mkdir(exist_ok=True)
        return d

    # --- stage bookkeeping ----------------------------------------------
    def mark_done(self, stage: str) -> None:
        done = self.data.setdefault("stages_done", [])
        if stage not in done:
            done.append(stage)
        self.save()

    def is_done(self, stage: str) -> bool:
        return stage in self.data.get("stages_done", [])
