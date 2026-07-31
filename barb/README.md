# Barb — Publishing Agent

Barb is your publishing manager. She keeps **one organized dashboard for every
book** so you never have to ask *"Where did I save that?"* again.

For every title she tracks nine things:

1. **Status** — where the book is in the pipeline
2. **Word count** — current vs. target
3. **Cover artwork** — concepts, approval, final files
4. **ISBN** — eBook + print
5. **KDP files** — interior, cover, metadata (upload-ready?)
6. **Marketing** — blurb, keywords, categories, A+ content, pricing
7. **Launch checklist** — every pre / launch / post step
8. **Reader bonuses** — the offer and where it's hosted
9. **Reviews to monitor** — ARC team, review counts, links

## How it's organized

```
barb/
├── README.md                 # this file
├── HOW-TO-USE-BARB.md        # plain-English guide
├── books.json                # ⭐ single source of truth (the visual dashboard reads this)
├── dashboard.md              # human-readable roll-up of all books
├── templates/
│   └── book-dashboard.md     # the format Barb fills for each new book
└── books/
    ├── lift-your-eyes.md     # worked example — one working file per book
    └── lift-your-eyes/       # that book's assets
        ├── cover/
        ├── kdp/
        └── bonuses/
```

The agent definition lives at `.claude/agents/barb.md`.

Barb has two web apps (both in the site style, installable to your home screen):

- **Visual dashboard** — `publishing-dashboard.html`, served at **`/dashboard`**.
  Renders `barb/books.json` as at-a-glance cards.
- **Talk to Barb** — `talk-to-barb.html` (+ `api/barb.js`), served at
  **`/talk-to-barb`** and **`/barb`**. A mic + chat companion that reads your
  dashboard and — once you **unlock editing** with a passcode — actually updates
  it (add a book, change a field), saved to Convex. Setup is in
  `TALK-TO-BARB-SETUP.md`.

### Where the data lives

- **Convex `books` table** — the **live** source of truth for the web apps.
  Barb's chat app writes here (passcode-gated); the dashboard reads it.
- **`barb/books.json`** — seeds Convex and is the offline fallback. It's also the
  structured file the **Barb agent in Claude Code** edits (alongside each book's
  markdown file) for deeper work.
- Convex functions live in `convex/books.ts`; the passcode lives in the Convex
  environment (`BARB_PASSCODE`), never in the code.

Rule of thumb: quick field updates on the go → the phone chat app (Convex);
deep work (marketing copy, launch checklists, filing cover/KDP/bonus files) →
the Barb agent in Claude Code (files). Keep heavy editing in one place to avoid
drift.

## Two files, one truth

- **`books.json`** holds the *structured, at-a-glance* state of every book. It's
  what the visual dashboard reads and what Barb checks first.
- **`books/<slug>.md`** holds the *detail* for one book — full marketing copy, the
  itemized launch checklist, bonus contents, review notes, and file paths.

Barb keeps the two in sync. Change a field and both update together.

## Using Barb

In Claude Code, invoke the agent named **barb** (or type `/barb`) and just talk:

- "Barb, where does *Lift Your Eyes* stand?"
- "Barb, add a new book called *Still Waters*."
- "Barb, the cover's approved — file it and check it off."
- "Barb, what's the next thing to do across all my books?"
- "Barb, where did I save the KDP interior for *Lift Your Eyes*?"

See **HOW-TO-USE-BARB.md** for the full guide.

## Guardrails

- Never fabricates an ISBN, a review, a link, or a file path — if it isn't
  recorded, she says so and offers to record it.
- Never leaves one of the nine fields silently blank — unknowns are marked
  `TODO` / `not started` / `n/a`.
- Verifies changing publishing facts (KDP rules, categories, pricing) rather
  than guessing.
- You decide and write; Barb tracks and files.
