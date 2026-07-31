# Setting up the "Talk to Abe" page

You have a real, clickable voice page where you speak to Abe and he answers out
loud and in text. It needs **one** secret key added, then a deploy. About 5
minutes.

## What the pieces are

- **`talk-to-abe.html`** — the page with the mic button (what you and others open).
- **`api/abe.js`** — the small "brain" that keeps your AI key secret and calls
  Claude with Abe's voice. Runs on the server; the key is never in the webpage.

## The 2 steps to turn Abe on

Your site deploys on **Vercel**, so:

1. **Add your AI key as an environment variable.**
   - Get an Anthropic API key from https://console.anthropic.com (Settings → API Keys).
     It looks like `sk-ant-...`. (This is a usage-based key — you pay Anthropic for
     what Abe generates; a voice chat is very cheap, typically fractions of a cent
     per exchange.)
   - In Vercel: open your project → **Settings → Environment Variables**.
   - Add:  **Name** `ANTHROPIC_API_KEY`  **Value** `sk-ant-...`  → Save.

2. **Redeploy.**
   - Vercel → **Deployments** → open the latest → **Redeploy** (or just push any
     commit). The new environment variable only takes effect after a deploy.

That's it. Then open **`https://yourdomain.com/talk-to-abe`** and tap the mic.

## Using it

- **Tap the mic** and talk. Abe answers out loud and shows the text.
- Or **type** in the box — works on every browser and iPhone.
- Voice *input* works best in **Chrome** or on **Android**. Abe speaking *back*
  works in most browsers. Typing works everywhere.
- **"Abe speaks aloud"** checkbox turns his voice on/off.
- **"Start over"** clears the conversation.

## Optional settings (Vercel → Environment Variables)

- `ABE_MODEL` — the AI model Abe uses. Default `claude-sonnet-5` (fast + low cost,
  great for chat). Set to `claude-opus-5` for maximum depth at higher cost.

## If you see "Abe isn't connected yet"

That message means the key isn't set on the server yet — do step 1, then redeploy
(step 2).

## Not on Vercel?

If your site is hosted on **Netlify** instead, the function needs to live at
`netlify/functions/abe.js` (same code) and the page should call `/.netlify/
functions/abe`. Tell me your host and I'll wire it up for that platform.

## A note on privacy

The page is marked "no index" so search engines won't list it, but anyone who has
the link and opens it can talk to Abe (and it uses your AI key). If you want it
locked to just you, tell me and I can add a simple passcode.
