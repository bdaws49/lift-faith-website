#!/usr/bin/env bash
#
# make_reel.sh — the full pipeline in one command:
#
#   text + photo + voice-sample  ->  cloned-voice speech  ->  talking photo  ->  vertical reel
#
# Chains OpenVoice (voice cloning) + Wav2Lip (lip-sync) + ffmpeg (9:16), all
# local/free/CPU. Requires both setups first:
#     bash setup_wav2lip_mac.sh
#     bash setup_voice_mac.sh
#
# Usage:
#   bash make_reel.sh --text "Welcome to my channel!" --photo me.jpg --voice sample.wav --out reel.mp4 [--fast] [--speed 1.0]
#   bash make_reel.sh --text-file script.txt --photo me.jpg --voice sample.wav --out reel.mp4
#
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VOICE_VENV="$HERE/.venv-voice"

# --- Defaults ----------------------------------------------------------------
TEXT=""
TEXT_FILE=""
PHOTO=""
VOICE=""
OUT="reel.mp4"
SPEED="1.0"
FAST_FLAG=""

# --- Parse args --------------------------------------------------------------
while [ $# -gt 0 ]; do
  case "$1" in
    --text)      TEXT="$2"; shift 2;;
    --text-file) TEXT_FILE="$2"; shift 2;;
    --photo)     PHOTO="$2"; shift 2;;
    --voice)     VOICE="$2"; shift 2;;
    --out)       OUT="$2"; shift 2;;
    --speed)     SPEED="$2"; shift 2;;
    --fast)      FAST_FLAG="--fast"; shift;;
    -h|--help)   grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0;;
    *) echo "Unknown option: $1"; exit 1;;
  esac
done

# --- Validate ----------------------------------------------------------------
[ -z "$PHOTO" ] && { echo "ERROR: --photo is required"; exit 1; }
[ -z "$VOICE" ] && { echo "ERROR: --voice (reference audio to clone) is required"; exit 1; }
[ -z "$TEXT" ] && [ -z "$TEXT_FILE" ] && { echo "ERROR: provide --text or --text-file"; exit 1; }
[ ! -f "$PHOTO" ] && { echo "ERROR: photo not found: $PHOTO"; exit 1; }
[ ! -f "$VOICE" ] && { echo "ERROR: voice sample not found: $VOICE"; exit 1; }
[ ! -d "$VOICE_VENV" ] && { echo "ERROR: voice env missing. Run: bash setup_voice_mac.sh"; exit 1; }

# --- Step 1: clone voice + speak the text -----------------------------------
SPEECH_WAV="$HERE/.reel_speech.wav"
echo "==> [1/2] Cloning voice and generating speech..."
# shellcheck disable=SC1091
source "$VOICE_VENV/bin/activate"
if [ -n "$TEXT_FILE" ]; then
  python "$HERE/clone_voice.py" --text-file "$TEXT_FILE" --voice "$VOICE" --out "$SPEECH_WAV" --speed "$SPEED"
else
  python "$HERE/clone_voice.py" --text "$TEXT" --voice "$VOICE" --out "$SPEECH_WAV" --speed "$SPEED"
fi
deactivate || true

[ ! -f "$SPEECH_WAV" ] && { echo "ERROR: voice step produced no audio."; exit 1; }

# --- Step 2: lip-sync the photo to that speech + make vertical --------------
echo "==> [2/2] Lip-syncing photo to the cloned voice and formatting for Reels..."
bash "$HERE/animate_photo.sh" --photo "$PHOTO" --audio "$SPEECH_WAV" --out "$OUT" $FAST_FLAG

rm -f "$SPEECH_WAV"
echo ""
echo "==> Reel complete: $OUT"
