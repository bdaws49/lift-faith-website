# Chloe — Research Agent

Chloe is your digital seminary research assistant. Give her a passage, a book, or
a theme, and she gathers everything you'd want on your desk before you study —
then hands it over as one clean, organized brief.

The promise: you say **"Prepare everything on Romans 8,"** and a few minutes later
you have a full research packet in front of you. Chloe turns hours in a library
into minutes.

Chloe is **not tied to any translation or tradition.** Everything specific (your
default Bible translation, doctrinal frame, and how deep to go) lives in
`research-preferences.md`, which you configure. That's what makes Chloe portable —
copy this `chloe/` folder and `.claude/agents/chloe.md` into any project.

## The eleven pieces Chloe prepares

1. **Historical background** — author, date, audience, setting, occasion, purpose
2. **Outline** — the passage's structure and flow
3. **Cross references** — verses that share a real link, each explained
4. **Word studies** — key Greek/Hebrew words, meaning, and significance
5. **Maps & geography** — places named, located, and explained
6. **Archaeology** — findings that illuminate the text
7. **Illustrations** — images, analogies, and stories to teach the truth
8. **Quotes** — from theologians and historical figures, correctly sourced
9. **Application ideas** — how the passage lands in real life today
10. **Difficult passages** — the hard verses and the main interpretive options
11. **Discussion questions** — for small groups or personal study

Ask for all eleven at once, or any single piece on its own.

## Setup (5 minutes)

1. **Fill in `research-preferences.md`.** At minimum: your default Bible
   translation, your doctrinal frame, and how deep you want Chloe to go. This is
   what keeps every brief in your translation and your theological lane.
2. That's it. Chloe reads your preferences and the templates automatically each
   session.

## How to use Chloe

In Claude Code, invoke the agent named **chloe** (or type `/chloe`) and give her a
task, for example:

- "Chloe, prepare everything on Romans 8." *(the full brief — all eleven pieces)*
- "Chloe, give me the historical background and outline for Philippians."
- "Chloe, do a word study on *hesed* in Psalm 136."
- "Chloe, cross-references for Psalm 121."
- "Chloe, what are the difficult passages in 1 Corinthians 11, and the main views?"
- "Chloe, five illustrations and a set of discussion questions for the prodigal son."

Chloe returns each piece in a clearly labeled section you can study or copy. Ask
her to save a brief to `chloe/output/` when you want to keep it.

## Folder layout

```
chloe/
├── README.md                  # this file
├── research-preferences.md    # YOU configure this — translation, doctrine, depth
├── output/                    # saved research briefs (chloe/output/<date>-<passage>/)
└── templates/                 # the format Chloe fills for each piece
    ├── research-brief.md          # the master brief (assembles all eleven)
    ├── historical-background.md
    ├── outline.md
    ├── cross-references.md
    ├── word-study.md
    ├── maps-and-geography.md
    ├── archaeology.md
    ├── illustrations.md
    ├── quotes.md
    ├── application.md
    ├── difficult-passages.md
    └── discussion-questions.md
```

The agent definition itself lives at `.claude/agents/chloe.md`.

## Guardrails baked in

- **Never fabricates** a verse, word, date, archaeological find, map detail, or
  quote — verifies with web search or flags it when unsure.
- **Cites sources** and **marks confidence** (well-established vs. one view vs.
  unverified). No guess laundered into a fact.
- **Always names the translation**; won't pick one silently if you haven't set one.
- **Cross-references share a real link**, explained in one line — no proof-texting.
- **Handles disputed passages fairly**, staying inside the doctrinal frame you set.
- You always study and decide. Chloe gathers and organizes; you preach.

## Make it better over time

Tell Chloe your preferred commentaries, the depth you like, and which pieces to
always include or skip — she'll fold it into `research-preferences.md` so every
future brief fits how you study.
