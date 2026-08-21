// api/calendar.js — serves Billy's Google Calendar (today + a few days) as JSON
// for the Talk to DeeDee page and the operations board to display.
//
// Reads the calendar server-side from GCAL_ICS_URL (the Secret iCal address).
// The secret URL never leaves the server — only the parsed events are returned.
// READ-ONLY. See api/_gcal.js and TALK-TO-DEEDEE-SETUP.md.

let gcal = null;
try {
  gcal = require("./_gcal");
} catch (e) {
  gcal = null;
}

module.exports = async (req, res) => {
  res.setHeader("cache-control", "no-store");

  if (!gcal) {
    res.status(200).json({ configured: false, days: [] });
    return;
  }

  // Optional ?days=N (default 2 = today + tomorrow), clamped 1..7.
  let days = 2;
  try {
    const u = new URL(req.url, "http://x");
    const q = parseInt(u.searchParams.get("days") || "2", 10);
    if (!Number.isNaN(q)) days = Math.max(1, Math.min(7, q));
  } catch (e) { /* keep default */ }

  try {
    const win = await gcal.getWindow({ days });
    res.status(200).json(win);
  } catch (e) {
    res.status(200).json({
      configured: !!process.env.GCAL_ICS_URL,
      error: String((e && e.message) || e),
      days: [],
    });
  }
};
