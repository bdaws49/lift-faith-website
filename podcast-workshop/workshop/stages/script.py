"""Stage 1 — Script.

Take a raw thought and run it through ChatGPT to produce a structured episode:
title, tagline, Scripture, a summary, the narration broken into blocks (each
block becomes one voice-over file), and three pull-quotes flagged as reel
candidates.

The output is written into episode.json under "episode".
"""

from __future__ import annotations

import json

from ..config import Config, log
from ..project import Project

SYSTEM_PROMPT = """\
You are the writer for "Under the Scope", a Christian podcast hosted by Pastor
Billy Daws. The show takes ONE detail the biblical text actually says, puts it
under the lens, and shows the listener what they've been reading past. The voice
is warm, plain-spoken, punchy, and pastoral — short lines that land.

You will be given a raw idea. Return a complete short episode as STRICT JSON with
this exact shape:

{
  "title": "the name of God or the subject, short",
  "tagline": "one vivid sentence",
  "series": "the series this belongs to, or empty string",
  "scripture": { "ref": "Book chap:verse (KJV)", "text": "the verse text" },
  "summary": "2-3 sentences on what the episode looks at",
  "blocks": [
    { "text": "a narration paragraph, spoken aloud, 2-5 sentences" }
  ],
  "reels": [
    { "quote": "a single punchy line taken from the script, reel-worthy",
      "block_index": 0 }
  ]
}

Rules:
- 8 to 14 narration blocks. Each block is what the host SAYS — no stage
  directions, no "[music]", just spoken words.
- Exactly 3 reels. Each quote MUST appear (verbatim or near-verbatim) inside the
  block named by its block_index, so it can be cut from the audio.
- Return ONLY the JSON object. No markdown, no commentary.
"""


def run(project: Project, cfg: Config) -> None:
    cfg.require("openai_api_key")
    from openai import OpenAI

    client = OpenAI(api_key=cfg.openai_api_key)
    idea = project.data["idea"]
    log("script", f"asking {cfg.openai_model} to write the episode…")

    resp = client.chat.completions.create(
        model=cfg.openai_model,
        response_format={"type": "json_object"},
        temperature=0.8,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"The idea for this episode:\n\n{idea}"},
        ],
    )
    episode = json.loads(resp.choices[0].message.content)
    _validate(episode)

    # Number the blocks so later stages can refer to them stably.
    for i, block in enumerate(episode["blocks"]):
        block["index"] = i

    project.data["episode"] = episode
    project.mark_done("script")
    log("script", f"'{episode['title']}' — {len(episode['blocks'])} blocks, "
                   f"{len(episode['reels'])} reels drafted.")


def _validate(ep: dict) -> None:
    for key in ("title", "tagline", "scripture", "summary", "blocks", "reels"):
        if key not in ep:
            raise ValueError(f"Script model left out '{key}'. Re-run the script stage.")
    if not ep["blocks"]:
        raise ValueError("Script came back with no narration blocks.")
    n = len(ep["blocks"])
    for reel in ep["reels"]:
        bi = reel.get("block_index", 0)
        if not (0 <= bi < n):
            reel["block_index"] = 0  # be forgiving; clamp to a valid block
