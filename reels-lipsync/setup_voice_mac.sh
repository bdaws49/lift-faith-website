#!/usr/bin/env bash
#
# setup_voice_mac.sh — one-time setup for the VOICE CLONING step (OpenVoice V2 +
# MeloTTS) on an Intel Mac (CPU). Creates a SEPARATE virtual-env (.venv-voice)
# because OpenVoice needs newer deps than Wav2Lip — keeping them apart avoids
# dependency conflicts.
#
# Usage:
#   bash setup_voice_mac.sh
#
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

OPENVOICE_DIR="$HERE/OpenVoice"
VENV_DIR="$HERE/.venv-voice"

# --- Python 3.10 -------------------------------------------------------------
PYBIN=""
for cand in python3.10 python3; do
  if command -v "$cand" >/dev/null 2>&1; then
    ver="$("$cand" -c 'import sys; print("%d.%d" % sys.version_info[:2])')"
    if [ "$ver" = "3.10" ]; then PYBIN="$cand"; break; fi
    [ -z "$PYBIN" ] && PYBIN="$cand"
  fi
done
[ -z "$PYBIN" ] && { echo "ERROR: no python3 found. Try: brew install python@3.10"; exit 1; }
PYVER="$("$PYBIN" -c 'import sys; print("%d.%d" % sys.version_info[:2])')"
echo "==> Using Python $PYVER ($PYBIN)"
[ "$PYVER" != "3.10" ] && echo "    WARNING: Python 3.10 recommended for OpenVoice/MeloTTS."

# --- Clone OpenVoice ---------------------------------------------------------
if [ ! -d "$OPENVOICE_DIR" ]; then
  echo "==> Cloning OpenVoice..."
  git clone https://github.com/myshell-ai/OpenVoice.git "$OPENVOICE_DIR"
else
  echo "==> OpenVoice already cloned at $OPENVOICE_DIR"
fi

# --- Virtual-env + deps ------------------------------------------------------
if [ ! -d "$VENV_DIR" ]; then
  echo "==> Creating voice virtual-env at $VENV_DIR"
  "$PYBIN" -m venv "$VENV_DIR"
fi
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"
python -m pip install --upgrade pip wheel

echo "==> Installing OpenVoice (this pulls torch and can take a while)..."
python -m pip install -e "$OPENVOICE_DIR"

echo "==> Installing MeloTTS (base TTS engine)..."
python -m pip install "git+https://github.com/myshell-ai/MeloTTS.git"
python -m unidic download || echo "    (unidic download optional/non-fatal)"

# --- Checkpoints -------------------------------------------------------------
CKPT_DIR="$OPENVOICE_DIR/checkpoints_v2"
CONVERTER="$CKPT_DIR/converter/checkpoint.pth"
if [ ! -f "$CONVERTER" ]; then
  echo ""
  echo "!! MISSING: OpenVoice V2 checkpoints."
  echo "   1. Download 'checkpoints_v2' (free) from the OpenVoice V2 release:"
  echo "        https://github.com/myshell-ai/OpenVoice/blob/main/docs/USAGE.md"
  echo "        (direct: search the repo releases for 'checkpoints_v2.zip')"
  echo "   2. Unzip so this path exists:"
  echo "        $CONVERTER"
  echo "   Re-run this script to re-check."
else
  echo ""
  echo "==> Voice setup complete. OpenVoice V2 checkpoints found."
  echo "    Test it with:"
  echo "      source .venv-voice/bin/activate"
  echo "      python clone_voice.py --text \"Hello from my cloned voice.\" --voice sample.wav --out speech.wav"
fi
