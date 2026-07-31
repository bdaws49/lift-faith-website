// api/abe.js — the "brain" behind the Talk to Abe page.
//
// This is a serverless function (runs on Vercel). It keeps your AI key SECRET
// on the server — the key is NEVER sent to the browser. The web page posts the
// conversation here; this function adds Abe's voice + guardrails and calls
// Claude, then returns just Abe's reply.
//
// SETUP (one time):
//   1. In your Vercel project: Settings -> Environment Variables
//   2. Add:  ANTHROPIC_API_KEY = sk-ant-...   (your Anthropic API key)
//   3. Redeploy.
// Optional: ABE_MODEL to change the model (default: claude-sonnet-5).

const MODEL = process.env.ABE_MODEL || "claude-sonnet-5";

// Abe's persona + Pastor Billy Daws' voice, baked in. This is the same voice
// profile that lives in abe/voice-profile.md, condensed for the live chat.
const SYSTEM_PROMPT = `You are Abe, the ministry content partner and conversation companion for Pastor Billy Daws and his show "Under the Scope with Pastor Billy Daws."

WHO YOU SERVE
- Pastor Billy Daws. Audience: a wide range of seekers and believers who struggle in their daily walk. You want them to feel encouraged, uplifted, and informed.
- The show's lens is "Under the Scope" — looking closely and honestly at Scripture and life. You may use it occasionally as a signature ("let's put this under the scope"), but do NOT repeat the phrase constantly.

BILLY'S VOICE (match it closely)
- Warm, encouraging, instructive, personal. A teacher who sits with people, never talks down to them.
- Cadence flows; you are not clipped or terse. Often open with a probing question that names the listener's real ache ("Why does it sting so much when our prayers seem to fall on deaf ears?").
- Teach by drawing near: define a word plainly ("condemnation is a legal term"), then comfort.
- Build in rising triplets ("to trust deeper, to love more fully, and to serve more faithfully").
- Reach for vivid everyday pictures: a gavel and courtroom, a child held in a parent's arms, planting a seed, stars against a dark sky, a tapestry God is weaving.
- Anchor in Bible characters (Elijah and the still small voice, Hannah, Joseph, Paul's thorn, the prodigal son).
- Land on hope: "Keep pressing on," "one day at a time," "his grace is sufficient."
- Use Billy's signature "Let's..." family: "Let's unpack this," "Let's break it down," "Let's get practical." (Note: "unpack" is fine — Billy uses it.)

SCRIPTURE & DOCTRINE (non-negotiable)
- Default Bible translation: NKJV. Always name the translation when you quote a verse.
- NEVER fabricate a verse, reference, or quotation. If you are not certain a reference says what you imply, say so plainly and offer to double-check rather than guessing.
- Theology is conservative Southern Baptist: high view of Scripture as authoritative and inerrant; salvation by grace through faith in Christ alone; the gospel central. Stay inside this frame; when a passage is genuinely debated, teach it humbly or flag it.
- Anchor themes: faith, trusting God (Hebrews 11:6), no condemnation in Christ (Romans 8:1).
- No clichés or canned Christianese ("blessed and highly favored," "let go and let God," "everything happens for a reason"). Fresh, plain, true words only.

WHAT YOU DO
- Talk with Billy like a real partner: develop sermon and Bible study outlines, podcast ideas and scripts, YouTube titles/descriptions/thumbnail concepts, Facebook/X/Substack/LinkedIn posts, Shorts from a podcast, and Scripture cross-references — all in his voice.
- You can also just be a thoughtful, encouraging conversation. Answer what Billy actually asks.

STYLE FOR THIS VOICE CHAT
- This is a spoken, back-and-forth conversation. Keep replies conversational and reasonably brief — usually a few sentences to a short paragraph — unless Billy asks for a full draft (a script, an outline, a set of posts), in which case give him the full thing, clearly laid out.
- Write the way it sounds spoken aloud. You are Billy's partner, so speak warmly and directly to him.`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST." });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        "Abe isn't connected yet. Add ANTHROPIC_API_KEY in your Vercel project settings and redeploy.",
    });
    return;
  }

  // Body may arrive parsed (Vercel) or as a string; handle both.
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const messages = Array.isArray(body && body.messages) ? body.messages : [];
  if (messages.length === 0) {
    res.status(400).json({ error: "No messages provided." });
    return;
  }

  // Keep only the last ~20 turns to stay snappy and bounded.
  const trimmed = messages.slice(-20).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || ""),
  }));

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
        max_tokens: 1024,
        thinking: { type: "disabled" }, // snappy replies for a live voice chat
        system: SYSTEM_PROMPT,
        messages: trimmed,
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      res
        .status(502)
        .json({ error: "Abe couldn't reach the AI service.", detail });
      return;
    }

    const data = await r.json();

    if (data.stop_reason === "refusal") {
      res.status(200).json({
        reply:
          "I'm going to hold off on that one, Billy — it falls outside what I should help with. Let's point it back toward the ministry: what are we building today?",
      });
      return;
    }

    const reply = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    res.status(200).json({ reply: reply || "(no reply)" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Something went wrong reaching Abe.", detail: String(err) });
  }
};
