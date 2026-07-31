# Assistant Voices

Each assistant's **greeting** is pre-rendered to an audio file in a chosen
Higgsfield voice and played by a "🔊 Hear it" button on the greeting bubble.

> Only the fixed greeting is pre-generated. Live back-and-forth replies still use
> the visitor's **browser/device voice** — Higgsfield generates audio as async
> jobs (~15–25s each), which is too slow to speak every live reply in real time.
> For real-time custom voice on every reply, a streaming TTS provider
> (e.g. ElevenLabs) would be needed.

## Current mapping

| Assistant | Voice | Type | voice_id | Greeting file |
|-----------|-------|------|----------|---------------|
| **Abe**   | Harrison | preset | `573e5163-59b3-4926-aab1-951ef2985f81` | `/abe-greeting-v1.wav` |
| **Barb**  | Emily    | preset | `6b3e3642-f7b7-4cb8-9688-51e233c4b92f` | `/barb-greeting-v1.wav` |
| **Chloe** | Naomi    | preset | `caeba733-3c17-43db-863e-69c7025512cd` | `/chloe-greeting-v1.wav` |

There is also a custom cloned voice **"Pastor-Billy"**
(`0b12d76e-a759-49e7-94fa-a2a33f7d33d1`, type `element`) in the Higgsfield
account, available if you ever want an assistant to use Billy's own voice.

## How to change a voice (it's easy)

1. Pick a new voice from Higgsfield (`list_voices`) — note its `voice_id` and
   `voice_type` (`preset` or `element`).
2. Regenerate the greeting with `generate_audio` (model `seed_audio`) using that
   voice and the assistant's greeting text (the `GREETING` string in the page).
3. Save the resulting audio over a **new** versioned filename (e.g.
   `abe-greeting-v2.wav`) and update the `new Audio('/abe-greeting-v1.wav')`
   reference near the bottom of the matching `talk-to-*.html`. Bumping the
   version avoids browser audio caching.

The greeting text lives in each page as `var GREETING = "…"`. If you change the
wording, regenerate the audio so they match.
