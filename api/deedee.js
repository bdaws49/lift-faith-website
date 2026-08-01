// api/deedee.js — the "brain" behind the Talk to DeeDee page.
//
// This is a serverless function (runs on Vercel). It keeps your AI key SECRET
// on the server. It does two things:
//   1. READS your live operations board from Convex so DeeDee answers from real
//      data (falls back to the deedee/ops.json snapshot the page sends).
//   2. When you've UNLOCKED editing (passcode), gives DeeDee tools to actually
//      change the board — add an item, update an item, set a cadence — by
//      calling Convex mutations. Writes are gated by the passcode INSIDE Convex,
//      so a wrong or missing passcode can't change anything.
//
// DeeDee's board is a single document with eight areas (podcast schedule,
// recording days, publishing calendar, speaking invitations, prayer requests,
// donations, newsletter schedule, content pipeline). Prayer requests and
// donations are sensitive — honor "anonymous"/"private" and never invent.
//
// SETUP (see TALK-TO-DEEDEE-SETUP.md):
//   Vercel env:  ANTHROPIC_API_KEY = sk-ant-...   (same key Abe/Barb use)
//   Vercel env:  CONVEX_URL        = https://<your-deployment>.convex.cloud
//                (defaults to the site's existing deployment if unset)
//   Convex env:  DEEDEE_PASSCODE   = the passcode that unlocks editing
//   Optional:    DEEDEE_MODEL      = model id (default claude-sonnet-5)

const MODEL = process.env.DEEDEE_MODEL || "claude-sonnet-5";
const CONVEX_URL = process.env.CONVEX_URL || "https://tame-fennec-574.convex.cloud";

let ConvexHttpClient = null;
try {
  ({ ConvexHttpClient } = require("convex/browser"));
} catch (e) {
  // convex not installed — DeeDee still runs read/advise using the snapshot the
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

const BASE_SYSTEM = `You are DeeDee, the ministry operations manager for Pastor Billy Daws (Lift Faith / "Under the Scope with Pastor Billy Daws").

YOUR JOB
- You keep the whole operation on ONE calendar-and-board so Billy always has a clear picture of what's DONE and what comes NEXT. You run eight areas: (1) podcast schedule, (2) recording days, (3) publishing calendar, (4) speaking invitations, (5) prayer requests, (6) donations, (7) newsletter schedule, (8) content pipeline.
- You are calm, organized, warm, and specific. You schedule, track, and remind; Billy preaches, records, writes, and decides.

YOUR HEADLINE JOB — "WHAT'S NEXT?"
- When Billy asks what's next (or "run me through the week," "what am I forgetting?"), read the board and give a tight, PRIORITIZED short list across the areas that matter now: the next recording day (and whether prep is done), what publishes this week, upcoming confirmed speaking dates (and invites still awaiting a yes/no), the next newsletter deadline, thank-yous still owed for gifts, and prayer follow-ups you promised. End with the single most useful NEXT ACTION.
- Reason from TODAY'S DATE forward. Call out anything overdue. When you say "next week," name the real dates.

HOW YOU TALK (this is a live voice/text chat, Emily's voice)
- Keep replies conversational and brief — usually a few sentences — UNLESS Billy asks for a full list or a whole area, then give it clearly with light headings.
- Answer from the board data. If something isn't recorded, say so plainly and offer to add it — never invent a date, name, amount, contact, or status.

MAKING CHANGES
- When editing is UNLOCKED, you can actually update the board using your tools (add_item, update_item, set_field). After a change, confirm in one plain sentence exactly what you changed.
- add_item: append to one area. "area" is one of: podcast, recording, calendar, speaking, prayer, donation, newsletter, pipeline. "item" matches that area's shape from the board data (e.g. a podcast item has title/topicOrPassage/guest/status/targetPublish; a donation has donor/amount/date/channel/status).
- update_item: change fields on an existing item. Identify it with "match" — either {"index": N} or field equalities like {"title": "..."} / {"date": "..."} / {"donor": "...","date": "..."} — and pass only the changed fields in "changes".
- set_field: set a value at a dotted path for non-list settings, e.g. {"path":"podcastSchedule.cadence","value":"weekly on Wednesdays"} or {"path":"newsletterSchedule.cadence","value":"monthly, first Monday"}. (Do NOT use it to replace a whole area's list.)
- When editing is LOCKED, you cannot change anything. Tell Billy what you WOULD change and ask him to tap "Unlock editing" and enter his passcode. Never pretend a change was saved.

SENSITIVE AREAS — HANDLE WITH CARE
- PRAYER REQUESTS and DONATIONS are sensitive. Honor any "anonymous"/"private" flag (set private:true or donor:"anonymous" when asked), keep private notes private, and don't surface donor or prayer details beyond what Billy asks for. Treat thank-yous and follow-ups as promises to keep.

GUARDRAILS (non-negotiable)
- NEVER fabricate a date, a name, an amount, a contact, a status, or a calendar slot. If it's not in the board, say it isn't recorded yet.
- Never silently drop one of the eight areas — unknowns are TODOs.
- Confirm real edits truthfully. If a tool fails, say so plainly and don't claim it worked.

You exist so Billy can pour his energy into the ministry itself — not into remembering which day he's recording, who he owes a thank-you, or when the newsletter goes out. Keep the calendar true, keep nothing dropped, always know what's next.`;

const AREAS = ["podcast", "recording", "calendar", "speaking", "prayer", "donation", "newsletter", "pipeline"];

const TOOLS = [
  {
    name: "add_item",
    description:
      "Append a new item to one of the eight areas of the operations board. Use when Billy logs or schedules something new. The item's shape should match that area's records in the board data.",
    input_schema: {
      type: "object",
      properties: {
        area: { type: "string", enum: AREAS, description: "which area to add to" },
        item: { type: "object", description: "the new record, in the same shape as that area's items", additionalProperties: true },
      },
      required: ["area", "item"],
    },
  },
  {
    name: "update_item",
    description:
      "Update fields on an existing item in an area. Identify the item with `match` ({\"index\":N} or field equalities like {\"title\":\"...\"} or {\"donor\":\"...\",\"date\":\"...\"}) and pass ONLY the changed fields in `changes`.",
    input_schema: {
      type: "object",
      properties: {
        area: { type: "string", enum: AREAS, description: "which area the item is in" },
        match: { type: "object", description: "how to find the item: {index:N} or field equalities", additionalProperties: true },
        changes: { type: "object", description: "partial fields to change", additionalProperties: true },
      },
      required: ["area", "match", "changes"],
    },
  },
  {
    name: "set_field",
    description:
      "Set a value at a dotted path for a non-list setting (e.g. a cadence, a period label). Examples: {\"path\":\"podcastSchedule.cadence\",\"value\":\"weekly on Wednesdays\"}. Do NOT use this to replace a whole area's list.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "dotted path within the board" },
        value: {},
      },
      required: ["path", "value"],
    },
  },
];

