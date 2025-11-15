import { action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Get personalized verses for a user based on their struggles and goals
export const getPersonalizedVerses = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Combine user's struggles and goals into categories to match
    const categories = [...user.struggles, ...user.goals];

    // Get all verses
    const allVerses = await ctx.db.query("verses").collect();

    // Filter verses that match user's categories
    let matchedVerses = allVerses.filter((verse) =>
      verse.categories.some((cat) => categories.includes(cat))
    );

    // If not enough matches, add some general encouragement verses
    if (matchedVerses.length < user.versesPerDay) {
      const generalVerses = allVerses.filter((verse) =>
        verse.categories.some((cat) =>
          ["hope", "strength", "encouragement", "love"].includes(cat)
        )
      );
      matchedVerses = [...matchedVerses, ...generalVerses];
    }

    // Get verses user hasn't received recently (check last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentDeliveries = await ctx.db
      .query("deliveries")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("deliveredAt"), sevenDaysAgo))
      .collect();

    const recentVerseIds = new Set(
      recentDeliveries.map((d) => d.verseId.toString())
    );

    // Filter out recently delivered verses
    let availableVerses = matchedVerses.filter(
      (v) => !recentVerseIds.has(v._id.toString())
    );

    // If still not enough, use all matched verses
    if (availableVerses.length < user.versesPerDay) {
      availableVerses = matchedVerses;
    }

    // Shuffle and select the requested number
    const shuffled = availableVerses.sort(() => Math.random() - 0.5);
    const selectedVerses = shuffled.slice(0, user.versesPerDay);

    return selectedVerses;
  },
});

// Log verse delivery
export const logDelivery = internalMutation({
  args: {
    userId: v.id("users"),
    verseId: v.id("verses"),
    deliveryMethod: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("deliveries", {
      userId: args.userId,
      verseId: args.verseId,
      deliveredAt: Date.now(),
      deliveryMethod: args.deliveryMethod,
      status: args.status,
    });
  },
});

// Update user's last delivery time
export const updateLastDelivery = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      lastVerseDeliveredAt: Date.now(),
    });
  },
});

// Deliver verses to a single user
export const deliverVersesToUser = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.runQuery("users:getUserInternal", { userId: args.userId });

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user is active (trial or paid)
    if (user.subscriptionStatus !== "trial" && user.subscriptionStatus !== "active") {
      console.log(`Skipping user ${user.email} - subscription not active`);
      return { success: false, reason: "subscription_inactive" };
    }

    // Check if trial has expired
    if (user.subscriptionStatus === "trial" && user.trialEndsAt) {
      if (Date.now() > user.trialEndsAt) {
        console.log(`Skipping user ${user.email} - trial expired`);
        return { success: false, reason: "trial_expired" };
      }
    }

    // Get personalized verses
    const verses = await ctx.runQuery("delivery:getPersonalizedVerses", {
      userId: args.userId,
    });

    if (verses.length === 0) {
      throw new Error("No verses available for user");
    }

    // Calculate day number (days since signup)
    const daysSinceSignup = Math.floor(
      (Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)
    );
    const dayNumber = daysSinceSignup + 1;

    // Format verses for email
    const formattedVerses = verses.map((v) => ({
      reference: v.reference,
      text: v.text,
      translation: v.translation,
    }));

    try {
      // Send email
      await ctx.runAction("emails:sendDailyVersesEmail", {
        userId: args.userId,
        verses: formattedVerses,
        dayNumber: dayNumber,
      });

      // Log each verse delivery
      for (const verse of verses) {
        await ctx.runMutation("delivery:logDelivery", {
          userId: args.userId,
          verseId: verse._id,
          deliveryMethod: user.deliveryMethod,
          status: "sent",
        });
      }

      // Update last delivery time
      await ctx.runMutation("delivery:updateLastDelivery", {
        userId: args.userId,
      });

      return { success: true, versesCount: verses.length };
    } catch (error) {
      console.error(`Failed to deliver verses to ${user.email}:`, error);

      // Log failed delivery
      for (const verse of verses) {
        await ctx.runMutation("delivery:logDelivery", {
          userId: args.userId,
          verseId: verse._id,
          deliveryMethod: user.deliveryMethod,
          status: "failed",
        });
      }

      throw error;
    }
  },
});

// Deliver verses to all active users (called by cron)
export const deliverVersesToAllUsers = action({
  args: {},
  handler: async (ctx) => {
    // Get all active users
    const users = await ctx.runQuery("users:getActiveUsers", {});

    console.log(`Starting daily delivery to ${users.length} users`);

    let successCount = 0;
    let failureCount = 0;
    const results = [];

    for (const user of users) {
      try {
        const result = await ctx.runAction("delivery:deliverVersesToUser", {
          userId: user._id,
        });

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }

        results.push({
          userId: user._id,
          email: user.email,
          ...result,
        });
      } catch (error) {
        failureCount++;
        console.error(`Error delivering to user ${user.email}:`, error);
        results.push({
          userId: user._id,
          email: user.email,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log(
      `Daily delivery complete: ${successCount} successful, ${failureCount} failed`
    );

    return {
      totalUsers: users.length,
      successful: successCount,
      failed: failureCount,
      results: results,
    };
  },
});
