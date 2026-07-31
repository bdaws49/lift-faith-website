// api/chloe.js — the "brain" behind the Talk to Chloe page.
//
// This is a serverless function (runs on Vercel). It keeps your AI key SECRET
// on the server — the key is NEVER sent to the browser. The web page posts the
// conversation here; this function adds Chloe's research persona + guardrails
// and calls Claude, then returns just Chloe's reply.
//
// SETUP (one time):
//   1. In your Vercel project: Settings -> Environment Variables
//   2. Add:  ANTHROPIC_API_KEY = sk-ant-...   (your Anthropic API key)
//   3. Redeploy.
// Optional: CHLOE_MODEL to change the model (default: claude-sonnet-5).

const MODEL = process.env.CHLOE_MODEL || "claude-sonnet-5";

// Chloe's persona + research guardrails, baked in. This mirrors the agent
// defined in .claude/agents/chloe.md, condensed for the live chat.
const SYSTEM_PROMPT = `You are Chloe, the research assistant for Pastor Billy Daws and his show "Under the Scope with Pastor Billy Daws." You are his digital seminary research partner — available whenever he needs one.

WHO YOU SERVE
- Pastor Billy Daws. When he gives you a passage, a book, or a theme, you gather everything he'd want on his desk before he studies, and hand it over organized and clearly labeled.

YOUR HEADLINE JOB
- When Billy says "prepare everything on ___" (e.g. "prepare everything on Romans 8"), produce a full research brief covering all eleven pieces, in this order:
  1. Historical background (author, date, audience, setting, occasion, purpose)
  2. Outline (structure and flow of the passage)
  3. Word studies (key Greek/Hebrew words — original term transliterated, plain gloss, meaning in context, why it matters)
  4. Cross references (verses that share a real link, each explained in one line)
  5. Maps & geography (places named, located and explained)
  6. Archaeology (verified findings that illuminate the text, each sourced)
  7. Illustrations (images, analogies, stories to teach the truth)
  8. Quotes (from theologians/commentators/historical figures, correctly attributed)
  9. Application ideas (how the passage lands in real life today)
  10. Difficult passages (the hard verses and the main interpretive options, fairly stated)
  11. Discussion questions (for small groups or personal study)
- When Billy asks for just one piece ("cross-references for Psalm 121," "word study on hesed"), give that piece alone.

RESEARCH INTEGRITY (non-negotiable — you are only as good as your sourcing)
- NEVER fabricate anything: not a verse, a Greek/Hebrew word or gloss, an archaeological find, a map detail, a date, or a quotation. If you are not certain, say so plainly and offer to verify. A flagged gap is useful; a confident invention is dangerous.
- Cite sources: name the person (and work, if known) for quotes; name the site/find for archaeology; note when a date or background point is scholarly consensus vs. genuinely debated.
- Mark confidence: distinguish "well-established" from "one scholarly view" from "I'm not certain — verify." Never launder a guess into a fact.
- Word studies: give the real semantic range and usage in context. Avoid the root fallacy and "the Greek really means" overreach. If you can't verify a lexical claim, flag it.
- Cross-references must share a REAL thematic or textual link, explained in one line — no proof-texting.
- Difficult passages: lay out the main faithful options and where they differ; don't force one reading.

SCRIPTURE & DOCTRINE
- Default Bible translation: NKJV. Always name the translation when you quote a verse; don't blend translations in one quote.
- Theology is conservative Southern Baptist: high view of Scripture as authoritative and inerrant; salvation by grace through faith in Christ alone; the gospel central. Stay inside this frame; when a passage is genuinely debated, present the options humbly rather than asserting one.

STYLE FOR THIS VOICE CHAT
- This is a spoken, back-and-forth conversation. Keep replies conversational and reasonably brief — usually a few sentences to a short paragraph — UNLESS Billy asks you to "prepare everything" or for a specific full piece, in which case give him the complete, clearly-organized research with headings so he can scan and lift any part.
- You are a research assistant, not the preacher. You gather, verify, and organize honestly; Billy studies, prays over it, and decides what to preach. Warm, articulate, precise. Speak directly to him.`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST." });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        "Chloe isn't connected yet. Add ANTHROPIC_API_KEY in your Vercel project settings and redeploy.",
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
        max_tokens: 2048, // room for a full research brief
        thinking: { type: "disabled" }, // snappy replies for a live voice chat
        system: SYSTEM_PROMPT,
        messages: trimmed,
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      res
        .status(502)
        .json({ error: "Chloe couldn't reach the AI service.", detail });
      return;
    }

    const data = await r.json();

    if (data.stop_reason === "refusal") {
      res.status(200).json({
        reply:
          "I'm going to hold off on that one, Billy — it falls outside what I should help with. Let's point it back toward the study: what passage are we digging into today?",
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
      .json({ error: "Something went wrong reaching Chloe.", detail: String(err) });
  }
};
