# Show assets — Under the Scope

## `under-the-scope-intro-sting-v1.mp4`
The branded intro/title sting for **Under the Scope with Pastor Billy Daws**.

- **Length / format:** ~8 sec, 3840×2160 (4K), 24 fps, HEVC + AAC audio.
- **Arc:** candlelit scroll on a wooden table → scroll unrolls to a sepia
  engraving → dissolves into an open glowing Bible → light burst → resolves on
  the "Under the Scope — With Pastor Billy Daws" title card.
- **Placement:** immediately after the cold-open hook, before the spoken intro.
  See the cue in `abe/templates/podcast-script.md`. Use the same sting on every
  episode for consistent branding.
- **Editing note:** duck/crossfade its music under the first words of the intro
  so there's no hard audio cut into the host's voice.

### TODO — matching short version
Export a 2–3 sec "stinger" (just the final light-burst → logo) for the outro
and for Shorts/Reels intros, so the branding is consistent everywhere.

---

## `add-intro-card.sh` — batch-add the card to existing episodes

Prepends the intro card to a whole folder of already-finished episode videos
(e.g. the season already produced through September). It matches each episode's
resolution, frame rate, and audio automatically, so the join is seamless and the
files stay seekable. **Originals are never modified** — results go to a
`with-intro/` subfolder.

**One-time setup:** install ffmpeg (`brew install ffmpeg` on macOS,
`winget install Gyan.FFmpeg` on Windows, `sudo apt install ffmpeg` on Linux),
then put all the episodes in one folder.

**Run it (from a Terminal):**
```
bash abe/assets/add-intro-card.sh "/path/to/your/episodes"
```
The card next to this script is used by default; pass a different card as a
second argument if needed. Re-running is safe — episodes already done are
skipped, so you can stop/restart or add more episodes later.

Each episode is fully re-rendered (so the card fuses cleanly), so budget a few
minutes to about real-time per episode and let it run in the background for a
whole season. Only needed for the **video** versions — the audio podcast feed
doesn't use the card.

---

## `gather-podcast-material.sh` — collect + de-dupe + organize (macOS)

Finds scattered podcast files across your Mac, removes duplicates by **actual
file content** (not just filename), and copies one clean copy of each into an
organized `Under the Scope/` folder inside Google Drive (which then syncs to the
2 TB). It **never deletes or moves your originals — it only copies.**

**Setup:** install Google Drive for Desktop and sign in (needed for the real run
so the organized folder syncs). The dry run needs nothing.

**1. Dry run first — looks, counts, finds duplicates, copies nothing:**
```
bash abe/assets/gather-podcast-material.sh
```
It prints a summary and writes a full report to
`~/Desktop/under-the-scope-organize-report.txt`. Review it — confirm it's
catching the right files (and not family photos). Tune the `KEYWORDS` list near
the top of the script if needed.

**2. When the plan looks right, do it for real:**
```
bash abe/assets/gather-podcast-material.sh apply
```

Optional — point it at specific folders instead of the default sweep of
Desktop/Documents/Movies/Downloads/Music/Pictures and external drives:
```
bash abe/assets/gather-podcast-material.sh apply  ~/Desktop ~/Movies /Volumes/BackupDrive
```

Notes:
- Gathers video, audio, scripts/docs, and images whose path contains a podcast
  keyword; sorts videos/audio into `01 – Episodes/EpNN/` when it can read an
  episode number from the filename, otherwise `_Unsorted` for you to drag later.
- De-dupe is exact-content (SHA-256), so a copy named `episode5_FINAL_v2.mp4` is
  recognized as the same file and only one copy is kept.
- Safe to re-run: files already in the destination are skipped.
