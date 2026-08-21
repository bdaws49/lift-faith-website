// api/_gcal.js — shared Google Calendar reader for DeeDee.
//
// Reads your calendar server-side from its private "Secret iCal address"
// (Google Calendar → Settings → your calendar → Integrate calendar → "Secret
// address in iCal format"). Store that URL as the GCAL_ICS_URL environment
// variable in Vercel. Nothing here is sent to the browser except the parsed,
// upcoming events; the secret URL stays on the server.
//
// Optional env:
//   MINISTRY_TZ = America/New_York   (IANA tz used for "today"/"tomorrow" boundaries)
//
// This is READ-ONLY. It only fetches and parses; it never writes to the calendar.

const ical = require("node-ical");

const DEFAULT_TZ = process.env.MINISTRY_TZ || "America/New_York";

// --- timezone helpers (no external tz lib needed) -------------------------

// Offset (ms) such that: wallClockAsIfUTC(ms, tz) - ms === offset.
function tzOffsetMs(tz, ms) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const map = {};
  for (const p of dtf.formatToParts(new Date(ms))) map[p.type] = p.value;
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0; // some engines emit 24 for midnight
  const asUTC = Date.UTC(+map.year, +map.month - 1, +map.day, hour, +map.minute, +map.second);
  return asUTC - ms;
}

// UTC instant (ms) for the given wall-clock components in tz (DST-correct).
function zonedComponentsToMs(tz, y, mo, d, h = 0, mi = 0, s = 0) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  let inst = guess - tzOffsetMs(tz, guess);
  inst = guess - tzOffsetMs(tz, inst); // one refinement handles the DST edge
  return inst;
}

// The calendar Y/M/D shown in tz for an absolute instant.
function ymdInTz(tz, ms) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  });
  const map = {};
  for (const p of dtf.formatToParts(new Date(ms))) map[p.type] = p.value;
  return { y: +map.year, m: +map.month, d: +map.day };
}

// "3:00 PM" for a timed instant in tz.
function timeLabel(tz, ms) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true,
  }).format(new Date(ms));
}

// "Friday, Aug 21" for a day.
function dayLabel(tz, ms) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz, weekday: "long", month: "short", day: "numeric",
  }).format(new Date(ms));
}

// --- ICS all-day handling -------------------------------------------------
// node-ical parses all-day DATE values as Dates at UTC midnight and marks
// datetype === "date". For those we compare by calendar date (UTC getters),
// not by absolute instant, so a tz offset can't shift the day.

function dateIntUTC(dateObj) {
  return dateObj.getUTCFullYear() * 10000 + (dateObj.getUTCMonth() + 1) * 100 + dateObj.getUTCDate();
}
function dateIntFromYmd(y, m, d) { return y * 10000 + m * 100 + d; }

// --- fetch ----------------------------------------------------------------

async function fetchIcs(url) {
  const target = url || process.env.GCAL_ICS_URL;
  if (!target) return null;
  const r = await fetch(target, { headers: { "user-agent": "DeeDee/1.0 (+liftfaith.com)" } });
  if (!r.ok) throw new Error("Calendar fetch failed: HTTP " + r.status);
  return await r.text();
}

// --- main -----------------------------------------------------------------

