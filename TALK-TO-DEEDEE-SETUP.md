# Setting up "Talk to DeeDee" (your operations manager)

You have a real, clickable page where you talk to DeeDee — out loud or by typing —
and she answers from your live ministry board: the podcast, recording days, the
publishing calendar, speaking invitations, prayer requests, donations, the
newsletter, and everything in the content pipeline. Her headline job is telling
you **what's next** and **what you're forgetting**.

She reads the same board the DeeDee agent keeps in Claude Code, so the phone and
the desktop stay in agreement.

---

## The pieces

- **`talk-to-deedee.html`** — the chat page (mic + type). Served at
  `/talk-to-deedee` and `/deedee`. Speaks in the ElevenLabs **Emily** voice.
- **`operations-dashboard.html`** — the visual board at `/operations`. Reads the
  same data and shows a "What's next" panel plus every area at a glance.
- **`api/deedee.js`** — the server "brain." Adds DeeDee's operations persona and
  guardrails, folds in a snapshot of the board + today's date, and calls Claude.
- **`deedee/ops.json`** — the single source of truth (mirrored to
  `deedee/dashboard.md`). The DeeDee agent in Claude Code edits these.

Everything degrades gracefully: if a key isn't set, the pages still load and fall
back sensibly (browser voice, static board). Nothing breaks in the meantime.

---

## Level 1 — Just talk (1 step, ~2 min)

If Abe/Barb/Chloe already work, this already works too — it's the same key.

1. In **Vercel → your project → Settings → Environment Variables**, add
   `ANTHROPIC_API_KEY = sk-ant-...` (from https://console.anthropic.com). Redeploy.

Open `https://yourdomain.com/deedee` and talk. Ask *"What's next this week?"*,
*"What am I forgetting?"*, *"Any thank-yous owed?"*, *"When's my next recording
day?"*

---

## Level 2 — DeeDee's real voice (Emily, optional)

DeeDee speaks in the ElevenLabs **Emily** voice when text-to-speech is turned on.
This is shared with the other agents through `api/tts.js`.

1. In **Vercel → Environment Variables**, add
   `ELEVENLABS_API_KEY = <your key>` (from https://elevenlabs.io). Redeploy.
2. (Optional) Override the voice with `DEEDEE_VOICE_ID = <voice id>`. The default
   is Emily (`LcfcDJNUP1GQjkzn1xUU`). Any voice id from your ElevenLabs library
   works.

Without an ElevenLabs key, DeeDee still speaks — the page falls back to the
browser's built-in voice automatically.

---

## Keeping the board up to date (this is where the value is)

DeeDee is only as good as her board. The **DeeDee agent in Claude Code** is where
you keep it current — it edits `deedee/ops.json` and refreshes
`deedee/dashboard.md`:

- Open this project in **Claude Code**, type `/deedee` (or just say her name), and
  talk: *"We're recording the Habakkuk episode next Tuesday at the studio,"*
  *"Log a $50 gift from the Andersons — thank-you owed,"* *"Add a speaking invite
  for the men's retreat in October,"* *"Newsletter #1 goes out the first Monday of
  September."* She updates the board and tells you what changed.
- The phone page (`/deedee`) and the board (`/operations`) then read those updates.

> **Why read-only on the phone?** To keep the pocket experience simple and safe,
> the phone chat reads and advises rather than editing the board directly. If you
> later want DeeDee to *edit from the phone* (the way Barb does, behind a passcode
> in Convex), that's a natural next step — say the word and it can be added with an
> `ops` table + `list/patch` functions and a `DEEDEE_PASSCODE`.

---

## Optional settings

- `DEEDEE_MODEL` (Vercel) — the model DeeDee uses. Default `claude-sonnet-5`. Use
  `claude-opus-5` for more depth at higher cost.
- `DEEDEE_VOICE_ID` (Vercel) — her ElevenLabs voice. Default Emily.

## Privacy

The page is `noindex`, but anyone with the link can open it and read the board —
which includes **prayer requests and donations**. Keep the link private. DeeDee
honors "anonymous" and keeps private notes private, but the raw `ops.json` is
readable by anyone who can reach `/operations`. Want reading locked to just you?
Say so and a read gate can be added.
