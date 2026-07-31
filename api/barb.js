// api/barb.js — the "brain" behind the Talk to Barb page.
//
// This is a serverless function (runs on Vercel). It keeps your AI key SECRET
// on the server. It does two things:
//   1. READS your live dashboard from Convex so Barb answers from real data.
//   2. When you've UNLOCKED editing (passcode), gives Barb tools to actually
//      change the dashboard — add a book, update a field — by calling Convex
//      mutations. Writes are gated by the passcode inside Convex, so a wrong
//      or missing passcode can't change anything.
//
// SETUP (see TALK-TO-BARB-SETUP.md):
//   Vercel env:  ANTHROPIC_API_KEY = sk-ant-...   (same key Abe uses)
//   Vercel env:  CONVEX_URL       = https://<your-deployment>.convex.cloud
//                (defaults to the site's existing deployment if unset)
//   Convex env:  BARB_PASSCODE    = the passcode that unlocks editing
//   Optional:    BARB_MODEL       = model id (default claude-sonnet-5)

const MODEL = process.env.BARB_MODEL || "claude-sonnet-5";
const CONVEX_URL = process.env.CONVEX_URL || "https://tame-fennec-574.convex.cloud";

let ConvexHttpClient = null;
try {
  ({ ConvexHttpClient } = require("convex/browser"));
} catch (e) {
  // convex not installed — Barb still runs read/advise using the snapshot the
  // page sends. Editing is unavailable until convex is present.
}

function convexClient() {
  if (!ConvexHttpClient || !CONVEX_URL) return null;
  try {
    return new ConvexHttpClient(CONVEX_URL);
  } catch (e) {
    return null;
  }
}

const BASE_SYSTEM = `You are Barb, the publishing manager for independent author Billy Daws (Lift Faith).

YOUR JOB
- You keep ONE organized dashboard for every book so Billy never has to ask "where did I save that?" For each title you track nine things: status, word count, cover artwork, ISBN, KDP files, marketing, launch checklist, reader bonuses, and reviews to monitor.
- You are calm, organized, warm, and specific. You track and remind; Billy writes and decides.

HOW YOU TALK (this is a live voice/text chat)
- Keep replies conversational and brief — usually a few sentences — UNLESS Billy asks for a full list, then give the whole thing clearly.
- When he asks where a book stands, give a tight read of the relevant fields, then name the single most useful NEXT ACTION.
- When he asks where a file is, give the exact path/link from the data. If it isn't recorded, say so — don't invent one.
- Speak the way it sounds said aloud: warm, direct, like a trusted assistant with everything handy.

MAKING CHANGES
- When editing is UNLOCKED, you can actually update the dashboard using your tools (add_book, patch_book). After a change, confirm in one plain sentence exactly what you changed.
- For patch_book, send ONLY the fields that change, in the same shape as the data. When changing part of a nested object (like cover or marketing), include that whole nested object so nothing is lost.
- When editing is LOCKED, you cannot change anything. Tell Billy what you WOULD change and ask him to tap "Unlock editing" and enter his passcode. Never pretend a change was saved.

GUARDRAILS (non-negotiable)
- NEVER fabricate an ISBN, a review, a link, a file path, a word count, or a date. If it's not in the data, say it isn't recorded yet.
- Never silently drop one of the nine fields — unknowns are TODOs.
- Confirm real edits truthfully. If a tool fails, say so plainly and don't claim it worked.
- If unsure about a changing publishing fact (KDP rules, category paths), say you'd double-check rather than guess.

You exist to carry the mental load of remembering where everything is and what's next. Keep it findable, keep it honest, always know the next step.`;

const TOOLS = [
  {
    name: "add_book",
    description:
      "Create a brand-new book in the dashboard. Use when Billy starts or hands you a new title. Fails if the slug already exists.",
    input_schema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "short kebab-case id, e.g. still-waters" },
        title: { type: "string" },
        format: { type: "string", enum: ["ebook", "print", "both"], description: "default both" },
        targetWords: { type: "number", description: "target word count if known" },
        status: {
          type: "string",
          enum: ["idea", "drafting", "editing", "formatting", "cover", "pre-launch", "launched", "live"],
          description: "default idea",
        },
      },
      required: ["slug", "title"],
    },
  },
  {
    name: "patch_book",
    description:
      "Update fields on an existing book. Pass ONLY the fields that change, in the same shape as the dashboard data (e.g. {\"status\":\"cover\"} or {\"cover\":{\"state\":\"approved\",\"notes\":\"concept B\"}} or {\"wordCount\":{\"current\":21000}} or {\"isbn\":{\"print\":\"978-...\"}}). Include the whole nested object for the field you change.",
    input_schema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "which book to update" },
        changes: { type: "object", description: "partial record of fields to change", additionalProperties: true },
      },
      required: ["slug", "changes"],
    },
  },
];

