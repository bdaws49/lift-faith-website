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
