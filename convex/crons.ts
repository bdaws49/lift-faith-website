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

// DeeDee's morning calendar brief - by 6:00 AM Eastern.
// 10:00 UTC = 6 AM EDT (summer) / 5 AM EST (winter) — always at or before 6 AM
// Eastern, so it satisfies "by 6 o'clock each morning" year-round without a
// DST fix. Covers today + tomorrow.
crons.daily(
  "deedee morning brief",
  {
    hourUTC: 10,
    minuteUTC: 0,
  },
  internal.deedeeBrief.sendCalendarBrief,
  { slot: "morning" }
);

// DeeDee's evening preview - the day before, for advance warning.
// 22:00 UTC = 6 PM EDT (summer) / 5 PM EST (winter). Covers tomorrow + the day after.
crons.daily(
  "deedee evening preview",
  {
    hourUTC: 22,
    minuteUTC: 0,
  },
  internal.deedeeBrief.sendCalendarBrief,
  { slot: "evening" }
);

export default crons;
