import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - stores all user information
  users: defineTable({
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),

    // User preferences
    versesPerDay: v.number(), // 2, 4, or 6
    deliveryTime: v.string(), // "morning" or "evening"
    deliveryMethod: v.string(), // "email" or "sms"

    // User struggles and goals
    struggles: v.array(v.string()), // ["anxiety", "temptation", etc.]
    goals: v.array(v.string()), // ["prayer", "bible-study", etc.]
    customStruggles: v.optional(v.string()),
    customGoals: v.optional(v.string()),

    // Subscription info
    subscriptionStatus: v.string(), // "trial", "active", "canceled", "expired"
    subscriptionTier: v.string(), // "basic" or "premium"
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    trialEndsAt: v.optional(v.number()), // timestamp

    // Metadata
    createdAt: v.number(),
    lastVerseDeliveredAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_stripe_customer", ["stripeCustomerId"]),

  // Verses table - our Scripture database
  verses: defineTable({
    reference: v.string(), // "John 3:16"
    text: v.string(), // The actual verse text
    translation: v.string(), // "NKJV", "NIV", etc.
    categories: v.array(v.string()), // ["anxiety", "fear", "hope", etc.]
    tags: v.array(v.string()), // Additional tags for matching
  })
    .index("by_category", ["categories"]),

  // Delivery log - track what verses were sent to whom
  deliveries: defineTable({
    userId: v.id("users"),
    verseId: v.id("verses"),
    deliveredAt: v.number(),
    deliveryMethod: v.string(), // "email" or "sms"
    status: v.string(), // "sent", "failed", "bounced"
  })
    .index("by_user", ["userId"])
    .index("by_delivered_at", ["deliveredAt"]),

  // Workshop panels - custom "areas" a user adds to their Main Workshop
  // dashboard, keyed by a personal sync key (their email) so they follow
  // the user across devices.
  workshopPanels: defineTable({
    syncKey: v.string(), // normalized email / personal sync code
    panels: v.array(
      v.object({
        id: v.string(),
        icon: v.string(),
        title: v.string(),
        subtitle: v.string(),
        links: v.array(
          v.object({
            emoji: v.string(),
            label: v.string(),
            url: v.string(),
          })
        ),
      })
    ),
    updatedAt: v.number(),
  }).index("by_syncKey", ["syncKey"]),

  // Prayer requests (for community feature - future)
  prayerRequests: defineTable({
    userId: v.id("users"),
    content: v.string(),
    isAnonymous: v.boolean(),
    prayerCount: v.number(),
    createdAt: v.number(),
    status: v.string(), // "active", "answered", "archived"
  })
    .index("by_created_at", ["createdAt"])
    .index("by_status", ["status"]),
});
