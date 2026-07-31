import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Barb's book dashboard, stored in Convex so she can edit it live from the
// "Talk to Barb" app (not just from Claude Code). Writes are gated by a
// passcode so only the owner can change anything.
//
// The nine tracked fields live inside each row's flexible `data` object, in
// the same shape as barb/books.json:
//   status, wordCount{current,target}, cover{...}, isbn{ebook,print},
//   kdp{...}, marketing{...}, launch{...}, bonuses{...}, reviews{...}

// ---- passcode gate -------------------------------------------------------
// The expected passcode lives in the Convex environment (not in the code):
//   npx convex env set BARB_PASSCODE "your-passcode"
// If it isn't set, editing is disabled (fail closed).
function assertUnlocked(passcode?: string) {
  const expected = process.env.BARB_PASSCODE;
  if (!expected) {
    throw new Error(
      "Editing isn't turned on yet. Set BARB_PASSCODE in the Convex environment to enable changes."
    );
  }
  if ((passcode || "") !== expected) {
    throw new Error("That passcode isn't right — editing stays locked.");
  }
}

// Deep-merge a partial change set into an existing book record. Known nested
// objects merge one level deep; everything else (scalars, arrays) is replaced.
const NESTED = ["wordCount", "cover", "isbn", "kdp", "marketing", "launch", "bonuses", "reviews"];
function mergeData(base: any, changes: any): any {
  const out = { ...(base || {}) };
  for (const k of Object.keys(changes || {})) {
    const val = (changes as any)[k];
    if (
      NESTED.includes(k) &&
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

// A fresh, empty book record with all nine fields present (unknowns as TODO).
function blankBook(slug: string, title: string, format: string, targetWords: number, status: string) {
  return {
    slug,
    title,
    author: "Billy Daws",
    format: format || "both",
    status: status || "idea",
    wordCount: { current: 0, target: targetWords || 0 },
    cover: { state: "not started", front: null, printWrap: null, notes: "" },
    isbn: { ebook: "KDP free ISBN", print: "TODO" },
    kdp: { interior: "not started", coverFile: "not started", metadata: "not started", path: `barb/books/${slug}/kdp/` },
    marketing: { blurb: "not started", keywords: [], categories: [], aPlusContent: "not started", price: { ebook: null, print: null } },
    launch: { target: null, checklistDone: 0, checklistTotal: 18 },
    bonuses: { items: [], hostedAt: "TODO", path: `barb/books/${slug}/bonuses/` },
    reviews: { arcTarget: 0, arcCommitted: 0, count: 0, avgRating: null, monitor: [], notes: "" },
  };
}

// ---- reads (open) --------------------------------------------------------

// All books, newest-updated first. Returns just the `data` objects so callers
// get the same shape as books.json.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("books").collect();
    rows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return rows.map((r) => r.data);
  },
});

export const get = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const slug = args.slug.trim().toLowerCase();
    const row = await ctx.db
      .query("books")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    return row ? row.data : null;
  },
});

// ---- writes (passcode-gated) --------------------------------------------

// Add a brand-new book. Fails if the slug already exists.
export const addBook = mutation({
  args: {
    passcode: v.optional(v.string()),
    slug: v.string(),
    title: v.string(),
    format: v.optional(v.string()),
    targetWords: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertUnlocked(args.passcode);
    const slug = args.slug.trim().toLowerCase();
    if (!slug) throw new Error("A slug is required.");

    const existing = await ctx.db
      .query("books")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (existing) throw new Error(`A book with slug "${slug}" already exists.`);

    const data = blankBook(slug, args.title, args.format || "both", args.targetWords || 0, args.status || "idea");
    await ctx.db.insert("books", {
      slug,
      title: args.title,
      status: data.status,
      data,
      updatedAt: Date.now(),
      updatedBy: "Barb (chat)",
    });
    return data;
  },
});

// Patch fields on an existing book. `changes` is a partial record (same shape
// as books.json) — only include what changes. Returns the updated record.
export const patchBook = mutation({
  args: {
    passcode: v.optional(v.string()),
    slug: v.string(),
    changes: v.any(),
  },
  handler: async (ctx, args) => {
    assertUnlocked(args.passcode);
    const slug = args.slug.trim().toLowerCase();
    const row = await ctx.db
      .query("books")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!row) throw new Error(`No book with slug "${slug}". Add it first.`);

    const merged = mergeData(row.data, args.changes || {});
    merged.slug = slug; // never let a patch change the slug
    await ctx.db.patch(row._id, {
      data: merged,
      status: merged.status || row.status,
      title: merged.title || row.title,
      updatedAt: Date.now(),
      updatedBy: "Barb (chat)",
    });
    return merged;
  },
});

// One-time (idempotent, non-destructive) import from books.json. Inserts any
// books whose slug isn't already present; never overwrites. Run once after
// deploying, e.g. via the Convex dashboard or:
//   npx convex run books:seed '{"books": [ ...contents of barb/books.json books array... ]}'
export const seed = mutation({
  args: { books: v.array(v.any()) },
  handler: async (ctx, args) => {
    let added = 0;
    for (const b of args.books) {
      if (!b || !b.slug) continue;
      const slug = String(b.slug).trim().toLowerCase();
      const existing = await ctx.db
        .query("books")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (existing) continue;
      await ctx.db.insert("books", {
        slug,
        title: b.title || slug,
        status: b.status || "idea",
        data: { ...b, slug },
        updatedAt: Date.now(),
        updatedBy: "seed",
      });
      added++;
    }
    return { added };
  },
});