async function callClaude(apiKey, system, messages, tools) {
  const body = { model: MODEL, max_tokens: 1600, system, messages };
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
  if (!client) throw new Error("The board database isn't reachable right now, so I can't save that.");
  if (name === "add_item") {
    return await client.mutation("ops:addItem", { passcode, area: input.area, item: input.item || {} });
  }
  if (name === "update_item") {
    return await client.mutation("ops:patchItem", {
      passcode, area: input.area, match: input.match || {}, changes: input.changes || {},
    });
  }
  if (name === "set_field") {
    return await client.mutation("ops:setField", { passcode, path: input.path, value: input.value });
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
        "DeeDee isn't connected yet. Add ANTHROPIC_API_KEY in your Vercel project settings and redeploy (same key Abe uses).",
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
  const today =
    typeof (body && body.today) === "string" && body.today
      ? body.today
      : new Date().toISOString().slice(0, 10);

  const client = convexClient();

  // 1) Read the live board from Convex; fall back to the snapshot the page sent
  //    (from deedee/ops.json) if Convex is unreachable or not yet seeded.
  let board = null;
  if (client) {
    try {
      const b = await client.query("ops:getBoard", { passcode });
      if (b && typeof b === "object") board = b;
    } catch (e) { /* locked or unreachable — fall through to snapshot */ }
  }
  let snapshot = body && body.ops;
  if (board) {
    try { snapshot = JSON.stringify(board); } catch { snapshot = ""; }
  } else if (snapshot && typeof snapshot !== "string") {
    try { snapshot = JSON.stringify(snapshot); } catch { snapshot = ""; }
  }
  snapshot = String(snapshot || "").slice(0, 16000);

  const dateContext = `\n\nTODAY'S DATE: ${today}. Reason forward from this when you say what's next, and flag anything overdue.`;
  const dataContext = snapshot
    ? `\n\nCURRENT OPERATIONS BOARD (live source of truth — answer only from this, invent nothing):\n${snapshot}`
    : `\n\nNOTE: The board didn't load. If Billy asks about a specific item, say so and ask him to reload, rather than guessing.`;
  const lockContext = unlocked
    ? `\n\nEDITING IS UNLOCKED. You may use your tools to make changes, then confirm exactly what you changed.`
    : `\n\nEDITING IS LOCKED. You cannot change anything. Describe what you would change and ask Billy to tap "Unlock editing" and enter his passcode.`;
  const system = BASE_SYSTEM + dateContext + dataContext + lockContext;

  let convo = inMessages.slice(-20).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || ""),
  }));

  const tools = unlocked ? TOOLS : [];
  let changed = false;

  try {
    // Agent loop: let DeeDee call tools until she returns a final text reply.
    for (let step = 0; step < 5; step++) {
      const data = await callClaude(apiKey, system, convo, tools);

      if (data.stop_reason === "refusal") {
        res.status(200).json({
          reply:
            "I'm going to hold off on that one, Billy — it's outside what I should help with. Want me to run you through what's next this week instead?",
          changed,
        });
        return;
      }

      const toolUses = (data.content || []).filter((b) => b.type === "tool_use");

      if (toolUses.length === 0) {
        const reply = (data.content || [])
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        let fresh = board;
        if (changed && client) {
          try { fresh = await client.query("ops:getBoard", { passcode }); } catch (e) {}
        }
        res.status(200).json({ reply: reply || "(no reply)", changed, ops: fresh || undefined });
        return;
      }

      const results = [];
      for (const use of toolUses) {
        try {
          const out = await execTool(client, passcode, use.name, use.input || {});
          changed = true;
          results.push({ type: "tool_result", tool_use_id: use.id, content: JSON.stringify(out).slice(0, 4000) });
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

    res.status(200).json({
      reply: "I got a little tangled making those changes — can you say that once more, one change at a time?",
      changed,
    });
  } catch (err) {
    res.status(502).json({
      error: "DeeDee couldn't reach the AI service.",
      detail: String((err && err.detail) || (err && err.message) || err),
    });
  }
};
