"""Stage 1 — Script.

Run a raw thought through ChatGPT and get back a full episode built in the
show's structure:

    hook → intro → part 1 → ad → part 2 → outro

Plus title, tagline, Scripture, a summary, and three pull-quotes flagged as reel
candidates. Each segment is voiced separately in CloneVoice, so we keep them as
distinct pieces of text all the way through.

Output is written into episode.json under "episode".
"""

from __future__ import annotations

import json

from ..config import SEGMENTS, Config, log
from ..project import Project

SYSTEM_PROMPT = """\
You are the writer for "Under the Scope", a Christian podcast hosted by Pastor
Billy Daws. The show takes ONE detail the biblical text actually says, puts it
under the lens, and shows the listener what they've been reading past. The voice
is warm, plain-spoken, punchy, and pastoral — short lines that land.

Write a complete episode in this exact structure and return STRICT JSON:

{
  "title": "the name of God or the subject, short",
  "tagline": "one vivid sentence",
  "series": "the series this belongs to, or empty string",
  "scripture": { "ref": "Book chap:verse (KJV)", "text": "the verse text" },
  "summary": "2-3 sentences on what the episode looks at",
  "segments": {
    "hook":  "8-15 seconds. A cold open that stops the scroll. One striking line.",
    "intro": "Welcome + what we're putting under the scope today. Name the show.",
    "part1": "The first teaching movement. Set up the detail in the text.",
    "ad":    "A warm 20-30 second ad slot in the host's voice. If no sponsor is given, make it a house spot: invite listeners to follow, share the episode, and leave a review. Do NOT mention any outside brand unless the idea names one.",
    "part2": "The second teaching movement. The payoff — what the detail reveals.",
    "outro": "Land the plane. A closing thought, then invite them to follow the show."
  },
  "reels": [
    { "quote": "a single punchy line taken VERBATIM from a segment",
      "segment": "part1" }
  ]
}

Rules:
- Every segment is what the host SAYS out loud — no stage directions, no
  "[music]", just spoken words. Part 1 and Part 2 can be several paragraphs.
- Exactly 3 reels. Each quote MUST appear verbatim inside the named segment so it
  can be found in the audio and cut into a short.
- "segment" must be one of: hook, intro, part1, ad, part2, outro.
- Return ONLY the JSON object. No markdown, no commentary.
"""


def run(project: Project, cfg: Config) -> None:
    cfg.require("openai_api_key")
    from openai import OpenAI

    client = OpenAI(api_key=cfg.openai_api_key)
    idea = project.data["idea"]
    log("script", f"asking {cfg.openai_model} to write the 6-part episode…")

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

    # Measure each segment (word count + estimated spoken time) so you can see
    # how big ChatGPT made Part 1 and Part 2 before you voice them.
    episode["segment_stats"] = {
        seg: _measure(text) for seg, text in episode["segments"].items()
    }

    project.data["episode"] = episode
    project.mark_done("script")

    stats = episode["segment_stats"]
    total_words = sum(s["words"] for s in stats.values())
    total_min = sum(s["est_seconds"] for s in stats.values()) / 60
    log("script", f"'{episode['title']}' — 6 segments, ~{total_words} words, "
                  f"~{total_min:.1f} min, {len(episode['reels'])} reels drafted.")
    for seg in ("part1", "part2"):
        s = stats[seg]
        log("script", f"  {seg}: {s['words']} words (~{s['est_seconds']/60:.1f} min)")


def _measure(text: str, wpm: int = 150) -> dict:
    """Word count and estimated spoken duration for a segment."""
    words = len(text.split())
    return {"words": words, "est_seconds": round(words / wpm * 60, 1)}


def _validate(ep: dict) -> None:
    for key in ("title", "tagline", "scripture", "summary", "segments", "reels"):
        if key not in ep:
            raise ValueError(f"Script model left out '{key}'. Re-run the script stage.")
    for seg in SEGMENTS:
        if not ep["segments"].get(seg, "").strip():
            raise ValueError(f"Script is missing the '{seg}' segment. Re-run script.")
    for reel in ep["reels"]:
        if reel.get("segment") not in SEGMENTS:
            reel["segment"] = "part1"  # be forgiving; clamp to a valid segment
