#!/usr/bin/env bash
#
# add-intro-card.sh — Prepend the "Under the Scope" intro card to every episode.
#
# Puts the 8-second title card on the FRONT of each video, automatically
# matching that episode's resolution, frame rate, and audio so the join is
# seamless. Your original files are NEVER touched — results go to a new folder.
#
# ---------------------------------------------------------------------------
# ONE-TIME SETUP
#   1. Install ffmpeg (this also installs ffprobe):
#        macOS:    brew install ffmpeg
#        Windows:  winget install Gyan.FFmpeg      (or: choco install ffmpeg)
#        Linux:    sudo apt install ffmpeg
#   2. Put all your finished episode videos in ONE folder.
#
# HOW TO RUN  (from a Terminal window)
#        bash add-intro-card.sh  "/path/to/episodes"  ["/path/to/intro-card.mp4"]
#
#   - Arg 1 (required): the folder that holds your episodes.
#   - Arg 2 (optional): the intro card file. Defaults to the copy sitting next
#                       to this script (under-the-scope-intro-sting-v1.mp4).
#
#   Finished files land in a "with-intro" subfolder inside your episodes folder.
#   Re-running is safe: episodes already done are skipped, so if it stops
#   partway (or you add more episodes later) just run it again.
#
# NOTE ON SPEED: each episode is fully re-rendered so the card fuses cleanly and
# the file stays seekable. Expect roughly a few minutes to ~real-time per
# episode depending on your computer. For a whole season, start it and let it
# run in the background (e.g. overnight).
# ---------------------------------------------------------------------------

set -u

# ---- inputs ----------------------------------------------------------------
EPISODE_DIR="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STING="${2:-$SCRIPT_DIR/under-the-scope-intro-sting-v1.mp4}"

# Encoding quality — lower CRF = higher quality + bigger file. 18 is visually
# near-lossless; 20–23 are smaller. Change here if you like.
CRF=18
PRESET=medium

if [ -z "$EPISODE_DIR" ] || [ ! -d "$EPISODE_DIR" ]; then
  echo "ERROR: pass the folder with your episodes as the first argument."
  echo "  Example: bash add-intro-card.sh \"\$HOME/Desktop/Under the Scope episodes\""
  exit 1
fi
if [ ! -f "$STING" ]; then
  echo "ERROR: can't find the intro card: $STING"
  echo "  Pass its path as the second argument, or keep it next to this script."
  exit 1
fi
for bin in ffmpeg ffprobe; do
  command -v "$bin" >/dev/null 2>&1 || { echo "ERROR: '$bin' not found. Install ffmpeg first (see the notes at the top of this file)."; exit 1; }
done

OUT_DIR="$EPISODE_DIR/with-intro"
mkdir -p "$OUT_DIR"

probe() { ffprobe -v error -select_streams "$1" -show_entries "$2" -of default=nw=1:nk=1 "$3" 2>/dev/null | head -1; }

made=0; skipped=0; failed=0

echo "Intro card : $STING"
echo "Episodes   : $EPISODE_DIR"
echo "Output to  : $OUT_DIR"
echo "---------------------------------------------------------------"

# Case-insensitive glob; skip the pattern if nothing matches.
shopt -s nullglob nocaseglob
for ep in "$EPISODE_DIR"/*.mp4 "$EPISODE_DIR"/*.mov "$EPISODE_DIR"/*.m4v "$EPISODE_DIR"/*.mkv; do
  base="$(basename "$ep")"
  out="$OUT_DIR/${base%.*}.mp4"

  if [ -f "$out" ]; then
    echo "SKIP  $base  (already done)"
    skipped=$((skipped+1)); continue
  fi

  # Read this episode's specs so the card can be matched to it exactly.
  W="$(probe v:0 stream=width "$ep")"
  H="$(probe v:0 stream=height "$ep")"
  FPS="$(probe v:0 stream=r_frame_rate "$ep")"
  PIX="$(probe v:0 stream=pix_fmt "$ep")"
  VCODEC="$(probe v:0 stream=codec_name "$ep")"
  SAR="$(probe v:0 stream=sample_aspect_ratio "$ep")"
  AR="$(probe a:0 stream=sample_rate "$ep")"
  ACH="$(probe a:0 stream=channels "$ep")"

  if [ -z "$W" ] || [ -z "$H" ]; then
    echo "FAIL  $base  (couldn't read video dimensions — skipping)"
    failed=$((failed+1)); continue
  fi
  [ -z "$FPS" ] && FPS="30"
  [ -z "$PIX" ] && PIX="yuv420p"
  [ -z "$AR" ]  && AR="48000"
  [ -z "$ACH" ] && ACH="2"
  case "$SAR" in ""|"N/A"|"0:1") SAR="1" ;; esac
  case "$ACH" in 1) LAYOUT="mono" ;; 6) LAYOUT="5.1" ;; *) LAYOUT="stereo"; ACH=2 ;; esac

  # Keep HEVC episodes as HEVC; everything else outputs H.264 (safest for
  # YouTube and every player).
  case "$VCODEC" in
    hevc|h265) VENC="libx265" ;;
    *)         VENC="libx264" ;;
  esac

  echo "MAKE  $base  ->  ${W}x${H} @ ${FPS}fps, ${VCODEC:-h264}, ${AR}Hz/${ACH}ch"

  # One pass: normalize the card to the episode's exact video+audio spec, then
  # concatenate card + episode and re-encode. Always produces a clean, seekable
  # file regardless of how the episode was exported.
  ffmpeg -v error -y -i "$STING" -i "$ep" -filter_complex "\
[0:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=${SAR},fps=${FPS},format=${PIX}[cv];\
[0:a]aresample=${AR},aformat=sample_fmts=fltp:channel_layouts=${LAYOUT}[ca];\
[1:v]setsar=${SAR},fps=${FPS},format=${PIX}[ev];\
[1:a]aresample=${AR},aformat=sample_fmts=fltp:channel_layouts=${LAYOUT}[ea];\
[cv][ca][ev][ea]concat=n=2:v=1:a=1[v][a]" \
    -map "[v]" -map "[a]" \
    -c:v "$VENC" -pix_fmt "$PIX" -crf "$CRF" -preset "$PRESET" \
    -c:a aac -ar "$AR" -ac "$ACH" -b:a 192k \
    -movflags +faststart "$out"

  if [ -s "$out" ]; then
    echo "DONE  $base"
    made=$((made+1))
  else
    echo "FAIL  $base"
    rm -f "$out"
    failed=$((failed+1))
  fi
done

echo "---------------------------------------------------------------"
echo "Finished.  New files: $made   Skipped: $skipped   Failed: $failed"
echo "Your originals are untouched. Stamped episodes are in:"
echo "  $OUT_DIR"
