import { cronJobs } from "convex/server";
import { action } from "./_generated/server";

const crons = cronJobs();

// Daily verse delivery - runs every day at 8:00 AM EST
crons.daily(
  "deliver daily verses",
  {
    hourUTC: 13, // 8 AM EST = 1 PM UTC (EST is UTC-5)
    minuteUTC: 0,
  },
  action(async (ctx) => {
    console.log("Starting daily verse delivery cron job...");

    const result = await ctx.runAction("delivery:deliverVersesToAllUsers", {});

    console.log("Daily verse delivery complete:", result);

    return result;
  })
);

// Check for expiring trials - runs every day at 9:00 AM EST
crons.daily(
  "check expiring trials",
  {
    hourUTC: 14, // 9 AM EST = 2 PM UTC
    minuteUTC: 0,
  },
  action(async (ctx) => {
    console.log("Checking for expiring trials...");

    // Get all users on trial
    const allUsers = await ctx.runQuery("users:getActiveUsers", {});
    const trialUsers = allUsers.filter(u => u.subscriptionStatus === "trial");

    const now = Date.now();
    const twoDays = 2 * 24 * 60 * 60 * 1000;

    let notificationsSent = 0;

    for (const user of trialUsers) {
      if (!user.trialEndsAt) continue;

      const timeUntilExpiry = user.trialEndsAt - now;
      const daysLeft = Math.ceil(timeUntilExpiry / (24 * 60 * 60 * 1000));

      // Send reminder 2 days before trial ends
      if (daysLeft === 2 && timeUntilExpiry > 0 && timeUntilExpiry <= twoDays) {
        try {
          // TODO: Send trial expiring email
          console.log(`Sending trial expiring email to ${user.email} (${daysLeft} days left)`);
          notificationsSent++;
        } catch (error) {
          console.error(`Failed to send trial notification to ${user.email}:`, error);
        }
      }

      // Expire trial if time is up
      if (timeUntilExpiry <= 0) {
        console.log(`Expiring trial for user ${user.email}`);
        // Note: This will need to be a separate internal mutation
        // For now, just log it - we'll handle expiration via Stripe webhooks
      }
    }

    console.log(`Trial check complete. Sent ${notificationsSent} notifications.`);

    return {
      trialUsers: trialUsers.length,
      notificationsSent: notificationsSent,
    };
  })
);

export default crons;
