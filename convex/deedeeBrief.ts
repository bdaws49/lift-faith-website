// convex/deedeeBrief.ts
// DeeDee's automated calendar brief — emailed to Billy so he gets ADVANCE
// WARNING of what's on tap, without having to open the /deedee page.
//
// Two sends per day (scheduled in convex/crons.ts):
//   • "evening"  — the day before: a preview of TOMORROW (+ the day after).
//   • "morning"  — by 6 AM Eastern: TODAY's plan (+ tomorrow as advance warning).
//
// It reads Billy's REAL Google Calendar READ-ONLY by fetching the site's own
// /api/calendar endpoint, which parses the secret iCal feed server-side via
// api/_gcal.js (the secret URL never leaves the server). Nothing here ever
// writes to the calendar. Delivery reuses the existing Resend email action
// (emails:sendEmail) — the same pipe that already sends the daily verses.
//
// Env (set in the Convex deployment):
//   SITE_URL         default https://liftfaith.com   (where /api/calendar lives)
//   BRIEF_RECIPIENT  default billydaws@gmail.com      (who receives the brief)
// Also relies on RESEND_API_KEY (already used for daily verses) and, for real
// data, GCAL_ICS_URL set in Vercel (see TALK-TO-DEEDEE-SETUP.md).

import { internalAction } from "./_generated/server";
import { v } from "convex/values";

const siteUrl = () =>
  (process.env.SITE_URL || "https://liftfaith.com").replace(/\/+$/, "");
const recipient = () => process.env.BRIEF_RECIPIENT || "billydaws@gmail.com";

type CalEvent = {
  summary: string;
  location: string;
  allDay: boolean;
  start: string;
  end: string;
  timeLabel: string;
};
type CalDay = {
  date: number;
  label: string;
  isToday: boolean;
  events: CalEvent[];
};
type CalWindow = {
  configured: boolean;
  timeZone?: string;
  error?: string;
  days: CalDay[];
};

// Fetch the parsed calendar window (today + N-1 days) from the site endpoint.
async function fetchWindow(days: number): Promise<CalWindow> {
  const url = `${siteUrl()}/api/calendar?days=${days}`;
  const r = await fetch(url, { headers: { "user-agent": "DeeDee-Brief/1.0" } });
  if (!r.ok) throw new Error(`calendar endpoint HTTP ${r.status}`);
  return (await r.json()) as CalWindow;
}

function esc(s: unknown): string {
  return String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string)
  );
}

