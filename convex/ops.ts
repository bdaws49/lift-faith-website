import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// DeeDee's operations board, stored in Convex so she can edit it live from the
// "Talk to DeeDee" app (not just from Claude Code). Writes are gated by a
// passcode so only the owner can change anything.
//
// The whole board is a SINGLE document (one row, key "board") whose flexible
// `data` object mirrors deedee/ops.json — the eight areas:
//   podcastSchedule{episodes[]}, recordingDays[], publishingCalendar[],
//   speakingInvitations[], prayerRequests[], donations{items[],runningTotal},
//   newsletterSchedule{issues[]}, contentPipeline[]
//
// Prayer requests and donations are sensitive: honor "anonymous"/"private"
// flags in the data; this module stores what it's given and never invents.

const BOARD_KEY = "board";

// ---- passcode gate -------------------------------------------------------
// The expected passcode lives in the Convex environment (not in the code):
//   npx convex env set DEEDEE_PASSCODE "your-passcode"
// If it isn't set, editing is disabled (fail closed).
function assertUnlocked(passcode?: string) {
  const expected = process.env.DEEDEE_PASSCODE;
  if (!expected) {
    throw new Error(
      "Editing isn't turned on yet. Set DEEDEE_PASSCODE in the Convex environment to enable changes."
    );
  }
  if ((passcode || "") !== expected) {
    throw new Error("That passcode isn't right — editing stays locked.");
  }
}

// Optional READ gate. The board holds sensitive prayer requests and donations,
// so reading can be locked behind its own passcode:
//   npx convex env set DEEDEE_READ_PASSCODE "view-code"
// If DEEDEE_READ_PASSCODE isn't set, reading stays OPEN (nothing breaks before
// you opt in). Tip: set it to the same value as DEEDEE_PASSCODE and one code
// both views and edits.
function assertCanRead(passcode?: string) {
  const expected = process.env.DEEDEE_READ_PASSCODE;
  if (!expected) return; // reads open until a read passcode is configured
  if ((passcode || "") !== expected) {
    const err: any = new Error("locked");
    err.data = "locked";
    throw err;
  }
}

function today(): string {
  return new Date(Date.now()).toISOString().slice(0, 10);
}

// A fresh, empty board with all eight areas present.
function blankBoard() {
  return {
    ministry: "Lift Faith — Under the Scope with Pastor Billy Daws",
    owner: "Billy Daws",
    updated: today(),
    podcastSchedule: { cadence: "TODO", episodes: [] },
    recordingDays: [],
    publishingCalendar: [],
    speakingInvitations: [],
    prayerRequests: [],
    donations: { periodLabel: String(new Date(Date.now()).getFullYear()), runningTotal: 0, items: [] },
    newsletterSchedule: { cadence: "TODO", issues: [] },
    contentPipeline: [],
  };
}

// Return the mutable array for an area, creating parents if missing.
function areaList(data: any, area: string): any[] {
  switch (area) {
    case "podcast":
      data.podcastSchedule = data.podcastSchedule || { cadence: "TODO", episodes: [] };
      data.podcastSchedule.episodes = data.podcastSchedule.episodes || [];
      return data.podcastSchedule.episodes;
    case "recording":
      data.recordingDays = data.recordingDays || [];
      return data.recordingDays;
    case "calendar":
      data.publishingCalendar = data.publishingCalendar || [];
      return data.publishingCalendar;
    case "speaking":
      data.speakingInvitations = data.speakingInvitations || [];
      return data.speakingInvitations;
    case "prayer":
      data.prayerRequests = data.prayerRequests || [];
      return data.prayerRequests;
    case "donation":
      data.donations = data.donations || { periodLabel: "", runningTotal: 0, items: [] };
      data.donations.items = data.donations.items || [];
      return data.donations.items;
    case "newsletter":
      data.newsletterSchedule = data.newsletterSchedule || { cadence: "TODO", issues: [] };
      data.newsletterSchedule.issues = data.newsletterSchedule.issues || [];
      return data.newsletterSchedule.issues;
    case "pipeline":
      data.contentPipeline = data.contentPipeline || [];
      return data.contentPipeline;
    default:
      throw new Error(
        `Unknown area "${area}". Use one of: podcast, recording, calendar, speaking, prayer, donation, newsletter, pipeline.`
      );
  }
}

// One-level merge: nested plain objects merge one level deep; everything else
// (scalars, arrays) is replaced.
function mergeItem(base: any, changes: any): any {
  const out = { ...(base || {}) };
  for (const k of Object.keys(changes || {})) {
    const val = (changes as any)[k];
    if (
      val && typeof val === "object" && !Array.isArray(val) &&
      out[k] && typeof out[k] === "object" && !Array.isArray(out[k])
    ) {
      out[k] = { ...out[k], ...val };
    } else {
      out[k] = val;
    }
  }
  return out;
}

// Find the index of an item in an area list from a match object. Supports
// {index: n} or a set of field equalities (case-insensitive string compare).
function findIndex(list: any[], match: any): number {
  if (match && typeof match.index === "number") return match.index;
  const keys = Object.keys(match || {}).filter((k) => k !== "index");
  if (!keys.length) return -1;
  return list.findIndex((item) =>
    keys.every((k) => {
      const a = item ? item[k] : undefined;
      return String(a == null ? "" : a).trim().toLowerCase() ===
        String(match[k] == null ? "" : match[k]).trim().toLowerCase();
    })
  );
}

