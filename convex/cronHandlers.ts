import { internalAction } from "./_generated/server";

// Handler for daily verse delivery cron
export const deliverDailyVerses = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Starting daily verse delivery cron job...");

    const result = await ctx.runAction("delivery:deliverVersesToAllUsers", {});

    console.log("Daily verse delivery complete:", result);

    return result;
  },
});

// Handler for checking expiring trials
export const checkExpiringTrials = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Checking for expiring trials...");

    // Get all users on trial
    const allUsers = await ctx.runQuery("users:getActiveUsers", {});
    const trialUsers = allUsers.filter((u) => u.subscriptionStatus === "trial");

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
          console.log(
            `Sending trial expiring email to ${user.email} (${daysLeft} days left)`
          );
          notificationsSent++;
        } catch (error) {
          console.error(
            `Failed to send trial notification to ${user.email}:`,
            error
          );
        }
      }

      // Expire trial if time is up
      if (timeUntilExpiry <= 0) {
        console.log(`Expiring trial for user ${user.email}`);
        // Note: This will be handled via Stripe webhooks in production
      }
    }

    console.log(
      `Trial check complete. Sent ${notificationsSent} notifications.`
    );

    return {
      trialUsers: trialUsers.length,
      notificationsSent: notificationsSent,
    };
  },
});
