// api/deedee-brief.js — DeeDee's automated daily calendar brief (email).
//
// DeeDee reaches out to Billy instead of only answering when asked. A Vercel
// Cron (see vercel.json "crons") hits this endpoint twice a day and it emails a
// short, phone-friendly rundown of his calendar:
//   • ?slot=evening — the day before: TOMORROW (+ the day after) — advance warning
//   • ?slot=morning — by 6 AM Eastern: TODAY (+ tomorrow)
//
// It reads Billy's REAL Google Calendar READ-ONLY via api/_gcal.js (the secret
// iCal feed in GCAL_ICS_URL; that URL never leaves the server) and NEVER writes
// to the calendar. Delivery is Resend (same provider the site already uses).
//
// Why a Vercel Cron (not Convex): it deploys automatically on git merge — no
// terminal step — which suits managing the site entirely from the browser/app.
//
// SETUP (Vercel → Settings → Environment Variables, then redeploy):
//   GCAL_ICS_URL     the calendar's Secret iCal address (REQUIRED to see events)
//   RESEND_API_KEY   your Resend key (REQUIRED to send the email)
// Optional:
//   BRIEF_RECIPIENT  who gets it (default billydaws@gmail.com)
//   BRIEF_FROM       from address (default "DeeDee <onboarding@resend.dev>",
//                    Resend's no-setup test sender; set to your verified domain later)
//   SITE_URL         site origin used in the footer link (default liftfaith.com)
//   CRON_SECRET      if set, the endpoint requires it (Vercel Cron sends it
//                    automatically; for a manual browser test add ?key=THE_SECRET)
//   MINISTRY_TZ      time zone for "today"/"tomorrow" (default America/New_York)

let gcal = null;
try {
  gcal = require("./_gcal");
} catch (e) {
  gcal = null; // node-ical unavailable — handled below with an honest message
}

const RECIPIENT = () => process.env.BRIEF_RECIPIENT || "billydaws@gmail.com";
// Default sender is Resend's built-in test address so this works with ZERO domain
// setup: a fresh Resend account can send from onboarding@resend.dev to the email
// you signed up with (billydaws@gmail.com) — no DNS/verification needed. Once the
// liftfaith.com domain is verified in Resend, set BRIEF_FROM in Vercel, e.g.
// "DeeDee <daily@liftfaith.com>", for a branded sender to any recipient.
const FROM = () => process.env.BRIEF_FROM || "DeeDee <onboarding@resend.dev>";
const SITE = () => (process.env.SITE_URL || "https://liftfaith.com").replace(/\/+$/, "");

