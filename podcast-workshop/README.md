# Under the Scope — Podcast Workshop

The grunt-work engine for the *Under the Scope* podcast. Feed it a thought, get
back an upload-ready episode plus three reels — with the manual steps (voices,
fine-tuning, uploads) left exactly where they belong: with you.

> Built to be **permanent**. It lives in git — commit and push and it can never
> be lost again.

## The pipeline

```
 idea ─▶ SCRIPT ─▶ VOICEPREP ─▶ [you: CloneVoice] ─▶ ASSEMBLE ─▶ TRANSCRIBE ─▶ CAPTIONS
         6 parts   export for      generate the 6      full        "scan" for    episode.srt
                   CloneVoice      voices, drop back   episode      the quotes
                                                                        │
             PACKAGE ◀── [you: fine-tune] ◀── VIDEO ◀── IMAGES ◀── REELS
        spotify / youtube / content360         YouTube   cover +    3 shorts,
        + upload checklist                     video     reel bgs   precise cuts
```

1. **Script** — your idea → a full episode in the show's structure:
   **hook → intro → part 1 → ad → part 2 → outro**, plus title, tagline,
   Scripture, summary, and 3 reel-worthy quotes.
2. **Voiceprep** — exports each segment as text + a `GENERATE_VOICES.md` sheet.
   *You generate the six voices in CloneVoice* and drop the audio into `audio/`.
3. **Assemble** — stitches the six clips into the full episode and builds a
   timeline (every segment's exact start time).
4. **Transcribe** — "scans" the audio with Whisper for word-level timestamps.
5. **Captions** — turns that into `episode.srt` for YouTube.
6. **Reels** — locates each quote in the transcript, cuts it precisely, and
   makes a captioned vertical video.
7. **Images** — generates a cover + a background per reel (and always saves the
   prompts so you can regenerate/fine-tune).
8. **Video** — builds the full-length YouTube video (cover + audio + captions).
9. **Package** — sorts everything into `upload/spotify`, `upload/youtube`,
   `upload/content360`, with an `UPLOAD_CHECKLIST.md` for the manual uploads.

## Setup

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # paste your OpenAI key in
```

You also need **ffmpeg** installed (`brew install ffmpeg` on a Mac).

## Run it (two commands, split by the manual voice step)

```bash
# 1. write the script + export segments for CloneVoice
python workshop.py "Jehovah Sabaoth — the Lord of Hosts who fights for you (1 Samuel 17)" --to voiceprep

# 2. generate the 6 voices in CloneVoice, save them as audio/01_hook.mp3 … 06_outro.mp3
#    (voice/GENERATE_VOICES.md tells you exactly what to name each file)

# 3. finish everything from the audio onward
python workshop.py --project output/jehovah-sabaoth --from assemble
```

Re-run any single stage: `python workshop.py --project output/<slug> --only reels`

Every run is a self-contained folder under `output/<slug>/` — script, voices,
audio, transcript, captions, reels, images, video, and the sorted upload bundle.
Nothing is thrown away; any stage can be re-run on its own.

## What you provide

- `OPENAI_API_KEY` — script, transcription, and image generation
- **CloneVoice** — you generate the six segment voices by hand
- **ffmpeg** on your PATH

## The manual steps (by design)

Generate voices → fine-tune → upload audio to **Spotify** → upload video to
**YouTube** → upload the 3 reels to **Content360**. The workshop does everything
in between and hands you a tidy `upload/` folder for these final steps.
