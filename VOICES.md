# Assistant Voices

There are **two** voice paths:

1. **Greeting** — a pre-made Higgsfield clip played by the "🔊 Hear it" button on
   each greeting bubble (free, no per-use cost). Documented below.
2. **Live replies** — spoken in real time by **ElevenLabs** when
   `ELEVENLABS_API_KEY` is set (see `ELEVENLABS-SETUP.md`). If the key is missing
   or credits run out, replies fall back to the browser/device voice, so the site
   always works. A **⏹ Stop** button halts any playback (handy for long replies).

Higgsfield can't drive live replies — it renders audio as async jobs (~15–25s),
too slow for real-time chat — which is why greetings use Higgsfield and live
replies use ElevenLabs.

## Current mapping

| Assistant | Voice | Type | voice_id | Greeting file |
|-----------|-------|------|----------|---------------|
| **Abe**   | Harrison | preset | `573e5163-59b3-4926-aab1-951ef2985f81` | `/abe-greeting-v2.mp3` |
| **Barb**  | Emily    | preset | `6b3e3642-f7b7-4cb8-9688-51e233c4b92f` | `/barb-greeting-v2.mp3` |
| **Chloe** | Naomi    | preset | `caeba733-3c17-43db-863e-69c7025512cd` | `/chloe-greeting-v2.mp3` |

Greetings are rendered as small MP3s (`format: "mp3"` on `seed_audio`, ~24 kHz)
for fast, reliable playback on mobile.

There is also a custom cloned voice **"Pastor-Billy"**
(`0b12d76e-a759-49e7-94fa-a2a33f7d33d1`, type `element`) in the Higgsfield
account, available if you ever want an assistant to use Billy's own voice.

## How to change a voice (it's easy)

1. Pick a new voice from Higgsfield (`list_voices`) — note its `voice_id` and
   `voice_type` (`preset` or `element`).
2. Regenerate the greeting with `generate_audio` (model `seed_audio`) using that
   voice and the assistant's greeting text (the `GREETING` string in the page).
3. Save the resulting audio under a **new** versioned filename (e.g.
   `abe-greeting-v3.mp3`) and update the `new Audio('/abe-greeting-v2.mp3')`
   reference near the bottom of the matching `talk-to-*.html`. Bumping the
   version avoids browser audio caching.

The greeting text lives in each page as `var GREETING = "…"`. If you change the
wording, regenerate the audio so they match.
