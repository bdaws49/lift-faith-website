# Under the Scope — Podcast Workshop

The grunt-work engine for the *Under the Scope* podcast. Feed it a thought,
get back an upload-ready episode plus three short reels.

> Rebuilt to be **permanent**: this lives in git. Commit and push and it can
> never be lost again.

## The pipeline

```
  idea ──▶ 1. SCRIPT ──▶ 2. VOICE ──▶ 3. ASSEMBLE ──▶ 4. REELS ──▶ 5. PACKAGE ──▶ upload/
           (ChatGPT)     (voice     (stitch full     (cut 3        (episode page +
                          clone)     episode)         shorts)       upload folder)
```

1. **Script** — your idea runs through ChatGPT and comes back as a structured
   episode: title, tagline, Scripture, summary, the narration broken into
   blocks, and 3 pull-quotes flagged as reel candidates.
2. **Voice** — each narration block is sent to your cloned voice; we save one
   audio file per block and record how long each one is.
3. **Assemble** — the blocks are stitched into the full episode. Because we
   know each block's length, we know the exact timestamp of every line.
4. **Reels** — the 3 flagged quotes are cut straight out of the episode audio
   (using those known timestamps) and turned into vertical videos with captions.
5. **Package** — builds the episode landing page (same template as the
   Jehovah Shalom page) and drops everything into an `upload/` folder.

## Setup

```bash
cd podcast-workshop
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # then paste your API keys into .env
```

You also need **ffmpeg** installed locally (`brew install ffmpeg` on a Mac).

## Run it

```bash
# whole pipeline, idea in → upload/ out
python workshop.py "Jehovah Shalom — the peace that comes before the battle, from Gideon in Judges 6"

# or run a single stage against an existing project folder
python workshop.py --project output/jehovah-shalom --only reels
```

Each run creates a project folder under `output/<slug>/` containing every
intermediate file, so nothing is ever thrown away and any stage can be re-run.

## What you provide

- `OPENAI_API_KEY` — for the script stage
- `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` — your cloned voice
- ffmpeg on your PATH

See `.env.example`. Using a different voice service? Only
`workshop/stages/voice.py` needs to change.
