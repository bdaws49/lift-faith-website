# Setting up "Talk to DeeDee" (read **and** edit)

You have a real, clickable page where you talk to DeeDee — out loud or by typing —
and she answers from your live ministry board: the podcast, recording days, the
publishing calendar, speaking invitations, prayer requests, donations, the
newsletter, and everything in the content pipeline. Her headline job is telling
you **what's next** and **what you're forgetting** — and once you **unlock
editing** with a passcode, she can **update the board for you** from the chat.

There are two levels:

- **Just talk (read + advise)** — needs one key (the same one Abe uses). DeeDee
  reads the board and tells you what she'd change. Works immediately.
- **Full monte (DeeDee edits)** — DeeDee actually changes the board from the
  chat, saved to your Convex database, locked behind a passcode. A few more
  one-time steps below.

Everything degrades gracefully: before the edit setup is done, the pages fall
back to the static `deedee/ops.json` and DeeDee stays in read/advise mode.
Nothing breaks in the meantime.

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

## DeeDee's real voice (Emily, optional)

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

## Level 2 — Let DeeDee edit (the full monte)

### A. Deploy the operations functions to Convex
Your site already uses Convex (`convex/` folder). From the project, run:

```
npx convex deploy
```

This publishes the new `opsBoard` table and the `ops:getBoard / addItem /
patchItem / setField / seedBoard` functions.

### B. Import your current board into Convex (one time)
Seed the board from `deedee/ops.json` (paste its full contents as `data`):

```
npx convex run ops:seedBoard '{"data": { ...paste the contents of deedee/ops.json here... }}'
```

`seedBoard` is non-destructive — if a board already exists it does nothing, so
it's safe to run again.

### C. Set the editing passcode (this is the lock)
Pick any passcode and store it **in Convex** (not in the code):

```
npx convex env set DEEDEE_PASSCODE "choose-something-only-you-know"
```

If this isn't set, editing stays disabled (fail closed) — DeeDee can read but
never change anything.

### D. Tell Vercel where Convex is (optional)
`api/deedee.js` defaults to your existing deployment
(`https://tame-fennec-574.convex.cloud`). If yours differs, add
`CONVEX_URL = https://<your-deployment>.convex.cloud` in Vercel and redeploy.

### Using it
- On `/deedee`, tap **Unlock editing** and enter your passcode (stored on that
  device only).
- Then just tell her: *"We're recording the Habakkuk episode next Tuesday at the
  studio,"* *"Log a $50 gift from the Andersons — thank-you owed,"* *"Mark that
  thank-you sent,"* *"Add a speaking invite for the men's retreat in October,"*
  *"Newsletter #1 goes out the first Monday of September, theme Habakkuk."* She
  saves it and says what she changed; the board at `/operations` reflects it.
- Wrong passcode? The save simply won't stick and DeeDee will tell you.

DeeDee edits through **three safe tools** — add an item, update an item, set a
cadence — deliberately simple so nothing gets mangled from a phone.

---

## Two homes for the board (and avoiding drift)

- **Convex `opsBoard`** — the **live** source of truth for the web apps. DeeDee's
  chat writes here (passcode-gated); `/operations` reads it.
- **`deedee/ops.json`** — seeds Convex and is the offline fallback. It's also the
  structured file the **DeeDee agent in Claude Code** edits (alongside
  `deedee/dashboard.md`) for deeper work.

Rule of thumb: quick logging on the go → the phone chat (Convex); deep work
(reorganizing the pipeline, big calendar changes) → the DeeDee agent in Claude
Code (files). Keep heavy editing in one place to avoid drift; when in doubt, treat
what `/operations` shows (Convex) as authoritative.

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
