# Photo → Talking-Head Reels on an Intel Mac (Wav2Lip)

Turn **one still photo + an audio clip** into a short **vertical (9:16) talking-head
video** for Reels — 100% **local, free, and open-source**, running on **CPU**
(no NVIDIA GPU, no Apple Silicon required).

The full pipeline is:

```
your text  →  OpenVoice (clone a voice + speak it)  →  Wav2Lip (photo speaks)  →  ffmpeg (9:16)  →  reel
```

You can run it in **two stages**:
- **Step 1 — Wav2Lip only** (`animate_photo.sh`): photo + *any* audio → talking reel.
  Best first, to judge speed/quality on your machine.
- **Step 2 — add voice cloning** (`make_reel.sh`): text + photo + a voice sample →
  the photo speaks in a **cloned voice**, fully automated.

> ### Honest expectations (Intel Mac, CPU only)
> - **Short clips only.** Aim for **15–60 seconds** — perfect for Reels.
> - **Speed:** a 15–30s clip typically takes **~10–30 minutes** to render on an
>   older Intel CPU. Start it and walk away.
> - **Quality:** Wav2Lip syncs the **mouth**; the rest of the face stays still, so
>   it can look slightly stiff. On a phone-sized reel this usually looks fine.
> - Use the `--speed`/resize options below to trade a little quality for a lot of
>   speed while you're testing.

---

## What's in this folder

| File | What it does |
|------|--------------|
| `setup_wav2lip_mac.sh` | **Step 1 setup** — Python venv (`.venv`), installs Wav2Lip + deps, checks model checkpoints. |
| `animate_photo.sh` | **Step 1 run** — `photo + audio → vertical talking-head reel` (Wav2Lip + ffmpeg). |
| `requirements.txt` | Pinned Wav2Lip deps for CPU. |
| `setup_voice_mac.sh` | **Step 2 setup** — separate voice venv (`.venv-voice`), installs OpenVoice + MeloTTS, checks checkpoints. |
| `clone_voice.py` | **Step 2 engine** — clone a voice from a sample and speak text → `.wav` (importable + standalone). |
| `make_reel.sh` | **Full pipeline** — `text + photo + voice-sample → cloned-voice talking reel` (OpenVoice → Wav2Lip → ffmpeg). |
| `README.md` | This file. |

> ### Why two virtual-envs?
> OpenVoice needs *newer* versions of NumPy/librosa than Wav2Lip tolerates. Installing
> both in one env causes conflicts, so setup builds **two**: `.venv` (Wav2Lip) and
> `.venv-voice` (OpenVoice). `make_reel.sh` drives each in turn — you don't manage it.

---

## Prerequisites (install once)

