#!/usr/bin/env bash
#
# animate_photo.sh — photo + audio -> vertical (9:16) talking-head reel.
# Runs Wav2Lip (CPU) to lip-sync a still photo to an audio clip, then reformats
# the result to 1080x1920 for Reels with ffmpeg.
#
# Usage:
#   bash animate_photo.sh --photo me.jpg --audio line.wav --out my_reel.mp4 [--fast] [--no-vertical]
#
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WAV2LIP_DIR="$HERE/Wav2Lip"
VENV_DIR="$HERE/.venv"

# --- Defaults ----------------------------------------------------------------
PHOTO=""
AUDIO=""
OUT="reel.mp4"
RESIZE_FACTOR=1
MAKE_VERTICAL=1

# --- Parse args --------------------------------------------------------------
while [ $# -gt 0 ]; do
  case "$1" in
    --photo)       PHOTO="$2"; shift 2;;
    --audio)       AUDIO="$2"; shift 2;;
    --out)         OUT="$2"; shift 2;;
    --fast)        RESIZE_FACTOR=2; shift;;
    --no-vertical) MAKE_VERTICAL=0; shift;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0;;
    *)
      echo "Unknown option: $1"; exit 1;;
  esac
done

# --- Validate ----------------------------------------------------------------
[ -z "$PHOTO" ] && { echo "ERROR: --photo is required"; exit 1; }
[ -z "$AUDIO" ] && { echo "ERROR: --audio is required"; exit 1; }
[ ! -f "$PHOTO" ] && { echo "ERROR: photo not found: $PHOTO"; exit 1; }
[ ! -f "$AUDIO" ] && { echo "ERROR: audio not found: $AUDIO"; exit 1; }
[ ! -d "$VENV_DIR" ] && { echo "ERROR: virtual-env missing. Run: bash setup_wav2lip_mac.sh"; exit 1; }

GAN_CKPT="$WAV2LIP_DIR/checkpoints/wav2lip_gan.pth"
S3FD_CKPT="$WAV2LIP_DIR/face_detection/detection/sfd/s3fd.pth"
[ ! -f "$GAN_CKPT" ]  && { echo "ERROR: missing $GAN_CKPT — see README 'model files'."; exit 1; }
[ ! -f "$S3FD_CKPT" ] && { echo "ERROR: missing $S3FD_CKPT — see README 'model files'."; exit 1; }

# Resolve inputs to absolute paths before we cd into Wav2Lip.
PHOTO="$(cd "$(dirname "$PHOTO")" && pwd)/$(basename "$PHOTO")"
AUDIO="$(cd "$(dirname "$AUDIO")" && pwd)/$(basename "$AUDIO")"
case "$OUT" in
  /*) : ;;                        # already absolute
  *)  OUT="$(pwd)/$OUT" ;;
esac

# --- Run Wav2Lip -------------------------------------------------------------
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

RAW_OUT="$HERE/.wav2lip_raw.mp4"
echo "==> Lip-syncing photo to audio with Wav2Lip (CPU — this is the slow part)..."
echo "    photo: $PHOTO"
echo "    audio: $AUDIO"
echo "    resize_factor: $RESIZE_FACTOR"

( cd "$WAV2LIP_DIR" && python inference.py \
    --checkpoint_path "checkpoints/wav2lip_gan.pth" \
    --face "$PHOTO" \
    --audio "$AUDIO" \
    --outfile "$RAW_OUT" \
    --resize_factor "$RESIZE_FACTOR" \
    --nosmooth )

[ ! -f "$RAW_OUT" ] && { echo "ERROR: Wav2Lip did not produce output."; exit 1; }

# --- Format for Reels --------------------------------------------------------
if [ "$MAKE_VERTICAL" -eq 1 ]; then
  echo "==> Formatting to vertical 1080x1920 for Reels..."
  ffmpeg -y -i "$RAW_OUT" \
    -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1" \
    -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 192k \
    "$OUT"
  rm -f "$RAW_OUT"
else
  mv "$RAW_OUT" "$OUT"
fi

echo ""
echo "==> Done!  Your reel: $OUT"
