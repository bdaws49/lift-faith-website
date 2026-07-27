#!/usr/bin/env python3
"""Under the Scope — podcast workshop.

Feed it a thought, get an upload-ready episode plus three reels.

    python workshop.py "your episode idea here"

Run one stage against an existing project:

    python workshop.py --project output/jehovah-shalom --only reels

Stages, in order: script → voice → assemble → reels → package
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from workshop import stages
from workshop.config import Config, log, require_ffmpeg, slugify
from workshop.project import Project

BASE = Path(__file__).resolve().parent / "output"


def main() -> None:
    parser = argparse.ArgumentParser(description="Under the Scope podcast workshop")
    parser.add_argument("idea", nargs="?", help="the thought to build an episode from")
    parser.add_argument("--project", help="path to an existing output/<slug> folder")
    parser.add_argument("--only", choices=stages.ALL, help="run just one stage")
    parser.add_argument("--from", dest="from_stage", choices=stages.ALL,
                        help="start from this stage and run to the end")
    args = parser.parse_args()

    cfg = Config.load()

    # ffmpeg is needed by everything except the script stage.
    if args.only != "script":
        require_ffmpeg()

    project = _resolve_project(args)
    to_run = _which_stages(args)

    log("workshop", f"episode '{project.data.get('slug')}' — running: {', '.join(to_run)}")
    for name in to_run:
        getattr(stages, name).run(project, cfg)

    if "package" in to_run:
        print(f"\n  Done. Upload bundle: {project.upload_dir}\n")


def _resolve_project(args) -> Project:
    if args.project:
        return Project.open(Path(args.project))
    if not args.idea:
        sys.exit("Give me an idea:  python workshop.py \"your episode idea\"")
    slug = slugify(args.idea.split("—")[0].split("-")[0])
    return Project.create(BASE, slug, args.idea)


def _which_stages(args) -> list[str]:
    if args.only:
        return [args.only]
    if args.from_stage:
        return stages.ALL[stages.ALL.index(args.from_stage):]
    return stages.ALL


if __name__ == "__main__":
    main()
