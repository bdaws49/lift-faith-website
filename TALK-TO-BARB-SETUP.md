# Setting up "Talk to Barb" (read **and** edit)

You have a real, clickable page where you talk to Barb — out loud or by typing —
and she answers from your live book dashboard **and can update it for you** once
you unlock editing with a passcode.

There are two levels:

- **Just talk (read + advise)** — needs one key (the same one Abe uses). Barb
  reads your dashboard and tells you what she'd change. Works immediately.
- **Full monte (Barb edits)** — Barb actually changes the dashboard from the
  chat, saved to your Convex database, locked behind a passcode. A few more
  one-time steps below.

Everything degrades gracefully: before the edit setup is done, the pages fall
back to the static `barb/books.json` and Barb stays in read/advise mode. Nothing
breaks in the meantime.

---

## The pieces

- **`talk-to-barb.html`** — the chat page (mic + type), with an **Unlock editing**
  button. Served at `/talk-to-barb` and `/barb`.
- **`publishing-dashboard.html`** — the visual board at `/dashboard`. Reads the
  same live data.
- **`api/barb.js`** — the server "brain." Reads your dashboard from Convex and,
  when unlocked, gives Barb tools to add a book / update fields.
- **`convex/books.ts` + `books` table** — where the books actually live. Writes
  are passcode-gated inside Convex, so nothing can change without the passcode.

---

## Level 1 — Just talk (1 step, ~2 min)

If Abe already works, this already works too — it's the same key.

1. In **Vercel → your project → Settings → Environment Variables**, add
   `ANTHROPIC_API_KEY = sk-ant-...` (from https://console.anthropic.com). Redeploy.

Open `https://yourdomain.com/barb` and talk. Ask *"Where does Lift Your Eyes
stand?"*, *"What's next on the launch?"*, *"Where did I save the KDP files?"*

---

## Level 2 — Let Barb edit (the full monte)

### A. Deploy the book functions to Convex
Your site already uses Convex (`convex/` folder). From the project, run:

```
npx convex deploy
```

This publishes the new `books` table and the `books:list / addBook / patchBook /
seed` functions.

### B. Import your current book(s) into Convex (one time)
Copy the `books` array from `barb/books.json` and seed it:

```
npx convex run books:seed '{"books": [ ...paste the books array here... ]}'
```

`seed` is non-destructive — it only adds titles that aren't there yet, so it's
safe to run again.

### C. Set the editing passcode (this is the lock)
Pick any passcode and store it **in Convex** (not in the code):

```
npx convex env set BARB_PASSCODE "choose-something-only-you-know"
```

If this isn't set, editing stays disabled (fail closed) — Barb can read but never
change anything.

### D. Tell Vercel where Convex is (optional)
`api/barb.js` defaults to your existing deployment
(`https://tame-fennec-574.convex.cloud`). If yours differs, add
`CONVEX_URL = https://<your-deployment>.convex.cloud` in Vercel and redeploy.

### Using it
- On `/barb`, tap **Unlock editing** and enter your passcode (stored on that
  device only).
- Then just tell her: *"Mark the cover approved — concept B,"* *"I hit 21,000
  words,"* *"Add a new book called Still Waters,"* *"Set the paperback ISBN to
  978-…"* She saves it and says what she changed; the dashboard reflects it.
- Wrong passcode? The save simply won't stick and Barb will tell you.

---

## Read vs. edit, and the Claude Code agent

- The **chat app** now edits too, but through **two safe tools** (add a book,
  patch fields) — deliberately simple so nothing gets mangled from a phone.
- For heavier work — rewriting marketing copy, reworking the full launch
  checklist, filing cover/KDP/bonus files into `barb/books/<slug>/` — open the
  project in **Claude Code** and talk to the **Barb agent**. That's still the
  place for depth. The chat app and the agent read the same data.

## Optional settings

- `BARB_MODEL` (Vercel) — the model Barb uses. Default `claude-sonnet-5`. Use
  `claude-opus-5` for more depth at higher cost.

## Privacy

The page is `noindex`, but anyone with the link can open it and read the board.
Editing is locked by the passcode. Want reading locked to just you too? Say so
and I'll add a read gate.
