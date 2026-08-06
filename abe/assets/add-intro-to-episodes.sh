#!/usr/bin/env bash
#
# add-intro-to-episodes.sh  (macOS)
#
# For a folder that holds one sub-folder per episode (e.g. your "Under the Scope"
# folder with "2026-10-12 - God's Perfect Timing", etc.), this finds each
# episode's main YouTube video and puts the "Under the Scope" intro card on the
# front of it. The carded copy is saved right beside the original as
# "<name> - with intro.mp4". Your originals are never changed.
#
# ---------------------------------------------------------------------------
# SETUP
#   1. Install ffmpeg:   brew install ffmpeg
#   2. Have the intro card file somewhere (e.g. ~/Desktop/under-the-scope-intro-sting-v1.mp4)
#
# RUN
#   bash add-intro-to-episodes.sh  "/path/to/Under the Scope"  "/path/to/intro-card.mp4"
#
#   - Arg 1: the parent folder containing the episode sub-folders.
#   - Arg 2: the intro card video (defaults to one sitting next to this script).
#
# Notes:
#   - Only the top-level video in each episode folder is carded (prefers the file
#     with YOUTUBE in its name). Shorts/reels inside content360/, youtube/,
#     spotify/ sub-folders are left alone.
#   - Each episode is re-rendered so the join is clean, so this is SLOW — budget
#     several minutes to ~real-time per episode. Leave it running (e.g. overnight).
#   - Safe to re-run: episodes already carded are skipped.
#   - If your files live in iCloud/Drive and show a cloud icon, download them
#     first (right-click the folder > Download Now) so ffmpeg can read them.
# ---------------------------------------------------------------------------

set -u

PARENT="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STING="${2:-$SCRIPT_DIR/under-the-scope-intro-sting-v1.mp4}"
CRF=18; PRESET=medium

if [ -z "$PARENT" ] || [ ! -d "$PARENT" ]; then
  echo "ERROR: pass the folder that holds your episode sub-folders as the first argument."
  echo "  Example: bash add-intro-to-episodes.sh \"\$HOME/Library/Mobile Documents/com~apple~CloudDocs/Under the Scope\""
  exit 1
fi
if [ ! -f "$STING" ]; then
  echo "ERROR: can't find the intro card: $STING"
  echo "  Pass its path as the second argument."
  exit 1
fi
for bin in ffmpeg ffprobe; do
  command -v "$bin" >/dev/null 2>&1 || { echo "ERROR: '$bin' not found. Run: brew install ffmpeg"; exit 1; }
done

probe() { ffprobe -v error -select_streams "$1" -show_entries "$2" -of default=nw=1:nk=1 "$3" 2>/dev/null | head -1; }

made=0; skipped=0; failed=0
shopt -s nullglob

echo "Intro card : $STING"
echo "Episodes in: $PARENT"
echo "---------------------------------------------------------------"

for ep in "$PARENT"/*/; do
  epname="$(basename "$ep")"

  # Find the episode's main video (top level only; prefer the YOUTUBE one).
  vid=""
  for cand in "$ep"*[Yy][Oo][Uu][Tt][Uu][Bb][Ee]*.mp4 "$ep"*[Yy][Oo][Uu][Tt][Uu][Bb][Ee]*.mov; do
    case "$cand" in *" - with intro."*) continue;; esac   # ignore our own carded output
    [ -f "$cand" ] && { vid="$cand"; break; }
  done
  if [ -z "$vid" ]; then
    for cand in "$ep"*.mp4 "$ep"*.mov "$ep"*.m4v; do
      case "$cand" in *" - with intro."*) continue;; esac
      [ -f "$cand" ] && { vid="$cand"; break; }
    done
  fi
  if [ -z "$vid" ]; then
    echo "SKIP  $epname  (no top-level video found)"
    skipped=$((skipped+1)); continue
  fi

  base="$(basename "$vid")"; stem="${base%.*}"
  out="$ep$stem - with intro.mp4"
  if [ -f "$out" ]; then
    echo "SKIP  $epname  (already carded)"
    skipped=$((skipped+1)); continue
  fi

  # Match the card to this video's spec.
  W="$(probe v:0 stream=width "$vid")"; H="$(probe v:0 stream=height "$vid")"
  FPS="$(probe v:0 stream=r_frame_rate "$vid")"; PIX="$(probe v:0 stream=pix_fmt "$vid")"
  VCODEC="$(probe v:0 stream=codec_name "$vid")"; SAR="$(probe v:0 stream=sample_aspect_ratio "$vid")"
  AR="$(probe a:0 stream=sample_rate "$vid")"; ACH="$(probe a:0 stream=channels "$vid")"
  if [ -z "$W" ] || [ -z "$H" ]; then
    echo "FAIL  $epname  (couldn't read video; is it downloaded from iCloud?)"
    failed=$((failed+1)); continue
  fi
  [ -z "$FPS" ] && FPS="30"; [ -z "$PIX" ] && PIX="yuv420p"
  [ -z "$AR" ] && AR="48000"; [ -z "$ACH" ] && ACH="2"
  # If the episode is a very low frame rate (e.g. static image over audio),
  # render at 30 fps so the animated intro card stays smooth, not choppy.
  OUTFPS="$(awk -v f="$FPS" 'BEGIN{n=split(f,a,"/"); v=(n==2&&a[2]+0>0)?a[1]/a[2]:a[1]+0; if(v<24||v==0) print 30; else print f}')"
  case "$SAR" in ""|"N/A"|"0:1") SAR="1" ;; esac
  case "$ACH" in 1) LAYOUT="mono" ;; 6) LAYOUT="5.1" ;; *) LAYOUT="stereo"; ACH=2 ;; esac
  case "$VCODEC" in hevc|h265) VENC="libx265" ;; *) VENC="libx264" ;; esac

  echo "MAKE  $epname  ->  ${W}x${H} @ ${OUTFPS}fps"
  ffmpeg -v error -y -i "$STING" -i "$vid" -filter_complex "\
[0:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=${SAR},fps=${OUTFPS},format=${PIX}[cv];\
[0:a]aresample=${AR},aformat=sample_fmts=fltp:channel_layouts=${LAYOUT}[ca];\
[1:v]setsar=${SAR},fps=${OUTFPS},format=${PIX}[ev];\
[1:a]aresample=${AR},aformat=sample_fmts=fltp:channel_layouts=${LAYOUT}[ea];\
[cv][ca][ev][ea]concat=n=2:v=1:a=1[v][a]" \
    -map "[v]" -map "[a]" -c:v "$VENC" -pix_fmt "$PIX" -crf "$CRF" -preset "$PRESET" \
    -c:a aac -ar "$AR" -ac "$ACH" -b:a 192k -movflags +faststart "$out"

  if [ -s "$out" ]; then echo "DONE  $epname"; made=$((made+1))
  else echo "FAIL  $epname"; rm -f "$out"; failed=$((failed+1)); fi
done

echo "---------------------------------------------------------------"
echo "Finished. Carded: $made   Skipped: $skipped   Failed: $failed"
echo "Each carded video sits next to its original as '<name> - with intro.mp4'."