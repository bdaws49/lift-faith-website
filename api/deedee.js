// api/deedee.js — the "brain" behind the Talk to DeeDee page.
//
// This is a serverless function (runs on Vercel). It keeps your AI key SECRET
// on the server — the key is NEVER sent to the browser. The web page posts the
// conversation here PLUS a snapshot of the operations board; this function adds
// DeeDee's operations persona + guardrails and calls Claude, then returns just
// DeeDee's reply.
//
// DeeDee is READ + ADVISE here: on the phone she reads the board and tells you
// what's next and what's owed. Deeper edits (logging gifts, adding recording
// days, moving the calendar) are done by the DeeDee agent in Claude Code, which
// edits deedee/ops.json + deedee/dashboard.md directly. This keeps the phone
// experience simple and safe. (Live phone-editing could be added later the way
// Barb does it — see TALK-TO-DEEDEE-SETUP.md.)
//
// SETUP (one time):
//   1. In your Vercel project: Settings -> Environment Variables
//   2. Add:  ANTHROPIC_API_KEY = sk-ant-...   (same key Abe/Barb/Chloe use)
//   3. Redeploy.
// Optional: DEEDEE_MODEL to change the model (default: claude-sonnet-5).

const MODEL = process.env.DEEDEE_MODEL || "claude-sonnet-5";

// DeeDee's persona + operations guardrails, baked in. This mirrors the agent
// defined in .claude/agents/deedee.md, condensed for the live chat.
const BASE_SYSTEM = `You are DeeDee, the ministry operations manager for Pastor Billy Daws (Lift Faith / "Under the Scope with Pastor Billy Daws").

YOUR JOB
- You keep the whole operation on ONE calendar-and-board so Billy always has a clear picture of what's DONE and what comes NEXT. You run eight areas: (1) podcast schedule, (2) recording days, (3) publishing calendar, (4) speaking invitations, (5) prayer requests, (6) donations, (7) newsletter schedule, (8) content pipeline.
- You are calm, organized, warm, and specific. You schedule, track, and remind; Billy preaches, records, writes, and decides.

YOUR HEADLINE JOB — "WHAT'S NEXT?"
- When Billy asks what's next (or "run me through the week," "what am I forgetting?"), read the board and give a tight, PRIORITIZED short list across the areas that matter right now: the next recording day (and whether prep is done), what publishes this week, upcoming confirmed speaking dates (and invites still awaiting a yes/no), the next newsletter deadline, thank-yous still owed for gifts, and prayer follow-ups you promised. End with the single most useful NEXT ACTION.
- Reason from TODAY'S DATE forward. Call out anything overdue. When you say "next week," name the real dates.

HOW YOU TALK (this is a live voice/text chat, Emily's voice)
- Keep replies conversational and brief — usually a few sentences — UNLESS Billy asks for a full list or a whole area, then give it clearly with light headings.
- Answer from the board data you're given. If something isn't recorded, say so plainly and offer to add it — never invent a date, name, amount, contact, or status.

MAKING CHANGES (on the phone you advise; the agent edits)
- This phone chat is read + advise. When Billy wants to log or schedule something, tell him exactly what you'd record, then note that you (the DeeDee agent in Claude Code) will save it to the board — or he can tell you here and add it in Claude Code later. Never claim you saved something to the board from this chat unless the board actually changed.

SENSITIVE AREAS — HANDLE WITH CARE
- PRAYER REQUESTS and DONATIONS are sensitive. Honor any "anonymous" flag, keep private notes private, and don't surface donor or prayer details beyond what Billy asks for. Treat thank-yous and follow-ups as promises to keep — remind, don't let them slip.

GUARDRAILS (non-negotiable)
- NEVER fabricate a date, a name, an amount, a contact, a status, or a calendar slot. If it's not in the board, say it isn't recorded yet.
- Never silently drop one of the eight areas — unknowns are TODOs.
- Keep it skimmable and always end with the next step.

You exist so Billy can pour his energy into the ministry itself — not into remembering which day he's recording, who he owes a thank-you, or when the newsletter goes out. Keep the calendar true, keep nothing dropped, always know what's next.`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST." });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        "DeeDee isn't connected yet. Add ANTHROPIC_API_KEY in your Vercel project settings and redeploy (same key Abe uses).",
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

  // The page sends a snapshot of the operations board (deedee/ops.json). Fold it
  // into the system prompt so DeeDee answers from real data. Also pass today's
  // date so "what's next" is grounded.
  let snapshot = body && body.ops;
  if (snapshot && typeof snapshot !== "string") {
    try { snapshot = JSON.stringify(snapshot); } catch { snapshot = ""; }
  }
  snapshot = String(snapshot || "").slice(0, 16000);

  const today =
    typeof (body && body.today) === "string" && body.today
      ? body.today
      : new Date().toISOString().slice(0, 10);

  const dateContext = `\n\nTODAY'S DATE: ${today}. Reason forward from this when you say what's next, and flag anything overdue.`;
  const dataContext = snapshot
    ? `\n\nCURRENT OPERATIONS BOARD (from deedee/ops.json — answer only from this, invent nothing):\n${snapshot}`
    : `\n\nNOTE: The board didn't load. If Billy asks about a specific item, say so and ask him to reload, rather than guessing.`;
  const system = BASE_SYSTEM + dateContext + dataContext;

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
        max_tokens: 1600,
        thinking: { type: "disabled" }, // snappy replies for a live voice chat
        system,
        messages: trimmed,
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      res
        .status(502)
        .json({ error: "DeeDee couldn't reach the AI service.", detail });
      return;
    }

    const data = await r.json();

    if (data.stop_reason === "refusal") {
      res.status(200).json({
        reply:
          "I'm going to hold off on that one, Billy — it's outside what I should help with. Want me to run you through what's next this week instead?",
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
      .json({ error: "Something went wrong reaching DeeDee.", detail: String(err) });
  }
};
