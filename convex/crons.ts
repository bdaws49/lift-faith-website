import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily verse delivery - runs every day at 8:00 AM EST
crons.daily(
  "deliver daily verses",
  {
    hourUTC: 13, // 8 AM EST = 1 PM UTC (EST is UTC-5)
    minuteUTC: 0,
  },
  internal.cronHandlers.deliverDailyVerses
);

// Check for expiring trials - runs every day at 9:00 AM EST
crons.daily(
  "check expiring trials",
  {
    hourUTC: 14, // 9 AM EST = 2 PM UTC
    minuteUTC: 0,
  },
  internal.cronHandlers.checkExpiringTrials
);

export default crons;
