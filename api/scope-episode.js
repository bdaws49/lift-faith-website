// api/scope-episode.js — the generator behind the "✨ Generate draft" button on
// the Under the Scope episode-builder dashboard.
//
// Serverless (Vercel). Same key/pattern as api/abe.js. From a short topic it
// writes a TWO-PART Scripture-teaching episode in Pastor Billy Daws' "Under the
// Scope" voice, plus the teaching framework and 3 reel hooks, each part's script
// capped to the clone-voice character limit. Returns JSON. DRAFT — verify every
// verse and reference before publishing.
//
// SETUP: Vercel env ANTHROPIC_API_KEY = sk-ant-...  (already set for Abe).
// Optional: SCOPE_MODEL to change the model (default: claude-sonnet-5).

const MODEL = process.env.SCOPE_MODEL || "claude-sonnet-5";

const LIMITS = { titleMax: 100, descMax: 5000, reelMax: 150, fieldMax: 600 };

const SYSTEM_PROMPT = `You are the writer for "Under the Scope with Pastor Billy Daws," his Scripture-teaching podcast. The show looks closely and honestly at Scripture and life — "let's put this under the scope." Warm, encouraging, instructive, personal — a teacher who sits with people and never talks down to them.

VOICE (Pastor Billy Daws — match closely)
- Warm, pastoral, vivid, plain. Cadence flows. Often open with a probing question that names the listener's real ache.
- Teach by drawing near: define a word plainly, then comfort. Build in rising triplets. Reach for everyday pictures (a gavel, a child in a parent's arms, a seed, stars in the dark). Anchor in Bible characters.
- Land on hope: "keep pressing on," "his grace is sufficient." Use Billy's "Let's..." family ("Let's unpack this," "Let's get practical").
- No Christianese clichés ("blessed and highly favored," "let go and let God," "everything happens for a reason").

DOCTRINE & ACCURACY (non-negotiable)
- Default Bible translation: NKJV. Always name the translation when you quote a verse.
- NEVER fabricate a verse, reference, quotation, or fact. If unsure, say so or choose what you are sure of. Accuracy is the credibility of the show.
- Theology is conservative Southern Baptist: Scripture authoritative and inerrant; salvation by grace through faith in Christ alone; the gospel central.

TWO-PART FORMAT
Split the teaching into two sequential videos. Each part is voiced as ONE clone-voice generation, so each part's script MUST fit the clone-voice character limit given in the request — that limit is the reason for the split. Write to fill it well without exceeding it.
- Part 1: open the passage — the ache it speaks to, the context, and the heart of the text. End on a question that pulls the listener to Part 2.
- Part 2: go deeper — key words, cross-references, and get practical with application, landing on hope and a clear takeaway.

CHARACTER LIMITS (hard — count characters, stay under)
- part script: <= the clone-voice character limit provided in the request (the hard cap that defines each part)
- part title: <= ${LIMITS.titleMax}
- part description: <= ${LIMITS.descMax} (aim ~900-1400; hook line, summary, key verses, and "New episode weekly")
- each reel hook: <= ${LIMITS.reelMax}
- each framework field: <= ${LIMITS.fieldMax}

OUTPUT FORMAT
Return ONLY valid minified JSON (no markdown, no code fences, no commentary) with EXACTLY this shape:
{"framework":{"passage":"","bigIdea":"","context":"","keyWords":"","crossRefs":"","application":"","takeaway":""},"reels":{"r1":"","r2":"","r3":""},"part1":{"title":"","script":"","description":""},"part2":{"title":"","script":"","description":""}}
- framework.passage = the primary text (with NKJV). bigIdea = the one main point. context = historical/literary background. keyWords = a word study. crossRefs = supporting references. application = how to live it. takeaway = one sentence to remember.
- reels.r1 = a probing question hook, r2 = a striking truth from the text, r3 = the takeaway line.`;

function stripFences(t) {
  return String(t || "")
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Use POST." }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: "The generator isn't connected yet. Add ANTHROPIC_API_KEY in your Vercel project settings and redeploy.",
    });
    return;
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  const topic = String(body.topic || "").trim();
  if (!topic) { res.status(400).json({ error: "Add a topic / passage first, then generate." }); return; }

  const scriptLimit = Math.max(500, Math.min(40000, parseInt(body.scriptLimit, 10) || 5000));

  const ctx = [
    body.title ? `Working title: ${body.title}` : "",
    body.passage ? `Passage: ${body.passage}` : "",
    `Topic / angle for this episode: ${topic}`,
  ].filter(Boolean).join("\n");

  const userMsg = `Write the full two-part Under the Scope teaching episode for the following. Follow the structure, voice, character limits, and JSON output format exactly.\n\nHARD LIMIT — clone-voice cap: each part's "script" must be at most ${scriptLimit} characters (the per-generation limit of the clone-voice tool). Count characters and stay under it; write to fill it well.\n\n${ctx}`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMsg }],
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      res.status(502).json({ error: "Couldn't reach the AI service.", detail });
      return;
    }

    const data = await r.json();
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();

    let parsed;
    try { parsed = JSON.parse(stripFences(text)); }
    catch {
      res.status(502).json({ error: "The draft came back in an unexpected format. Try Generate again.", detail: text.slice(0, 400) });
      return;
    }

    res.status(200).json({ draft: parsed });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong generating the episode.", detail: String(err) });
  }
};
