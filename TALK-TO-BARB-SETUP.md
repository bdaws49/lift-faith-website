# Setting up the "Talk to Barb" page

You have a real, clickable page where you talk to Barb — out loud or by typing —
and she answers from your live book dashboard. It needs the **same one secret
key** Abe uses, then a deploy. If Abe already works, **Barb already works.**

## What the pieces are

- **`talk-to-barb.html`** — the page with the mic button (what you open). It
  reads your dashboard (`barb/books.json`) so Barb can answer real questions.
- **`api/barb.js`** — the small "brain" that keeps your AI key secret and calls
  Claude with Barb's persona. Runs on the server; the key is never in the webpage.
- **`publishing-dashboard.html`** — the *visual* board at `/dashboard`. The chat
  and the board are linked to each other.

## The 2 steps to turn Barb on

Your site deploys on **Vercel**, so:

1. **Add your AI key as an environment variable** (skip if you already did this
   for Abe — it's the same key).
   - Get an Anthropic API key from https://console.anthropic.com (Settings → API
     Keys). It looks like `sk-ant-...`. (Usage-based; a chat is fractions of a
     cent per exchange.)
   - In Vercel: open your project → **Settings → Environment Variables**.
   - Add: **Name** `ANTHROPIC_API_KEY` **Value** `sk-ant-...` → Save.

2. **Redeploy.** Vercel → **Deployments** → open the latest → **Redeploy** (or
   push any commit).

That's it. Then open **`https://yourdomain.com/talk-to-barb`** (or just
**`/barb`**) and tap the mic.

## Using it

- **Tap the mic** and talk, or **type** in the box (works everywhere).
- Ask things like: *"Where does Lift Your Eyes stand?"*, *"What's next on the
  launch?"*, *"Where did I save the KDP files?"*, *"Read me the launch checklist."*
- **"Barb speaks aloud"** turns her voice on/off. **"Start over"** clears the chat.
- Voice *input* works best in **Chrome** or on **Android**; typing works on every
  browser and iPhone.

## Read vs. edit (important)

The chat page is **read + advise**: Barb answers from the dashboard and tells you
what she'd change, but she can't edit files from the browser. To actually
**update** the dashboard (mark a cover approved, add a book, log an ISBN), open
this project in **Claude Code** and tell the Barb agent — she'll update
`barb/books.json` and the book's file. The chat page then reflects it on reload.

## Optional settings (Vercel → Environment Variables)

- `BARB_MODEL` — the AI model Barb uses. Default `claude-sonnet-5` (fast + low
  cost). Set to `claude-opus-5` for maximum depth at higher cost.

## If you see "Barb isn't connected yet"

The key isn't set on the server yet — do step 1, then redeploy (step 2).

## A note on privacy

The page is marked "no index," but anyone with the link can open it (and it uses
your AI key + shows your book dashboard). If you want it locked to just you, tell
me and I'll add a simple passcode.