// "3:00 PM" for an ISO instant in the calendar's time zone.
function timeIn(tz: string, iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

// Render one day's events as HTML, with a back-to-back heads-up when timed
// events touch or overlap.
function dayBlockHtml(day: CalDay | undefined, tz: string, heading: string): string {
  if (!day) return "";

  let rows: string;
  if (!day.events.length) {
    rows = `<p style="margin:6px 0 0;color:#555;">Clear — nothing scheduled. 🎉</p>`;
  } else {
    rows = day.events
      .map((e) => {
        const loc = e.location
          ? ` <span style="color:#8B1538;">@ ${esc(e.location)}</span>`
          : "";
        const endLbl = !e.allDay && e.end ? timeIn(tz, e.end) : "";
        const time = e.allDay
          ? "All day"
          : `${esc(e.timeLabel)}${endLbl ? "–" + esc(endLbl) : ""}`;
        return `<div style="margin:8px 0;"><strong>${time}</strong> — ${esc(
          e.summary
        )}${loc}</div>`;
      })
      .join("");
  }

  // Back-to-back / overlap detection among timed events (already start-sorted).
  const timed = day.events.filter((e) => !e.allDay);
  const clashes: string[] = [];
  for (let i = 1; i < timed.length; i++) {
    const prevEnd = Date.parse(timed[i - 1].end);
    const curStart = Date.parse(timed[i].start);
    if (!Number.isNaN(prevEnd) && !Number.isNaN(curStart) && curStart <= prevEnd) {
      clashes.push(esc(timed[i].timeLabel));
    }
  }
  const heads = clashes.length
    ? `<p style="margin:10px 0 0;padding:8px 12px;background:#fff9e6;border-left:4px solid #FFA500;border-radius:4px;">⏱️ <strong>Heads-up:</strong> back-to-back at ${clashes.join(
        ", "
      )}.</p>`
    : "";

  return `<div style="margin:22px 0 0;">
    <h2 style="font-size:1.05rem;color:#8B1538;margin:0 0 4px;">${esc(heading)} — ${esc(
    day.label
  )}</h2>
    ${rows}
    ${heads}
  </div>`;
}

function buildEmail(slot: "morning" | "evening", win: CalWindow): {
  subject: string;
  html: string;
} {
  const tz = win.timeZone || "America/New_York";
  const morning = slot === "morning";
  const subject = morning
    ? "☀️ Your day at a glance — DeeDee's morning brief"
    : "🌙 Tomorrow at a glance — DeeDee's evening preview";
  const greeting = morning
    ? "Good morning, Pastor Billy! ☀️"
    : "Evening, Pastor Billy! 🌙";
  const intro = morning
    ? "Here's what's on tap today, with a look ahead at tomorrow."
    : "A heads-up on what tomorrow holds, so nothing sneaks up on you.";

  let body: string;
  if (!win.configured) {
    body = `<p style="padding:12px;background:#fff3f3;border-left:4px solid #8B1538;border-radius:4px;">
      ⚠️ I couldn't read your Google Calendar — it may not be linked to the site yet, so I can't show your
      appointments. (Add <code>GCAL_ICS_URL</code> in Vercel to connect it.) I won't guess or tell you it's
      clear when I can't actually see it.</p>`;
  } else if (win.error) {
    body = `<p style="padding:12px;background:#fff3f3;border-left:4px solid #8B1538;border-radius:4px;">
      ⚠️ I couldn't reach your calendar just now (${esc(
        win.error
      )}). I'd rather tell you than pretend it's empty — I'll try again next time.</p>`;
  } else if (morning) {
    body =
      dayBlockHtml(win.days[0], tz, "Today") +
      dayBlockHtml(win.days[1], tz, "Tomorrow");
  } else {
    body =
      dayBlockHtml(win.days[1], tz, "Tomorrow") +
      dayBlockHtml(win.days[2], tz, "The day after");
  }

  const host = siteUrl().replace(/^https?:\/\//, "");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#333;background:#f4f4f7;">
    <div style="max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:linear-gradient(135deg,#8B1538 0%,#5C0F28 100%);color:#fff;padding:26px 20px;text-align:center;border-radius:10px 10px 0 0;">
        <h1 style="margin:0;font-size:1.5rem;">DeeDee's Brief</h1>
        <p style="margin:6px 0 0;opacity:.9;">Lift Faith · Under the Scope</p>
      </div>
      <div style="background:#fff;padding:26px;border:1px solid #ddd;border-top:none;border-radius:0 0 10px 10px;">
        <p style="margin:0 0 4px;font-weight:bold;">${greeting}</p>
        <p style="margin:0;color:#555;">${intro}</p>
        ${body}
        <p style="margin:26px 0 0;color:#999;font-size:.85rem;border-top:1px solid #eee;padding-top:14px;">
          A read-only view of your Google Calendar — DeeDee never changes your calendar.
          Talk to her anytime at <a href="${siteUrl()}/deedee" style="color:#8B1538;">${host}/deedee</a>.
        </p>
      </div>
    </div>
  </body></html>`;

  return { subject, html };
}

// Scheduled by convex/crons.ts (and safe to run on demand for testing).
export const sendCalendarBrief = internalAction({
  args: { slot: v.string() },
  handler: async (ctx, args) => {
    const slot: "morning" | "evening" =
      args.slot === "evening" ? "evening" : "morning";

    let win: CalWindow;
    try {
      // Fetch 3 days so the evening preview can also peek at the day after.
      win = await fetchWindow(3);
    } catch (e) {
      win = {
        configured: true,
        error: String((e as { message?: string })?.message || e),
        days: [],
      };
    }

    const { subject, html } = buildEmail(slot, win);
    await ctx.runAction("emails:sendEmail", {
      to: recipient(),
      subject,
      html,
    });

    return {
      slot,
      sent: true,
      configured: win.configured,
      days: win.days?.length || 0,
    };
  },
});
