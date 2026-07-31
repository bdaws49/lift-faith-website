# Setting up the "Talk to Chloe" page

You have a real, clickable research page where you speak (or type) to Chloe and she
answers out loud and in text — historical background, word studies, cross-
references, and the rest. It needs **one** secret key added, then a deploy. About
5 minutes.

## What the pieces are

- **`talk-to-chloe.html`** — the page with the mic button (what you and others open).
- **`api/chloe.js`** — the small "brain" that keeps your AI key secret and calls
  Claude with Chloe's research persona. Runs on the server; the key is never in the
  webpage.

## The 2 steps to turn Chloe on

Your site deploys on **Vercel**, and Chloe shares the **same** AI key as Abe and
Barb. If you already set `ANTHROPIC_API_KEY` for them, Chloe is already turned on —
just redeploy. If not:

1. **Add your AI key as an environment variable.**
   - Get an Anthropic API key from https://console.anthropic.com (Settings → API Keys).
     It looks like `sk-ant-...`. (This is a usage-based key — you pay Anthropic for
     what Chloe generates. A full research brief is more than a quick chat, but still
     typically a few cents.)
   - In Vercel: open your project → **Settings → Environment Variables**.
   - Add:  **Name** `ANTHROPIC_API_KEY`  **Value** `sk-ant-...`  → Save.

2. **Redeploy.**
   - Vercel → **Deployments** → open the latest → **Redeploy** (or just push any
     commit). The new environment variable only takes effect after a deploy.

That's it. Then open **`https://yourdomain.com/talk-to-chloe`** (or `/chloe`) and
tap the mic — or just type "prepare everything on Romans 8."

## Using it

- **Tap the mic** and talk. Chloe answers out loud and shows the text.
- Or **type** in the box — works on every browser and iPhone.
- Say **"prepare everything on ___"** for the full brief (all eleven pieces), or
  ask for just one — "word study on hesed," "cross-references for Psalm 121."
- Voice *input* works best in **Chrome** or on **Android**. Chloe speaking *back*
  works in most browsers. Typing works everywhere.
- **"Chloe speaks aloud"** checkbox turns her voice on/off. She uses a female voice
  that's deliberately set to sound **different from Barb's**.
- **"Start over"** clears the conversation.

## Optional settings (Vercel → Environment Variables)

- `CHLOE_MODEL` — the AI model Chloe uses. Default `claude-sonnet-5` (fast + low
  cost, great for research chat). Set to `claude-opus-5` for maximum depth on long
  briefs, at higher cost.

## If you see "Chloe isn't connected yet"

That message means the key isn't set on the server yet — do step 1, then redeploy
(step 2).

## Not on Vercel?

If your site is hosted on **Netlify** instead, the function needs to live at
`netlify/functions/chloe.js` (same code) and the page should call `/.netlify/
functions/chloe`. Tell me your host and I'll wire it up for that platform.

## A note on privacy

The page is marked "no index" so search engines won't list it, but anyone who has
the link and opens it can talk to Chloe (and it uses your AI key). If you want it
locked to just you, tell me and I can add a simple passcode.
