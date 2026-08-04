// api/episode.js — the generator behind the "✨ Generate draft" button on the
// Where Was the Church dashboard.
//
// Serverless function (Vercel). Keeps your AI key SECRET on the server. The
// dashboard posts a short topic/brief; this asks Claude to write a TWO-PART
// episode (Part 1 + Part 2), the Verdict, and 3 reel hooks — locked to the
// show's structure and to platform character limits — and returns it as JSON.
//
// SETUP (one time): in Vercel -> Settings -> Environment Variables add
//   ANTHROPIC_API_KEY = sk-ant-...   then redeploy.
// Optional: EPISODE_MODEL to change the model (default: claude-sonnet-5).
//
// IMPORTANT: this returns a DRAFT for Billy to verify. Historical claims and
// Scripture references must be checked by a human before publishing.

const MODEL = process.env.EPISODE_MODEL || "claude-sonnet-5";

// Real platform limits, baked in so the model writes to fit.
const LIMITS = {
  titleMax: 100, // YouTube title
  descMax: 5000, // YouTube description
  reelMax: 150, // reel hook line
  verdictMax: 500, // each Verdict field
};

const SYSTEM_PROMPT = `You are the head writer for "Where Was the Church with Pastor Billy Daws," a history podcast that revisits major events and asks what the church got right, what it got wrong, and what we must learn. The tone is reverent, weighty, honest, and pastoral — never sensational, never glib.

VOICE (Pastor Billy Daws)
- Warm but serious. A pastor teaching hard history so the church can repent and grow.
- First-person plural about the church ("we," "the church"). Prophetic and hopeful.
- Vivid, plain language. Short, landing sentences. No Christianese clichés.

DOCTRINE & ACCURACY (non-negotiable)
- Default Bible translation: NKJV. Always name the translation when you quote a verse.
- NEVER fabricate a Scripture reference, a quotation, a date, a name, or a historical "fact." If you are not certain, choose a claim you ARE certain of, or state it more generally. Accuracy is the entire credibility of this show.
- Theology is conservative Southern Baptist: high view of Scripture, gospel central, salvation by grace through faith in Christ alone.

EPISODE STRUCTURE (every episode follows this arc)
Hook (a question) -> the gut-punch (what the church got wrong) -> the remnant (the faithful who resisted) -> the Verdict -> one action.

TWO-PART FORMAT
Split the episode into two sequential videos. Each part is voiced as ONE clone-voice generation, so each part's script MUST fit within the clone-voice character limit given in the request — that limit is the whole reason for the two-part split. Write to fill the limit well without exceeding it.
- Part 1: set the scene and tell what happened — the pressures, the seduction, and where the church failed. End Part 1 on a cliffhanger question that pulls the viewer to Part 2.
- Part 2: the faithful remnant, the reckoning, the Verdict, and the call to action for the church today.

CHARACTER LIMITS (hard — count characters, stay under)
- part script: <= the clone-voice character limit provided in the request (this is the hard cap that defines each part)
- part title: <= ${LIMITS.titleMax}
- part description: <= ${LIMITS.descMax} (aim ~900-1400; open with a hook line, summarize, list the Verdict, name the Scriptures, end with "New episodes Tuesday & Friday")
- each reel hook: <= ${LIMITS.reelMax}
- each Verdict field: <= ${LIMITS.verdictMax}

OUTPUT FORMAT
Return ONLY valid minified JSON (no markdown, no code fences, no commentary) with EXACTLY this shape:
{"verdict":{"gotRight":"","failed":"","faithful":"","mustNot":"","s1":"","s2":"","s3":"","action":""},"reels":{"r1":"","r2":"","r3":""},"part1":{"title":"","script":"","description":""},"part2":{"title":"","script":"","description":""}}
- verdict.s1/s2/s3 are three Scripture references with a short phrase (e.g. "Acts 5:29 — We must obey God rather than men").
- reels.r1 = the Question hook, r2 = the shocking Fact, r3 = the Verdict punchline.`;

function stripFences(t) {
  return String(t || "")
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST." });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        "The generator isn't connected yet. Add ANTHROPIC_API_KEY in your Vercel project settings and redeploy.",
    });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};
  const topic = String(body.topic || "").trim();
  if (!topic) {
    res.status(400).json({ error: "Add a topic / angle first, then generate." });
    return;
  }

  // The clone-voice per-generation character cap sets each part's length.
  // Comes from the dashboard (body.scriptLimit); default 5000; clamped sane.
  const scriptLimit = Math.max(
    500,
    Math.min(40000, parseInt(body.scriptLimit, 10) || 5000)
  );

  // Episode context from the dashboard (all optional but helpful).
  const ctx = [
    body.title ? `Working title: ${body.title}` : "",
    body.unit ? `Unit: ${body.unit}` : "",
    body.era ? `Era: ${body.era}` : "",
    body.event ? `Event: ${body.event}` : "",
    `Topic / angle for this episode: ${topic}`,
  ]
    .filter(Boolean)
    .join("\n");

  const userMsg = `Write the full two-part episode for the following. Follow the structure, voice, character limits, and JSON output format exactly.\n\nHARD LIMIT — clone-voice cap: each part's "script" must be at most ${scriptLimit} characters (this is the per-generation limit of the clone-voice tool). Count characters and stay under it; write to fill it well.\n\n${ctx}`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMsg }],
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      res
        .status(502)
        .json({ error: "Couldn't reach the AI service.", detail });
      return;
    }

    const data = await r.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(stripFences(text));
    } catch {
      res.status(502).json({
        error:
          "The draft came back in an unexpected format. Try Generate again.",
        detail: text.slice(0, 400),
      });
      return;
    }

    res.status(200).json({ draft: parsed });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Something went wrong generating the episode.", detail: String(err) });
  }
};
