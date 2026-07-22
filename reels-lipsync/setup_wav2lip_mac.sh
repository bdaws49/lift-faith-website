#!/usr/bin/env bash
#
# setup_wav2lip_mac.sh — one-time setup for the photo -> talking-head pipeline
# on an Intel Mac (CPU only). Clones Wav2Lip, builds a Python 3.10 virtual-env,
# installs pinned dependencies, and verifies the model checkpoints.
#
# Usage:
#   bash setup_wav2lip_mac.sh
#
set -euo pipefail

# Always operate relative to this script's directory.
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

WAV2LIP_DIR="$HERE/Wav2Lip"
VENV_DIR="$HERE/.venv"

# --- Pick a Python 3.10 interpreter -----------------------------------------
PYBIN=""
for cand in python3.10 python3; do
  if command -v "$cand" >/dev/null 2>&1; then
    ver="$("$cand" -c 'import sys; print("%d.%d" % sys.version_info[:2])')"
    if [ "$ver" = "3.10" ]; then PYBIN="$cand"; break; fi
    # remember a fallback but keep looking for 3.10
    [ -z "$PYBIN" ] && PYBIN="$cand"
  fi
done

if [ -z "$PYBIN" ]; then
  echo "ERROR: No python3 found. Install it with:  brew install python@3.10 ffmpeg git"
  exit 1
fi

PYVER="$("$PYBIN" -c 'import sys; print("%d.%d" % sys.version_info[:2])')"
echo "==> Using Python $PYVER ($PYBIN)"
if [ "$PYVER" != "3.10" ]; then
  echo "    WARNING: Python 3.10 is strongly recommended for Wav2Lip."
  echo "    Install it with:  brew install python@3.10   then re-run this script."
fi

# --- ffmpeg check ------------------------------------------------------------
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ERROR: ffmpeg not found. Install it with:  brew install ffmpeg"
  exit 1
fi

# --- Clone Wav2Lip -----------------------------------------------------------
if [ ! -d "$WAV2LIP_DIR" ]; then
  echo "==> Cloning Wav2Lip..."
  git clone https://github.com/Rudrabha/Wav2Lip.git "$WAV2LIP_DIR"
else
  echo "==> Wav2Lip already cloned at $WAV2LIP_DIR"
fi

# --- Virtual-env + deps ------------------------------------------------------
if [ ! -d "$VENV_DIR" ]; then
  echo "==> Creating virtual-env at $VENV_DIR"
  "$PYBIN" -m venv "$VENV_DIR"
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"
echo "==> Upgrading pip and installing pinned requirements (this can take a while)..."
python -m pip install --upgrade pip
python -m pip install -r "$HERE/requirements.txt"

# --- Checkpoint verification -------------------------------------------------
GAN_CKPT="$WAV2LIP_DIR/checkpoints/wav2lip_gan.pth"
S3FD_CKPT="$WAV2LIP_DIR/face_detection/detection/sfd/s3fd.pth"
mkdir -p "$(dirname "$GAN_CKPT")" "$(dirname "$S3FD_CKPT")"

MISSING=0
if [ ! -f "$GAN_CKPT" ]; then
  MISSING=1
  echo ""
  echo "!! MISSING: wav2lip_gan.pth"
  echo "   Download it (free), then save it to:"
  echo "     $GAN_CKPT"
  echo "   Source: https://github.com/Rudrabha/Wav2Lip  (or a HuggingFace mirror; search 'wav2lip_gan.pth')"
fi
if [ ! -f "$S3FD_CKPT" ]; then
  MISSING=1
  echo ""
  echo "!! MISSING: s3fd.pth (face detector)"
  echo "   Download it (free), then save it to:"
  echo "     $S3FD_CKPT"
  echo "   Source: https://github.com/Rudrabha/Wav2Lip  (or a HuggingFace mirror; search 's3fd.pth')"
fi

echo ""
if [ "$MISSING" -eq 0 ]; then
  echo "==> Setup complete. Both checkpoints are present."
  echo "    Make a reel with:"
  echo "      bash animate_photo.sh --photo me.jpg --audio line.wav --out my_reel.mp4"
else
  echo "==> Almost there — download the checkpoint(s) listed above, then you're ready."
  echo "    (Re-run this script anytime to re-check that they're in place.)"
fi
