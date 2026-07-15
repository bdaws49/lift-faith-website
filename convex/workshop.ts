import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Shape of a single link inside a workshop panel
const linkValidator = v.object({
  emoji: v.string(),
  label: v.string(),
  url: v.string(),
  note: v.optional(v.string()),
});

// Shape of a single custom workshop panel ("area")
const panelValidator = v.object({
  id: v.string(),
  icon: v.string(),
  title: v.string(),
  subtitle: v.string(),
  links: v.array(linkValidator),
});

// Normalize a sync key so "Billy@Email.com " and "billy@email.com" match.
function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

// Fetch the custom workshop panels for a given sync key.
export const getPanels = query({
  args: { syncKey: v.string() },
  handler: async (ctx, args) => {
    const key = normalizeKey(args.syncKey);
    if (!key) return [];

    const doc = await ctx.db
      .query("workshopPanels")
      .withIndex("by_syncKey", (q) => q.eq("syncKey", key))
      .first();

    return doc ? doc.panels : [];
  },
});

// Save (upsert) the full set of custom workshop panels for a sync key.
export const savePanels = mutation({
  args: {
    syncKey: v.string(),
    panels: v.array(panelValidator),
  },
  handler: async (ctx, args) => {
    const key = normalizeKey(args.syncKey);
    if (!key) {
      throw new Error("A sync key (email) is required to save panels.");
    }

    const existing = await ctx.db
      .query("workshopPanels")
      .withIndex("by_syncKey", (q) => q.eq("syncKey", key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        panels: args.panels,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("workshopPanels", {
      syncKey: key,
      panels: args.panels,
      updatedAt: Date.now(),
    });
  },
});