// Returns { configured, timeZone, days: [{ date, label, isToday, events: [...] }] }
// covering `days` calendar days starting today, in `timeZone`. Each event:
//   { summary, location, allDay, startMs, endMs, timeLabel, sortKey }
// Pass { icsText } to parse a string directly (used by tests); otherwise it
// fetches GCAL_ICS_URL. Pass { nowMs } to pin "now" (tests).
async function getWindow(opts = {}) {
  const timeZone = opts.timeZone || DEFAULT_TZ;
  const days = Math.max(1, Math.min(14, opts.days || 2));
  const nowMs = typeof opts.nowMs === "number" ? opts.nowMs : Date.now();

  let icsText = opts.icsText;
  if (icsText == null) {
    try {
      icsText = await fetchIcs(opts.url);
    } catch (e) {
      return { configured: !!(opts.url || process.env.GCAL_ICS_URL), error: String(e.message || e), timeZone, days: [] };
    }
  }
  if (icsText == null) return { configured: false, timeZone, days: [] };

  const parsed = ical.sync.parseICS(icsText);

  // Day boundaries (absolute instants) and the target calendar dates.
  const t = ymdInTz(timeZone, nowMs);
  const bounds = [];
  const dayMeta = [];
  for (let i = 0; i <= days; i++) {
    bounds.push(zonedComponentsToMs(timeZone, t.y, t.m, t.d + i));
  }
  for (let i = 0; i < days; i++) {
    const ymd = ymdInTz(timeZone, bounds[i] + 60000); // +1min avoids DST-midnight ambiguity
    dayMeta.push({
      startMs: bounds[i], endMs: bounds[i + 1],
      dateInt: dateIntFromYmd(ymd.y, ymd.m, ymd.d),
      label: dayLabel(timeZone, bounds[i] + 60000),
      isToday: i === 0,
      events: [],
    });
  }
  const windowStart = bounds[0];
  const windowEnd = bounds[days];

  function pushTimed(summary, location, startMs, endMs) {
    if (endMs <= windowStart || startMs >= windowEnd) return;
    for (const dm of dayMeta) {
      if (startMs < dm.endMs && endMs > dm.startMs) {
        dm.events.push({
          summary: summary || "(no title)", location: location || "",
          allDay: false, startMs, endMs,
          timeLabel: timeLabel(timeZone, startMs), sortKey: startMs,
        });
      }
    }
  }
  function pushAllDay(summary, location, startDate, endDate) {
    // end is exclusive; a single all-day event has end = start + 1 day.
    const startInt = dateIntUTC(startDate);
    const endObj = endDate ? new Date(endDate.getTime() - 1) : startDate; // inclusive last day
    const endInt = dateIntUTC(endObj);
    for (const dm of dayMeta) {
      if (dm.dateInt >= startInt && dm.dateInt <= endInt) {
        dm.events.push({
          summary: summary || "(no title)", location: location || "",
          allDay: true, startMs: dm.startMs, endMs: dm.endMs,
          timeLabel: "All day", sortKey: -1,
        });
      }
    }
  }

  for (const key of Object.keys(parsed)) {
    const ev = parsed[key];
    if (!ev || ev.type !== "VEVENT") continue;
    if (ev.status === "CANCELLED") continue;

    const isAllDay = ev.datetype === "date";
    const durMs = ev.end && ev.start ? (ev.end.getTime() - ev.start.getTime()) : (isAllDay ? 86400000 : 3600000);

    if (ev.rrule) {
      // Expand occurrences that could touch the window (widen a day each side).
      const from = new Date(windowStart - 86400000);
      const to = new Date(windowEnd + 86400000);
      let occurrences = [];
      try { occurrences = ev.rrule.between(from, to, true); } catch (e) { occurrences = []; }
      const exdates = ev.exdate || {};
      for (const occ of occurrences) {
        // Skip excluded dates.
        const exKey = occ.toISOString().slice(0, 10);
        if (exdates[exKey] || exdates[occ.toISOString()]) continue;
        // Honor per-occurrence overrides (moved/edited instances).
        const rec = ev.recurrences && (ev.recurrences[exKey] || ev.recurrences[occ.toISOString().slice(0, 10)]);
        if (rec) {
          if (rec.datetype === "date") pushAllDay(rec.summary, rec.location, rec.start, rec.end);
          else pushTimed(rec.summary, rec.location, rec.start.getTime(), rec.end.getTime());
          continue;
        }
        if (isAllDay) {
          const s = occ;
          const e = new Date(occ.getTime() + durMs);
          pushAllDay(ev.summary, ev.location, s, e);
        } else {
          pushTimed(ev.summary, ev.location, occ.getTime(), occ.getTime() + durMs);
        }
      }
    } else {
      if (isAllDay) pushAllDay(ev.summary, ev.location, ev.start, ev.end);
      else if (ev.start) pushTimed(ev.summary, ev.location, ev.start.getTime(), (ev.end || ev.start).getTime());
    }
  }

  // De-dup (a recurrence override can collide with a base occurrence) and sort.
  for (const dm of dayMeta) {
    const seen = new Set();
    dm.events = dm.events.filter((e) => {
      const k = e.sortKey + "|" + e.summary;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    dm.events.sort((a, b) => a.sortKey - b.sortKey);
  }

  return {
    configured: true,
    timeZone,
    days: dayMeta.map((dm) => ({
      date: dm.dateInt, label: dm.label, isToday: dm.isToday,
      events: dm.events.map((e) => ({
        summary: e.summary, location: e.location, allDay: e.allDay,
        start: new Date(e.startMs).toISOString(), end: new Date(e.endMs).toISOString(),
        timeLabel: e.timeLabel,
      })),
    })),
  };
}

// A compact plain-text rendering DeeDee can drop straight into her prompt.
function toText(win) {
  if (!win || !win.configured) return "";
  const lines = [];
  for (const day of win.days) {
    lines.push(`${day.isToday ? "TODAY" : "NEXT"} — ${day.label}:`);
    if (!day.events.length) lines.push("  (nothing scheduled)");
    for (const e of day.events) {
      const loc = e.location ? ` @ ${e.location}` : "";
      lines.push(e.allDay ? `  • All day — ${e.summary}${loc}` : `  • ${e.timeLabel} — ${e.summary}${loc}`);
    }
  }
  return lines.join("\n");
}

module.exports = { getWindow, toText, DEFAULT_TZ };
