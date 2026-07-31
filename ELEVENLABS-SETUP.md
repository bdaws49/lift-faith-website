# Turning on real voices (ElevenLabs)

The assistants can speak **every reply** in a real, custom voice using ElevenLabs.
Until you add a key, the pages fall back to the phone's built-in voice — so nothing
breaks; it only gets better once the key is in.

## The one step to turn it on

Your site deploys on **Vercel**:

1. In Vercel → your project → **Settings → Environment Variables**, add:
   - **Name** `ELEVENLABS_API_KEY`  **Value** your ElevenLabs key
     *(ElevenLabs → your profile → API Keys. Your $6 Starter plan is enough.)*
2. **Redeploy** (Deployments → latest → Redeploy, or push any commit).

Open a chat page, turn on **"speaks aloud,"** and the replies now speak in the
ElevenLabs voice. Tap **⏹ Stop** to cut a long reply short.

## Choosing the voices (optional)

Defaults are set (Adam / Rachel / Alice). To use different voices, copy a voice id
from your ElevenLabs **Voices** library and add any of these env vars in Vercel,
then redeploy:

| Assistant | Env var | Default (voice) |
|-----------|---------|-----------------|
| Abe   | `ABE_VOICE_ID`   | `pNInz6obpgDQGcFmaJgB` (Adam) |
| Barb  | `BARB_VOICE_ID`  | `21m00Tcm4TlvDq8ikWAM` (Rachel) |
| Chloe | `CHLOE_VOICE_ID` | `Xb7hH8MSUJpSbSDYk0k2` (Alice) |

Other optional settings:

- `ELEVENLABS_MODEL` — default `eleven_flash_v2_5` (fast, low-latency, ~half the
  credits — best for live chat). Use `eleven_multilingual_v2` for top quality at
  full cost.
- `TTS_MAX_CHARS` — default `700`. Caps a single spoken reply so one long answer
  can't drain your monthly credits. (You'll still see the full text; only the
  spoken audio is capped. Tap **⏹ Stop** any time.)

## Protecting your credits ($6 plan = 30,000/month)

- The pages are public, so anyone with "speaks aloud" on uses your credits. If that
  becomes a concern, we can default the toggle **off**, or add a passcode.
- Chloe's full research briefs are long; the `TTS_MAX_CHARS` cap keeps a single
  reply from eating a big chunk of credits.
- If you run out mid-month, replies simply fall back to the browser voice until the
  credits reset — nothing errors out.

## What still uses Higgsfield

The opening **greeting** on each page ("🔊 Hear it") plays a pre-made Higgsfield
clip (free, no credits). Live replies use ElevenLabs. See `VOICES.md`.
