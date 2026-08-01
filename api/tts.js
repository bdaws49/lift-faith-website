// api/tts.js — ElevenLabs text-to-speech for the live assistant chats.
//
// The chat pages POST a reply here; this serverless function calls ElevenLabs
// with the assistant's chosen voice and returns MP3 audio. Your ElevenLabs key
// stays SECRET on the server — it's never sent to the browser.
//
// The pages ALWAYS fall back to the browser's built-in voice if this endpoint
// isn't configured or errors, so the site keeps working with or without a key.
//
// SETUP (one time, on Vercel):
//   Settings -> Environment Variables:
//     ELEVENLABS_API_KEY = <your key>        (required to turn real voices on)
//   Optional (defaults shown) — set to any voice id from your ElevenLabs library:
//     ABE_VOICE_ID   = pNInz6obpgDQGcFmaJgB   (Adam — warm male)
//     BARB_VOICE_ID  = 21m00Tcm4TlvDq8ikWAM   (Rachel — calm female)
//     CHLOE_VOICE_ID = Xb7hH8MSUJpSbSDYk0k2   (Alice — clear female)
//     ELEVENLABS_MODEL = eleven_flash_v2_5    (low latency, ~half the credits)
//     TTS_MAX_CHARS = 700                      (caps a single reply to protect credits)
// Then redeploy.

const VOICES = {
  abe: process.env.ABE_VOICE_ID || "pNInz6obpgDQGcFmaJgB", // Adam
  barb: process.env.BARB_VOICE_ID || "21m00Tcm4TlvDq8ikWAM", // Rachel
  chloe: process.env.CHLOE_VOICE_ID || "Xb7hH8MSUJpSbSDYk0k2", // Alice
};
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_flash_v2_5"; // fast + ~half cost
const MAX_CHARS = parseInt(process.env.TTS_MAX_CHARS || "700", 10);

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST." });
    return;
  }

  // Read the ElevenLabs key. `liftfaith` is a fallback alias for the same key,
  // to match an existing Vercel env var of that name.
  const apiKey = process.env.ELEVENLABS_API_KEY || process.env.liftfaith;
  if (!apiKey) {
    // Not configured yet — the page will fall back to the browser voice.
    res.status(501).json({ error: "TTS not configured." });
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
  let text = String((body && body.text) || "").trim();
  const agent = String((body && body.agent) || "").toLowerCase();
  const voiceId = VOICES[agent] || VOICES.abe;

  if (!text) {
    res.status(400).json({ error: "No text." });
    return;
  }
  // Protect credits: never synthesize more than the cap in one call.
  if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS);

  try {
    const r = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/" +
        voiceId +
        "?output_format=mp3_44100_128",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "content-type": "application/json",
          accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: text,
          model_id: MODEL,
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );

    if (!r.ok) {
      const detail = await r.text();
      res.status(502).json({ error: "TTS failed.", detail });
      return;
    }

    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader("content-type", "audio/mpeg");
    res.setHeader("cache-control", "no-store");
    res.status(200).send(buf);
  } catch (err) {
    res.status(500).json({ error: "TTS error.", detail: String(err) });
  }
};