async function callClaude(apiKey, system, messages, tools) {
  const body = {
    model: MODEL,
    max_tokens: 1024,
    system,
    messages,
  };
  if (tools && tools.length) body.tools = tools;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const detail = await r.text();
    const err = new Error("AI service error");
    err.detail = detail;
    throw err;
  }
  return r.json();
}

async function execTool(client, passcode, name, input) {
  if (!client) throw new Error("The dashboard database isn't reachable right now, so I can't save that.");
  if (name === "add_book") {
    return await client.mutation("books:addBook", {
      passcode,
      slug: input.slug,
      title: input.title,
      format: input.format,
      targetWords: input.targetWords,
      status: input.status,
    });
  }
  if (name === "patch_book") {
    return await client.mutation("books:patchBook", {
      passcode,
      slug: input.slug,
      changes: input.changes || {},
    });
  }
  throw new Error(`Unknown tool: ${name}`);
}

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

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const inMessages = Array.isArray(body && body.messages) ? body.messages : [];
  if (inMessages.length === 0) {
    res.status(400).json({ error: "No messages provided." });
    return;
  }
  const passcode = typeof (body && body.passcode) === "string" ? body.passcode : "";
  const unlocked = passcode.length > 0;

  const client = convexClient();

  // 1) Read the live dashboard from Convex; fall back to the snapshot the page
  //    sent (from books.json) if Convex is unreachable or not yet seeded.
  let books = null;
  if (client) {
    try {
      const rows = await client.query("books:list", {});
      if (Array.isArray(rows) && rows.length) books = rows;
    } catch (e) { /* fall through to snapshot */ }
  }
  let snapshot = body && body.books;
  if (books) {
    snapshot = JSON.stringify({ books });
  } else if (snapshot && typeof snapshot !== "string") {
    try { snapshot = JSON.stringify(snapshot); } catch { snapshot = ""; }
  }
  snapshot = String(snapshot || "").slice(0, 14000);

  const dataContext = snapshot
    ? `\n\nCURRENT DASHBOARD DATA (live source of truth — answer only from this, invent nothing):\n${snapshot}`
    : `\n\nNOTE: The dashboard didn't load. If Billy asks about a specific book, say so and ask him to reload, rather than guessing.`;
  const lockContext = unlocked
    ? `\n\nEDITING IS UNLOCKED. You may use your tools to make changes, then confirm exactly what you changed.`
    : `\n\nEDITING IS LOCKED. You cannot change anything. Describe what you would change and ask Billy to tap "Unlock editing" and enter his passcode.`;
  const system = BASE_SYSTEM + dataContext + lockContext;

  // Build the running conversation (plain text turns to start).
  let convo = inMessages.slice(-20).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || ""),
  }));

  const tools = unlocked ? TOOLS : [];
  let changed = false;

  try {
    // Agent loop: let Barb call tools until she returns a final text reply.
    for (let step = 0; step < 5; step++) {
      const data = await callClaude(apiKey, system, convo, tools);

      if (data.stop_reason === "refusal") {
        res.status(200).json({
          reply:
            "I'm going to hold off on that one, Billy — it's outside what I should help with. Which book do you want to check on?",
          changed,
        });
        return;
      }

      const toolUses = (data.content || []).filter((b) => b.type === "tool_use");

      if (toolUses.length === 0) {
        // Final answer.
        const reply = (data.content || [])
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        // If anything changed, hand back a fresh copy so the page updates.
        let fresh = books;
        if (changed && client) {
          try { fresh = await client.query("books:list", {}); } catch (e) {}
        }
        res.status(200).json({ reply: reply || "(no reply)", changed, books: fresh || undefined });
        return;
      }

      // Execute each tool call and feed the results back.
      const results = [];
      for (const use of toolUses) {
        try {
          const out = await execTool(client, passcode, use.name, use.input || {});
          changed = true;
          results.push({ type: "tool_result", tool_use_id: use.id, content: JSON.stringify(out) });
        } catch (err) {
          results.push({
            type: "tool_result",
            tool_use_id: use.id,
            is_error: true,
            content: String((err && err.message) || err),
          });
        }
      }
      convo = convo.concat([
        { role: "assistant", content: data.content },
        { role: "user", content: results },
      ]);
    }

    // Safety net if the loop didn't converge.
    res.status(200).json({
      reply: "I got a little tangled making those changes — can you say that once more, one change at a time?",
      changed,
    });
  } catch (err) {
    res.status(502).json({
      error: "Barb couldn't reach the AI service.",
      detail: String((err && err.detail) || (err && err.message) || err),
    });
  }
};