function esc(s) {
  return String(s == null ? "" : s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

// "3:00 PM" for an ISO instant in the calendar's time zone.
function timeIn(tz, iso) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch (e) {
    return "";
  }
}

// One day's events as HTML, with a back-to-back heads-up when timed events touch.
function dayBlockHtml(day, tz, heading) {
  if (!day) return "";

  let rows;
  if (!day.events.length) {
    rows = '<p style="margin:6px 0 0;color:#555;">Clear — nothing scheduled. 🎉</p>';
  } else {
    rows = day.events
      .map((e) => {
        const loc = e.location
          ? ' <span style="color:#8B1538;">@ ' + esc(e.location) + "</span>"
          : "";
        const endLbl = !e.allDay && e.end ? timeIn(tz, e.end) : "";
        const time = e.allDay
          ? "All day"
          : esc(e.timeLabel) + (endLbl ? "–" + esc(endLbl) : "");
        return (
          '<div style="margin:8px 0;"><strong>' +
          time +
          "</strong> — " +
          esc(e.summary) +
          loc +
          "</div>"
        );
      })
      .join("");
  }

  // Back-to-back / overlap detection among timed events (already start-sorted).
  const timed = day.events.filter((e) => !e.allDay);
  const clashes = [];
  for (let i = 1; i < timed.length; i++) {
    const prevEnd = Date.parse(timed[i - 1].end);
    const curStart = Date.parse(timed[i].start);
    if (!Number.isNaN(prevEnd) && !Number.isNaN(curStart) && curStart <= prevEnd) {
      clashes.push(esc(timed[i].timeLabel));
    }
  }
  const heads = clashes.length
    ? '<p style="margin:10px 0 0;padding:8px 12px;background:#fff9e6;border-left:4px solid #FFA500;border-radius:4px;">⏱️ <strong>Heads-up:</strong> back-to-back at ' +
      clashes.join(", ") +
      ".</p>"
    : "";

  return (
    '<div style="margin:22px 0 0;">' +
    '<h2 style="font-size:1.05rem;color:#8B1538;margin:0 0 4px;">' +
    esc(heading) +
    " — " +
    esc(day.label) +
    "</h2>" +
    rows +
    heads +
    "</div>"
  );
}

function buildEmail(slot, win) {
  const tz = (win && win.timeZone) || "America/New_York";
  const morning = slot !== "evening";
  const subject = morning
    ? "☀️ Your day at a glance — DeeDee's morning brief"
    : "🌙 Tomorrow at a glance — DeeDee's evening preview";
  const greeting = morning
    ? "Good morning, Pastor Billy! ☀️"
    : "Evening, Pastor Billy! 🌙";
  const intro = morning
    ? "Here's what's on tap today, with a look ahead at tomorrow."
    : "A heads-up on what tomorrow holds, so nothing sneaks up on you.";

  let body;
  if (!win || !win.configured) {
    body =
      '<p style="padding:12px;background:#fff3f3;border-left:4px solid #8B1538;border-radius:4px;">' +
      "⚠️ I couldn't read your Google Calendar — it may not be linked to the site yet, so I can't show " +
      "your appointments. (Add <code>GCAL_ICS_URL</code> in Vercel to connect it.) I won't guess or tell " +
      "you it's clear when I can't actually see it.</p>";
  } else if (win.error) {
    body =
      '<p style="padding:12px;background:#fff3f3;border-left:4px solid #8B1538;border-radius:4px;">' +
      "⚠️ I couldn't reach your calendar just now (" +
      esc(win.error) +
      "). I'd rather tell you than pretend it's empty — I'll try again next time.</p>";
  } else if (morning) {
    body =
      dayBlockHtml(win.days[0], tz, "Today") +
      dayBlockHtml(win.days[1], tz, "Tomorrow");
  } else {
    body =
      dayBlockHtml(win.days[1], tz, "Tomorrow") +
      dayBlockHtml(win.days[2], tz, "The day after");
  }

  const host = SITE().replace(/^https?:\/\//, "");
  const html =
    '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#333;background:#f4f4f7;">' +
    '<div style="max-width:600px;margin:0 auto;padding:20px;">' +
    '<div style="background:linear-gradient(135deg,#8B1538 0%,#5C0F28 100%);color:#fff;padding:26px 20px;text-align:center;border-radius:10px 10px 0 0;">' +
    '<h1 style="margin:0;font-size:1.5rem;">DeeDee\'s Brief</h1>' +
    '<p style="margin:6px 0 0;opacity:.9;">Lift Faith · Under the Scope</p></div>' +
    '<div style="background:#fff;padding:26px;border:1px solid #ddd;border-top:none;border-radius:0 0 10px 10px;">' +
    '<p style="margin:0 0 4px;font-weight:bold;">' +
    greeting +
    "</p>" +
    '<p style="margin:0;color:#555;">' +
    intro +
    "</p>" +
    body +
    '<p style="margin:26px 0 0;color:#999;font-size:.85rem;border-top:1px solid #eee;padding-top:14px;">' +
    "A read-only view of your Google Calendar — DeeDee never changes your calendar. " +
    'Talk to her anytime at <a href="' +
    SITE() +
    '/deedee" style="color:#8B1538;">' +
    host +
    "/deedee</a>.</p></div></div></body></html>";

  return { subject, html };
}

async function sendEmail(to, subject, html) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not configured");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + key,
    },
    body: JSON.stringify({ from: FROM(), to: [to], subject, html }),
  });
  if (!r.ok) {
    const detail = await r.text();
    throw new Error("Resend HTTP " + r.status + ": " + detail);
  }
  return r.json();
}

// Only Vercel Cron (or someone with the secret) may trigger a send, if a secret
// is configured. If CRON_SECRET is unset, the endpoint is open (worst case: it
// emails Billy his own schedule) so it works before that hardening step.
function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (auth && auth === "Bearer " + secret) return true;
  try {
    const u = new URL(req.url, "http://x");
    if (u.searchParams.get("key") === secret) return true;
  } catch (e) {
    /* ignore */
  }
  return false;
}

module.exports = async (req, res) => {
  res.setHeader("cache-control", "no-store");

  if (!authorized(req)) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  let slot = "morning";
  try {
    const u = new URL(req.url, "http://x");
    if (u.searchParams.get("slot") === "evening") slot = "evening";
  } catch (e) {
    /* keep default */
  }

  // Read the calendar window (3 days so the evening preview can peek ahead).
  let win = { configured: false, days: [] };
  if (gcal) {
    try {
      win = await gcal.getWindow({ days: 3 });
    } catch (e) {
      win = { configured: !!process.env.GCAL_ICS_URL, error: String((e && e.message) || e), days: [] };
    }
  }

  const { subject, html } = buildEmail(slot, win);

  try {
    await sendEmail(RECIPIENT(), subject, html);
  } catch (e) {
    res.status(502).json({ ok: false, slot, error: String((e && e.message) || e) });
    return;
  }

  res.status(200).json({
    ok: true,
    slot,
    to: RECIPIENT(),
    calendarConfigured: !!win.configured,
    days: (win.days && win.days.length) || 0,
  });
};
