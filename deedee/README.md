# DeeDee — Ministry Operations Agent

DeeDee runs the day-to-day of the ministry from **one calendar-and-dashboard** so
Billy always has a clear picture of **what's been completed and what comes next.**

She keeps eight areas in one place:

1. **Podcast schedule** — every episode and where it is in the pipeline
2. **Recording days** — when, what's being recorded, and whether prep is done
3. **Publishing calendar** — every dated output across channels
4. **Speaking invitations** — invites, confirmations, travel, logistics
5. **Prayer requests** — received, praying, follow-up owed, answered (handled with care)
6. **Donations** — gifts, thank-yous owed, running total
7. **Newsletter schedule** — issues, send dates, themes, status
8. **Content pipeline** — everything in flight and its stage

## How it's organized

```
deedee/
├── README.md                 # this file
├── HOW-TO-USE-DEEDEE.md      # plain-English guide
├── ops.json                  # ⭐ single source of truth (the visual dashboard reads this)
├── dashboard.md              # human-readable roll-up of everything
└── templates/                # the format DeeDee fills for each new item
    ├── podcast-episode.md
    ├── recording-day.md
    ├── speaking-invitation.md
    ├── prayer-request.md
    ├── donation.md
    ├── newsletter-issue.md
    └── pipeline-item.md
```

The agent definition lives at `.claude/agents/deedee.md`.

DeeDee has two web apps (both in the site style, installable to your home screen):

- **Operations dashboard** — `operations-dashboard.html`, served at
  **`/operations`**. Renders `deedee/ops.json` as at-a-glance cards with a
  "what's next" panel.
- **Talk to DeeDee** — `talk-to-deedee.html` (+ `api/deedee.js`), served at
  **`/talk-to-deedee`** and **`/deedee`**. A mic + chat companion (ElevenLabs
  **Emily** voice) that reads the board and — once you **unlock editing** with a
  passcode — actually updates it (log a gift, add a recording day, set a cadence),
  saved to Convex. Setup is in `TALK-TO-DEEDEE-SETUP.md`.

### Where the data lives

- **Convex `opsBoard` table** — the **live** source of truth for the web apps.
  DeeDee's chat writes here (passcode-gated); `/operations` reads it.
- **`deedee/ops.json`** — seeds Convex and is the offline fallback. It's also the
  structured file the **DeeDee agent in Claude Code** edits (alongside
  `dashboard.md`) for deeper work.
- Convex functions live in `convex/ops.ts`; the passcode lives in the Convex
  environment (`DEEDEE_PASSCODE`), never in the code.

Rule of thumb: quick logging on the go → the phone chat (Convex); deep work →
the DeeDee agent in Claude Code (files). Keep heavy editing in one place to avoid
drift.

## Two files, one truth

- **`ops.json`** holds the *structured, at-a-glance* state of the whole
  operation. It's what the visual dashboard reads and what DeeDee checks first.
- **`dashboard.md`** is the *readable roll-up* — the same information laid out for
  a human to scan. DeeDee regenerates it from `ops.json` whenever things change.

## Using DeeDee

In Claude Code, invoke the agent named **deedee** (or type `/deedee`) and just talk:

- "DeeDee, what's next this week?"
- "DeeDee, we're recording the Habakkuk episode next Tuesday at the studio."
- "DeeDee, log a $50 gift from the Andersons — thank-you owed."
- "DeeDee, add a prayer request: the Miller family, keep it anonymous."
- "DeeDee, I got a speaking invite for the men's retreat in October."
- "DeeDee, newsletter #1 goes out the first Monday of September — theme is Habakkuk."
- "DeeDee, what am I forgetting?"

See **HOW-TO-USE-DEEDEE.md** for the full guide.

## How DeeDee works with Abe, Barb, and Chloe

DeeDee is the **operations** layer over the other agents' work:

- **Abe** creates the content (scripts, posts, shorts). DeeDee schedules and
  tracks it through the pipeline and onto the calendar.
- **Barb** manages the books in depth. DeeDee keeps each book on the operations
  radar (a pipeline line item) without duplicating Barb's detail.
- **Chloe** researches the passages. DeeDee tracks the episodes that research
  feeds.

DeeDee never duplicates their detailed records — she points to them (e.g. the
book lives in `barb/books.json`) and keeps the ministry-wide "what's next" honest.

## Guardrails

- Never fabricates a date, name, amount, contact, or status — unknowns are `TODO`.
- Handles **prayer requests and donations with care**: honors "anonymous", keeps
  private notes private, treats thank-yous and follow-ups as promises to keep.
  Viewing the board can be locked behind a passcode (`DEEDEE_READ_PASSCODE`), and
  sensitive detail belongs in the live Convex board, not the public `ops.json`
  scaffold — see `TALK-TO-DEEDEE-SETUP.md`.
- Never leaves one of the eight areas silently blank.
- Reasons from today's date and flags anything overdue.
- You preach, record, write, and decide; DeeDee schedules, tracks, and reminds.