function recomputeDonationTotal(data: any) {
  if (data && data.donations && Array.isArray(data.donations.items)) {
    data.donations.runningTotal = data.donations.items.reduce(
      (s: number, d: any) => s + (Number(d && d.amount) || 0),
      0
    );
  }
}

async function loadBoardRow(ctx: any) {
  return await ctx.db
    .query("opsBoard")
    .withIndex("by_key", (q: any) => q.eq("key", BOARD_KEY))
    .first();
}

// ---- reads (open) --------------------------------------------------------

// The whole board, in the same shape as deedee/ops.json. Null if not seeded.
// Reading is gated by DEEDEE_READ_PASSCODE when that env var is set (throws
// "locked" on a missing/wrong passcode); otherwise reads are open.
export const getBoard = query({
  args: { passcode: v.optional(v.string()) },
  handler: async (ctx, args) => {
    assertCanRead(args.passcode);
    const row = await loadBoardRow(ctx);
    return row ? row.data : null;
  },
});

// ---- writes (passcode-gated) --------------------------------------------

// Append a new item to one of the eight areas.
export const addItem = mutation({
  args: {
    passcode: v.optional(v.string()),
    area: v.string(),
    item: v.any(),
  },
  handler: async (ctx, args) => {
    assertUnlocked(args.passcode);
    const row = await loadBoardRow(ctx);
    const data = row ? JSON.parse(JSON.stringify(row.data)) : blankBoard();

    const list = areaList(data, args.area);
    list.push(args.item || {});
    if (args.area === "donation") recomputeDonationTotal(data);
    data.updated = today();

    if (row) {
      await ctx.db.patch(row._id, { data, updatedAt: Date.now(), updatedBy: "DeeDee (chat)" });
    } else {
      await ctx.db.insert("opsBoard", {
        key: BOARD_KEY, data, updatedAt: Date.now(), updatedBy: "DeeDee (chat)",
      });
    }
    return data;
  },
});

// Update fields on an existing item in an area, matched by {index} or field(s).
export const patchItem = mutation({
  args: {
    passcode: v.optional(v.string()),
    area: v.string(),
    match: v.any(),
    changes: v.any(),
  },
  handler: async (ctx, args) => {
    assertUnlocked(args.passcode);
    const row = await loadBoardRow(ctx);
    if (!row) throw new Error("The board isn't set up yet — add an item first.");
    const data = JSON.parse(JSON.stringify(row.data));

    const list = areaList(data, args.area);
    const idx = findIndex(list, args.match || {});
    if (idx < 0 || idx >= list.length) {
      throw new Error(`Couldn't find that item in "${args.area}" to update.`);
    }
    list[idx] = mergeItem(list[idx], args.changes || {});
    if (args.area === "donation") recomputeDonationTotal(data);
    data.updated = today();

    await ctx.db.patch(row._id, { data, updatedAt: Date.now(), updatedBy: "DeeDee (chat)" });
    return data;
  },
});

// Set a value at a dotted path within the board (e.g. "podcastSchedule.cadence",
// "newsletterSchedule.cadence", "donations.periodLabel"). Creates intermediate
// objects as needed. Refuses to overwrite one of the eight array areas wholesale.
const PROTECTED_ARRAYS = new Set([
  "podcastSchedule.episodes", "recordingDays", "publishingCalendar",
  "speakingInvitations", "prayerRequests", "donations.items",
  "newsletterSchedule.issues", "contentPipeline",
]);
export const setField = mutation({
  args: {
    passcode: v.optional(v.string()),
    path: v.string(),
    value: v.any(),
  },
  handler: async (ctx, args) => {
    assertUnlocked(args.passcode);
    const path = String(args.path || "").trim();
    if (!path) throw new Error("A path is required.");
    if (PROTECTED_ARRAYS.has(path)) {
      throw new Error(`Use add_item / update_item to change "${path}", not set_field.`);
    }
    const row = await loadBoardRow(ctx);
    const data = row ? JSON.parse(JSON.stringify(row.data)) : blankBoard();

    const parts = path.split(".");
    let node = data;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      if (node[k] == null || typeof node[k] !== "object" || Array.isArray(node[k])) node[k] = {};
      node = node[k];
    }
    node[parts[parts.length - 1]] = args.value;
    data.updated = today();

    if (row) {
      await ctx.db.patch(row._id, { data, updatedAt: Date.now(), updatedBy: "DeeDee (chat)" });
    } else {
      await ctx.db.insert("opsBoard", {
        key: BOARD_KEY, data, updatedAt: Date.now(), updatedBy: "DeeDee (chat)",
      });
    }
    return data;
  },
});

// One-time (idempotent, non-destructive) import from deedee/ops.json. Inserts
// the board only if it isn't already present; never overwrites. Run once after
// deploying, e.g. via the Convex dashboard or:
//   npx convex run ops:seedBoard '{"data": { ...contents of deedee/ops.json... }}'
export const seedBoard = mutation({
  args: { data: v.optional(v.any()) },
  handler: async (ctx, args) => {
    const existing = await loadBoardRow(ctx);
    if (existing) return { seeded: false };
    const data = args.data || blankBoard();
    if (!data.updated) data.updated = today();
    await ctx.db.insert("opsBoard", {
      key: BOARD_KEY, data, updatedAt: Date.now(), updatedBy: "seed",
    });
    return { seeded: true };
  },
});
