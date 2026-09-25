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

## Show your real Google Calendar (the Secret iCal URL)

This lets DeeDee read your **actual Google Calendar** — trips, dinners, meetings —
so `/deedee` shows a *"Your calendar"* panel and she answers *"what's on my
calendar today/tomorrow?"* from your real schedule. It's server-side and
**read-only**; DeeDee never changes your calendar.

Why this way? It needs **one secret URL**, not a Google Cloud OAuth project — much
simpler, and because the server holds it, it also works for hands-off jobs (a
future daily email brief) that a phone connector can't.

**A. Copy your calendar's Secret iCal address**
1. On a computer, open **Google Calendar → Settings** (gear → Settings).
2. Left side, under **Settings for my calendars**, click **your calendar**.
3. Scroll to **Integrate calendar** → copy the **Secret address in iCal format**
   (it ends in `/basic.ics`). Treat it like a password — anyone with it can read
   this calendar.

**B. Give it to the website**
1. In **Vercel → your project → Settings → Environment Variables**, add
   `GCAL_ICS_URL = <the secret ics url you copied>`.
2. Optional: `MINISTRY_TZ = America/New_York` (your time zone, for deciding where
   "today"/"tomorrow" begin — defaults to Eastern).
3. Redeploy.

Open `/deedee` — you should see the **📅 Your calendar** panel with today and
tomorrow, and DeeDee will answer calendar questions from it. The same panel shows
on the operations board at `/operations`.

Notes:
- Recurring events, all-day multi-day trips, and time zones are handled for you.
- To include more than one calendar, repeat with each calendar's secret ICS —
  for now the site reads the single `GCAL_ICS_URL`; say the word to support a list.
- Not set up yet? DeeDee simply says your calendar isn't linked (she will **not**
  pretend it's empty).

---

## DeeDee's daily brief (she emails YOU — advance warning, hands-off)

This is the part that makes DeeDee reach out to *you* instead of waiting to be
asked. Twice a day she emails a short, phone-friendly rundown of your calendar so
nothing sneaks up on you:

- **🌙 Evening preview** (~5–6 PM Eastern): a look at **tomorrow** (plus the day
  after) — your advance warning.
- **☀️ Morning brief** (by **6:00 AM Eastern**): **today's** plan, plus tomorrow.

Each one lists time · title · location, says *"Clear — nothing scheduled"* on an
empty day, and flags **back-to-back** appointments. It reads your real Google
Calendar **read-only** (via the same `GCAL_ICS_URL` above) and sends through the
same email pipe as the daily verses. It **never changes your calendar.**

**What it needs (all things you've likely already set):**
1. `GCAL_ICS_URL` in **Vercel** — so DeeDee can see your calendar (section above).
2. `RESEND_API_KEY` in **Convex** — the email sender (already set if daily verses
   go out). Emails are sent from `daily@liftfaith.com` to you.
3. Deploy the new schedule to Convex:
   ```
   npx convex deploy
   ```
   This registers two daily jobs (`deedee morning brief`, `deedee evening
   preview`) defined in `convex/crons.ts` + `convex/deedeeBrief.ts`.

**Optional Convex env vars:**
- `BRIEF_RECIPIENT` — who gets the brief. Defaults to `billydaws@gmail.com`.
- `SITE_URL` — where the site's `/api/calendar` lives. Defaults to
  `https://liftfaith.com`. Set it if your domain differs.
  ```
  npx convex env set BRIEF_RECIPIENT "you@example.com"
  npx convex env set SITE_URL "https://your-domain.com"
  ```

**Test it now (no waiting for the alarm clock):**
```
npx convex run deedeeBrief:sendCalendarBrief '{"slot":"morning"}'
npx convex run deedeeBrief:sendCalendarBrief '{"slot":"evening"}'
```
Check your inbox — you should get the two briefs. If the calendar isn't linked
yet, DeeDee tells you so plainly instead of claiming your day is clear.

**Timing & daylight saving:** the morning job runs at 10:00 UTC, which is 6 AM
Eastern in summer and 5 AM in winter — so it's always *at or before* 6 AM your
time, no seasonal fix needed. Prefer exactly 7 AM, one email only, or a different
schedule? Say the word and I'll adjust `convex/crons.ts`.

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

## Privacy & the read gate (the board holds prayer requests + giving)

The board is sensitive, so reading it can be locked behind a **view passcode**.

### Lock viewing
Set a read passcode in Convex:

```
npx convex env set DEEDEE_READ_PASSCODE "your-view-code"
```

Once it's set, `/operations` and `/talk-to-deedee` show a passcode screen before
revealing anything, and `ops:getBoard` refuses to return the board without the
code. If it isn't set, viewing stays open (nothing changes until you opt in).

**One code for everything (simplest):** set `DEEDEE_READ_PASSCODE` and
`DEEDEE_PASSCODE` to the **same** value — then one passcode both views and edits,
and the "Unlock editing" bar lights up automatically once you're in. Want a
separate view-only code (e.g. so a helper can read but not edit)? Give them
different values; the view code shows the board, the edit code is still required
to save.

The passcode is stored only on that device (localStorage), so you enter it once
per phone/browser.

### One honest caveat — keep `deedee/ops.json` a scaffold
This is a static site, so the seed file `deedee/ops.json` is reachable directly
at `/deedee/ops.json` and the read gate can't cover a raw static file. That's why
**real prayer requests and donations should live in Convex** (added through the
chat once unlocked), and `deedee/ops.json` should stay a non-sensitive scaffold —
structure and TODOs, not names and amounts. DeeDee (the agent) is told to keep
sensitive detail out of that file. The gate then protects the live board, which
is where the sensitive data actually accumulates.

The pages are also `noindex`. Keep the link private regardless.
