# Photo → Talking-Head Reels on an Intel Mac (Wav2Lip)

Turn **one still photo + an audio clip** into a short **vertical (9:16) talking-head
video** for Reels — 100% **local, free, and open-source**, running on **CPU**
(no NVIDIA GPU, no Apple Silicon required).

This is **Step 1** of the plan: get a photo talking with Wav2Lip so you can judge
speed and quality on *your* machine. Voice cloning (OpenVoice) is Step 2 — added
later once this works.

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
| `setup_wav2lip_mac.sh` | One-time installer: creates a Python virtual-env, installs Wav2Lip + dependencies, and helps you place the model checkpoints. |
| `animate_photo.sh` | The everyday command: `photo + audio → vertical talking-head reel`. Runs Wav2Lip, then formats the result to 1080×1920 with ffmpeg. |
| `requirements.txt` | Pinned Python dependencies known to cooperate with Wav2Lip on CPU. |
| `README.md` | This file. |

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

## Next step (when you're happy with this)

Add **voice cloning** so the reel speaks in a cloned voice, fully automated:

```
your text → OpenVoice (clone + speak) → this Wav2Lip step → vertical reel
```

Say the word and I'll add the `clone_voice.py` step and wire it into a single
`make_reel.py` command.
