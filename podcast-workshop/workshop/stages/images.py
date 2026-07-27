"""Stage 7 — Images.

Generate artwork for the episode: a cover (used as the YouTube background /
thumbnail) and one background per reel. Uses OpenAI image generation with the
key you already have.

Image generation is best-effort: if it fails or isn't enabled on your account,
the pipeline keeps going (reels fall back to a solid background). Either way we
always write images/prompts.txt so you can regenerate or fine-tune by hand.

Writes: images/cover.png, images/reel_1.png … reel_3.png, images/prompts.txt
"""

from __future__ import annotations

import base64

from ..config import Config, log
from ..project import Project

STYLE = ("Reverent, cinematic, painterly biblical scene. Warm burgundy and gold "
         "light, deep shadows, no text, no words, no lettering, no watermark. "
         "Atmospheric and quiet.")


def run(project: Project, cfg: Config) -> None:
    episode = project.data.get("episode")
    if not episode:
        raise RuntimeError("No episode — run the script stage first.")

    images_dir = project.root / "images"
    images_dir.mkdir(exist_ok=True)

    jobs = _build_prompts(episode)
    (images_dir / "prompts.txt").write_text(
        "\n\n".join(f"{name} ({size}):\n{prompt}" for name, size, prompt in jobs)
    )

    if not cfg.openai_api_key:
        log("images", "no OPENAI_API_KEY — wrote prompts.txt only, skipping generation.")
        project.mark_done("images")
        return

    from openai import OpenAI
    client = OpenAI(api_key=cfg.openai_api_key)
    made = 0
    for name, size, prompt in jobs:
        try:
            resp = client.images.generate(
                model="gpt-image-1", prompt=prompt, size=size, n=1,
            )
            data = base64.b64decode(resp.data[0].b64_json)
            (images_dir / f"{name}.png").write_bytes(data)
            made += 1
            log("images", f"generated {name}.png")
        except Exception as exc:  # non-fatal by design
            log("images", f"couldn't generate {name} ({exc}); prompt saved for manual use.")

    project.mark_done("images")
    log("images", f"{made}/{len(jobs)} images generated; prompts in images/prompts.txt")


def _build_prompts(episode: dict):
    title = episode["title"]
    tagline = episode.get("tagline", "")
    scene = f"Theme: {title}. {tagline}. Rooted in {episode['scripture'].get('ref','')}."
    jobs = [("cover", "1536x1024", f"{scene} {STYLE} Wide establishing composition.")]
    for n, reel in enumerate(episode.get("reels", []), start=1):
        jobs.append((
            f"reel_{n}", "1024x1536",
            f"{scene} Mood for the line: \"{reel['quote']}\". {STYLE} "
            f"Vertical composition with empty space in the center for a caption.",
        ))
    return jobs
