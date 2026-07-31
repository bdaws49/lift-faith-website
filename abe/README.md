# Abe — Ministry Content Agent

Abe is a free-standing AI content partner for ministry work. Give it one seed —
a sermon, a passage, a podcast, or a theme — and it produces a full, ready-to-
publish content set in **your** voice.

Abe is **not tied to any ministry, brand, or tradition.** Everything specific
(your voice, default Bible translation, theology guardrails, platforms) lives in
`voice-profile.md`, which you configure. That's what makes Abe portable — you can
copy this `abe/` folder and the `.claude/agents/abe.md` file into any project.

## What Abe does

- Sermon & Bible study outlines
- Podcast scripts (full or beat-sheet)
- YouTube titles, descriptions, chapters, thumbnail concepts
- Facebook, X, and Substack posts
- 3+ Shorts / Reels / TikToks from every podcast
- Scripture cross-references
- Keeps a consistent voice across all of it

## Setup (5 minutes)

1. **Fill in `voice-profile.md`.** This is the single most important step — it's
   what makes drafts sound like you. At minimum: your name, audience, default
   Bible translation, tone, and one or two writing samples.
2. That's it. Abe reads the profile and templates automatically each session.

## How to use Abe

In Claude Code, invoke the agent named **abe** (or type `/abe`) and give it a
task, for example:

- "Abe, turn this sermon transcript into the full content set." *(paste or point
  to the file)*
- "Abe, write a Bible study on Romans 8:28–39."
- "Abe, give me 3 Shorts and 5 YouTube titles from last week's podcast."
- "Abe, suggest cross-references for Psalm 121."
- "Abe, draft Facebook, X, and Substack posts for Sunday's message."

Abe returns each deliverable in a clearly labeled section you can copy straight
into its destination. Ask it to save output to files (e.g. `abe/output/`) when
you want to keep it.

## Folder layout

```
abe/
├── README.md              # this file
├── voice-profile.md       # YOU configure this — Abe's most important reference
├── content-calendar.md    # optional weekly theme/cadence Abe aligns to
└── templates/             # the format Abe fills for each deliverable
    ├── sermon-outline.md
    ├── bible-study.md
    ├── podcast-script.md
    ├── youtube-metadata.md
    ├── social-posts.md
    ├── shorts.md
    └── cross-references.md
```

The agent definition itself lives at `.claude/agents/abe.md`.

## Guardrails baked in

- Never fabricates verses or references; verifies or flags when unsure.
- Always names the translation; won't pick one silently if you haven't set one.
- Stays inside the theology you state; flags disputed passages instead of taking
  a side.
- You always review and approve. Abe drafts; you shape and send.

## Make it better over time

When you edit Abe's drafts, tell it what you changed — it will fold your
preferences back into `voice-profile.md`. The voice sharpens every week.
