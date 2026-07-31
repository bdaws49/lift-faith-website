// api/barb.js — the "brain" behind the Talk to Barb page.
//
// This is a serverless function (runs on Vercel). It keeps your AI key SECRET
// on the server — the key is NEVER sent to the browser. The web page posts the
// conversation PLUS a snapshot of your dashboard (barb/books.json) here; this
// function adds Barb's persona + guardrails and calls Claude, then returns just
// Barb's reply.
//
// SETUP (one time — SAME key as Abe, so if Abe already works, Barb works):
//   1. In your Vercel project: Settings -> Environment Variables
//   2. Add:  ANTHROPIC_API_KEY = sk-ant-...   (your Anthropic API key)
//   3. Redeploy.
// Optional: BARB_MODEL to change the model (default: claude-sonnet-5).

const MODEL = process.env.BARB_MODEL || "claude-sonnet-5";

// Barb's persona, condensed from .claude/agents/barb.md for live chat.
const BASE_SYSTEM = `You are Barb, the publishing manager for independent author Billy Daws (Lift Faith / "Under the Scope with Pastor Billy Daws").

YOUR JOB
- You keep ONE organized dashboard for every book so Billy never has to ask "where did I save that?" For each title you track nine things: status, word count, cover artwork, ISBN, KDP files, marketing, launch checklist, reader bonuses, and reviews to monitor.
- You are calm, organized, warm, and specific. You track and remind; Billy writes and decides.

HOW YOU TALK (this is a live voice/text chat)
- Keep replies conversational and reasonably brief — usually a few sentences — UNLESS Billy asks for a full list (e.g. "read me the launch checklist"), then give the whole thing, clearly laid out.
- When Billy asks where something stands, give a tight read of the relevant fields and then name the single most useful NEXT ACTION.
- When he asks where a file is, give the exact path or link from the dashboard data. If it isn't recorded, say so plainly and offer to get it filed — don't invent a path.
- Speak the way it sounds said aloud. Warm and direct, like a trusted assistant who has everything handy.

GUARDRAILS (non-negotiable)
- NEVER fabricate an ISBN, a review, a link, a file path, a word count, or a date. If it's not in the dashboard data below, say it isn't recorded yet.
- Never silently drop one of the nine fields — if something's unknown, call it out as a TODO.
- This chat is READ + ADVISE. You can't edit files from here. When Billy wants to actually change the dashboard (mark a cover approved, add a book, log an ISBN), tell him to say it to you in Claude Code — "open the project and tell Barb" — where you can update books.json and the book's file. You can still tell him exactly what you'd change.
- If Billy asks about publishing facts you're unsure of (current KDP rules, category paths, pricing tiers), say you'd want to double-check rather than guessing.

You exist to give Billy back the mental load of remembering where everything is and what's next. Keep it findable, keep it honest, always know the next step.`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST." });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        "Barb isn't connected yet. Add ANTHROPIC_API_KEY in your Vercel project settings and redeploy (same key Abe uses).",
    });
    return;
  }

  // Body may arrive parsed (Vercel) or as a string; handle both.
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const messages = Array.isArray(body && body.messages) ? body.messages : [];
  if (messages.length === 0) {
    res.status(400).json({ error: "No messages provided." });
    return;
  }

  // The page sends a snapshot of the dashboard so Barb can answer real
  // questions. Accept a string or an object; keep it bounded.
  let booksSnapshot = body && body.books;
  if (booksSnapshot && typeof booksSnapshot !== "string") {
    try {
      booksSnapshot = JSON.stringify(booksSnapshot);
    } catch {
      booksSnapshot = "";
    }
  }
  booksSnapshot = String(booksSnapshot || "").slice(0, 12000);

  const dashboardContext = booksSnapshot
    ? `\n\nCURRENT DASHBOARD DATA (from barb/books.json — this is the live source of truth; answer from it, do not invent anything not here):\n${booksSnapshot}`
    : `\n\nNOTE: No dashboard data was provided with this request. If Billy asks about a specific book, say the dashboard didn't load and ask him to reload the page, rather than guessing.`;

  const system = BASE_SYSTEM + dashboardContext;

  // Keep only the last ~20 turns to stay snappy and bounded.
  const trimmed = messages.slice(-20).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || ""),
  }));

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        thinking: { type: "disabled" }, // snappy replies for a live chat
        system: system,
        messages: trimmed,
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      res
        .status(502)
        .json({ error: "Barb couldn't reach the AI service.", detail });
      return;
    }

    const data = await r.json();

    if (data.stop_reason === "refusal") {
      res.status(200).json({
        reply:
          "I'm going to hold off on that one, Billy — it's outside what I should help with. Let's get back to the books: which title do you want to check on?",
      });
      return;
    }

    const reply = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    res.status(200).json({ reply: reply || "(no reply)" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Something went wrong reaching Barb.", detail: String(err) });
  }
};