1. **Homebrew** (if you don't have it) — https://brew.sh
2. **Python 3.10** and **ffmpeg**:
   ```bash
   brew install python@3.10 ffmpeg git
   ```
   > Wav2Lip is an older project; **Python 3.10 is the sweet spot**. 3.11/3.12 can
   > work but are more likely to fight you on dependencies.

---

## One-time setup

From inside this `reels-lipsync/` folder:

```bash
bash setup_wav2lip_mac.sh
```

This will:
1. Clone Wav2Lip into `reels-lipsync/Wav2Lip/`.
2. Create a virtual-env at `reels-lipsync/.venv` and install `requirements.txt`.
3. Tell you exactly which **two model files** to download and where to put them.

### The two model files you must download

Wav2Lip needs pretrained weights that can't be redistributed here. Download them
manually (free) and drop them where the script says:

| File | Save it to | Where to get it |
|------|------------|-----------------|
| `wav2lip_gan.pth` (the lip-sync model) | `Wav2Lip/checkpoints/wav2lip_gan.pth` | Linked from the official repo README: https://github.com/Rudrabha/Wav2Lip — or a HuggingFace mirror, search **"wav2lip_gan.pth"**. |
| `s3fd.pth` (the face detector) | `Wav2Lip/face_detection/detection/sfd/s3fd.pth` | Same README / HuggingFace mirror, search **"s3fd.pth"**. |

> The original Google Drive links in the Wav2Lip README sometimes rate-limit.
> If one is dead, searching HuggingFace for the exact filename almost always
> turns up a working mirror. The `setup` script re-checks these paths and will
> refuse to run until both files are in place.

---

## Make a reel

You need two inputs:
- **A photo** with a clear, front-facing face (`.jpg`/`.png`).
- **An audio clip** (`.wav` or `.mp3`) — for now, record yourself or use any
  audio. (In Step 2 this becomes a *cloned* voice.)

Then:

```bash
bash animate_photo.sh --photo me.jpg --audio line.wav --out my_reel.mp4
```

Output: `my_reel.mp4`, a **1080×1920 vertical** clip of the photo speaking, ready
to post.

### Useful options

| Option | Default | What it does |
|--------|---------|--------------|
| `--photo <path>`  | *(required)* | The still face image. |
| `--audio <path>`  | *(required)* | The speech/audio to sync to. |
| `--out <path>`    | `reel.mp4` | Output file. |
| `--fast`          | off | Halves the working resolution (`resize_factor 2`) → **much faster**, slightly softer. Great for test runs. |
| `--no-vertical`   | off | Skip the 9:16 reformat; keep Wav2Lip's native crop. |

Example fast test run:
```bash
bash animate_photo.sh --photo me.jpg --audio line.wav --out test.mp4 --fast
```

---

## Test assets

Sample assets live in `test-assets/` (kept out of git — personal voice/likeness):

- `test-assets/Billy_Daws.mp3` — a ~45s voice clip (good length for a reel test).
- Add your **"Under the Scope" portrait** here as `test-assets/billy_daws.jpg`
  (front-facing, clear face — Wav2Lip needs to detect the face).

Quick test once both are in place and setup is done:

```bash
# Step 1 — photo speaks the recorded clip (mouth-sync only):
bash animate_photo.sh --photo test-assets/billy_daws.jpg --audio test-assets/Billy_Daws.mp3 --out test-assets/test_reel.mp4 --fast

# Full pipeline — cloned voice speaks new text:
bash make_reel.sh --text "Welcome to Under the Scope." --photo test-assets/billy_daws.jpg --voice test-assets/Billy_Daws.mp3 --out test-assets/test_reel.mp4 --fast
```

## Troubleshooting

- **"checkpoint not found"** → you haven't placed `wav2lip_gan.pth` / `s3fd.pth`
  yet. See the table above.
- **"Face not detected"** → use a clearer, larger, front-facing photo. Wav2Lip
  needs to find a face in the frame.
- **A dependency fails to install** → make sure you're on **Python 3.10**
  (`python3.10 --version`). Delete `.venv` and re-run `setup_wav2lip_mac.sh`.
- **`np.float` / `np.int` errors** → your NumPy is too new. The pinned
  `requirements.txt` avoids this; make sure setup used it.
- **It's too slow** → shorten the clip, use `--fast`, and lower the photo
  resolution before feeding it in.

---

---

## Step 2 — Add voice cloning (OpenVoice)

Once Step 1 works, add a **cloned voice** so you only supply *text* — no need to
record the audio yourself.

### One-time voice setup

```bash
bash setup_voice_mac.sh
```

This clones OpenVoice, builds the separate `.venv-voice`, installs OpenVoice +
MeloTTS, and tells you to download the free **`checkpoints_v2`** model pack and
where to unzip it (`OpenVoice/checkpoints_v2/…`).

### The full one-command pipeline

Give it your **text**, a **photo**, and a short **voice sample** to clone
(~10–30s of clean speech from the voice you want):

```bash
bash make_reel.sh \
  --text "Welcome to my channel — here's today's thought." \
  --photo me.jpg \
  --voice voice_sample.wav \
  --out my_reel.mp4
```

It will:
1. Clone the voice from `voice_sample.wav` and speak your text → a `.wav`.
2. Lip-sync your photo to that speech.
3. Format to vertical 1080×1920.

Use `--text-file script.txt` for longer scripts, `--speed 1.1` to adjust pace,
and `--fast` for a quick test render.

### Just the voice step (optional)

To generate cloned-voice audio on its own (e.g. to reuse or check quality):

```bash
source .venv-voice/bin/activate
python clone_voice.py --text "Testing my cloned voice." --voice voice_sample.wav --out speech.wav
```

> **Voice-clone expectations on CPU:** generating speech runs on CPU and is
> reasonably quick for a few sentences (seconds to a couple of minutes). The
> *video* step is still the slow part — keep clips short.

### ⚖️ A note on responsible use

Only clone voices you have the **right to use** — your own, or one you have clear
permission for. Don't impersonate real people without consent.

---

## The whole thing at a glance

```bash
# one-time
brew install python@3.10 ffmpeg git
bash setup_wav2lip_mac.sh      # + download wav2lip_gan.pth, s3fd.pth
bash setup_voice_mac.sh        # + download checkpoints_v2

# make a reel from just text + a photo + a voice sample
bash make_reel.sh --text "..." --photo me.jpg --voice voice_sample.wav --out reel.mp4
```
