import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Create a new user (called from signup form)
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    versesPerDay: v.number(),
    deliveryTime: v.string(),
    deliveryMethod: v.string(),
    struggles: v.array(v.string()),
    goals: v.array(v.string()),
    customStruggles: v.optional(v.string()),
    customGoals: v.optional(v.string()),
    subscriptionTier: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Calculate trial end date (7 days from now)
    const trialEndsAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    // Create user with trial status
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      phone: args.phone,
      versesPerDay: args.versesPerDay,
      deliveryTime: args.deliveryTime,
      deliveryMethod: args.deliveryMethod,
      struggles: args.struggles,
      goals: args.goals,
      customStruggles: args.customStruggles,
      customGoals: args.customGoals,
      subscriptionStatus: "trial",
      subscriptionTier: args.subscriptionTier,
      trialEndsAt: trialEndsAt,
      createdAt: Date.now(),
    });

    return userId;
  },
});

// Get user by email
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Get user by ID
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Get user by ID (internal version for use in actions)
export const getUserInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Update user subscription status (called by Stripe webhook)
export const updateSubscription = mutation({
  args: {
    email: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    subscriptionStatus: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      subscriptionStatus: args.subscriptionStatus,
    });

    return user._id;
  },
});

// Get all active users (for sending daily verses)
export const getActiveUsers = query({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();

    // Filter for users with active or trial subscriptions
    return allUsers.filter(
      (user) =>
        user.subscriptionStatus === "active" ||
        user.subscriptionStatus === "trial"
    );
  },
});

// Update user profile
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    struggles: v.optional(v.array(v.string())),
    goals: v.optional(v.array(v.string())),
    versesPerDay: v.optional(v.number()),
    deliveryTime: v.optional(v.string()),
    deliveryMethod: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    await ctx.db.patch(userId, updates);
    return userId;
  },
});
