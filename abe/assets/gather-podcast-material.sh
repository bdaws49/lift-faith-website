#!/usr/bin/env bash
#
# gather-podcast-material.sh  (macOS)
#
# Finds your scattered podcast files, removes duplicates (by real file content,
# not just filename), and organizes ONE clean copy of each into a tidy
# "Under the Scope" folder inside Google Drive — which then syncs to your 2 TB.
#
# It NEVER deletes or moves your originals. It only COPIES. Worst case, you end
# up with an organized second copy and your originals are exactly as they were.
#
# ---------------------------------------------------------------------------
# HOW TO USE
#
#   1. DRY RUN first (looks, counts, finds duplicates, copies NOTHING):
#        bash gather-podcast-material.sh
#
#      It prints a summary and writes a full report to your Desktop:
#        ~/Desktop/under-the-scope-organize-report.txt
#      Read that. Make sure it's finding the right stuff (and not your family
#      photos). Tune the KEYWORDS list below if needed.
#
#   2. When the plan looks right, DO IT for real:
#        bash gather-podcast-material.sh apply
#
#   Optional: point it at specific folders instead of the default sweep:
#        bash gather-podcast-material.sh            ~/Desktop ~/Movies
#        bash gather-podcast-material.sh apply      ~/Desktop ~/Movies /Volumes/MyDrive
#
# Requires Google Drive for Desktop to be installed for the "apply" step, so the
# organized folder syncs to your 2 TB automatically. (Dry run needs nothing.)
# ---------------------------------------------------------------------------

set -u

# ---- WHAT COUNTS AS "PODCAST MATERIAL" -------------------------------------
# A file is gathered only if it's one of the media types below AND its full path
# (folder names + filename) contains one of these keywords. This is what keeps
# your vacation photos and grocery lists out. Add your own terms freely.
KEYWORDS=(
  "under the scope" "underthescope" "under_the_scope" "under-the-scope"
  "podcast" "sermon" "episode" "series" "bible" "lift faith" "liftfaith"
  "billy daws" "habakkuk" "joseph" "scope"
)

VIDEO_EXT="mp4 mov m4v mkv avi wmv webm flv mpg mpeg"
AUDIO_EXT="wav mp3 m4a aac aiff aif flac ogg"
IMAGE_EXT="jpg jpeg png tif tiff psd gif webp heic"
DOC_EXT="txt md rtf doc docx pdf pages key ppt pptx"

# ---- args ------------------------------------------------------------------
MODE="dryrun"
case "${1:-}" in
  apply)  MODE="apply";  shift ;;
  dryrun) MODE="dryrun"; shift ;;
esac

if [ "$#" -gt 0 ]; then
  # You explicitly named folders -> trust them: gather ALL media inside, no
  # keyword filter needed (handles topic-named folders like "where-was-the-church").
  ROOTS=( "$@" )
  EXPLICIT=1
else
  # Blind sweep of the whole Mac -> require a keyword so we don't scoop up
  # personal photos, home videos, and random documents.
  ROOTS=()
  for d in "$HOME/Desktop" "$HOME/Documents" "$HOME/Movies" "$HOME/Downloads" "$HOME/Music" "$HOME/Pictures"; do
    [ -d "$d" ] && ROOTS+=( "$d" )
  done
  for v in /Volumes/*; do [ -d "$v" ] && ROOTS+=( "$v" ); done
  EXPLICIT=0
fi

# ---- find the Google Drive folder ------------------------------------------
detect_drive() {
  local d
  for d in "$HOME"/Library/CloudStorage/GoogleDrive-*/"My Drive"; do
    [ -d "$d" ] && { printf '%s' "$d"; return; }
  done
  [ -d "$HOME/Google Drive/My Drive" ] && { printf '%s' "$HOME/Google Drive/My Drive"; return; }
  [ -d "$HOME/Google Drive" ]          && { printf '%s' "$HOME/Google Drive"; return; }
  printf ''
}
DRIVE="${DRIVE_DEST:-$(detect_drive)}"
DEST_ROOT="$DRIVE/Under the Scope"

if [ "$MODE" = "apply" ] && [ -z "$DRIVE" ]; then
  echo "ERROR: Couldn't find your Google Drive folder."
  echo "Install 'Google Drive for Desktop' and sign in first, then re-run."
  echo "(Or set a destination yourself:  DRIVE_DEST=\"/path/to/folder\" bash $0 apply )"
  exit 1
fi

REPORT="$HOME/Desktop/under-the-scope-organize-report.txt"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
CAND="$TMP/cand.tsv"; : > "$CAND"

# lowercase helper
lc() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }

# file size in bytes — works on macOS (BSD stat) and Linux (GNU stat)
fsize() { stat -f%z "$1" 2>/dev/null || stat -c%s "$1" 2>/dev/null; }

ext_category() {
  local e; e="$(lc "$1")"
  case " $VIDEO_EXT " in *" $e "*) echo video; return;; esac
  case " $AUDIO_EXT " in *" $e "*) echo audio; return;; esac
  case " $IMAGE_EXT " in *" $e "*) echo image; return;; esac
  case " $DOC_EXT "   in *" $e "*) echo doc;   return;; esac
  echo ""
}

path_has_keyword() {
  local p; p="$(lc "$1")"; local k
  for k in "${KEYWORDS[@]}"; do
    case "$p" in *"$k"*) return 0;; esac
  done
  return 1
}

episode_folder() {           # guess "Ep05" from a filename, else "_Unsorted"
  local n; n="$(lc "$1")"
  if [[ "$n" =~ (episode|ep)[[:space:]_.-]*([0-9]{1,3}) ]]; then
    printf 'Ep%02d' "$((10#${BASH_REMATCH[2]}))"
  else
    printf '_Unsorted'
  fi
}

dest_for() {                 # category, filename -> relative destination path
  local cat="$1" base="$2" ep
  case "$cat" in
    video) ep="$(episode_folder "$base")"; printf '01 – Episodes/%s/video/%s' "$ep" "$base" ;;
    audio) ep="$(episode_folder "$base")"; printf '01 – Episodes/%s/audio/%s' "$ep" "$base" ;;
    image) printf '04 – Thumbnails & Graphics/%s' "$base" ;;
    doc)   printf '02 – Scripts & Notes/%s' "$base" ;;
  esac
}

echo "Mode      : $MODE"
echo "Scanning  : ${ROOTS[*]}"
echo "Drive dest: ${DEST_ROOT:-<not set — dry run only>}"
echo "Working... (large drives can take a few minutes)"

# ---- 1) collect candidate files -------------------------------------------
for root in "${ROOTS[@]}"; do
  while IFS= read -r -d '' f; do
    case "$f" in "$DEST_ROOT"/*) continue;; esac           # don't re-scan our own output folder
    [ "$f" = "$REPORT" ] && continue                       # don't gather our own report
    base="${f##*/}"
    ext="${base##*.}"
    [ "$ext" = "$base" ] && continue                       # no extension
    cat="$(ext_category "$ext")"; [ -z "$cat" ] && continue
    [ "$EXPLICIT" -eq 1 ] || path_has_keyword "$f" || continue
    size="$(fsize "$f")"; [ -z "$size" ] && continue
    printf '%s\t%s\t%s\n' "$cat" "$size" "$f" >> "$CAND"
  done < <(find "$root" \
             \( -name '*.photoslibrary' -o -name '*.app' -o -name 'node_modules' -o -name '.git' \) -prune \
             -o -type f -print0 2>/dev/null)
done

TOTAL_FOUND="$(wc -l < "$CAND" | tr -d ' ')"
if [ "${TOTAL_FOUND:-0}" -eq 0 ]; then
  echo "No matching podcast files found. Try adding keywords, or pass folders to scan."
  exit 0
fi

# ---- 2) sizes that appear more than once (only these can be duplicates) -----
cut -f2 "$CAND" | sort | uniq -d > "$TMP/dupsizes.txt"

# ---- 3) walk candidates (sorted by path for stable "first copy") -----------
#         dedupe by content hash; build the plan
PLAN="$TMP/plan.tsv"; : > "$PLAN"     # status \t category \t size \t src \t reldest
SEEN="$TMP/seen.txt"; : > "$SEEN"

sort -t "$(printf '\t')" -k3 "$CAND" | while IFS="$(printf '\t')" read -r cat size src; do
  base="${src##*/}"
  if grep -Fxq "$size" "$TMP/dupsizes.txt"; then
    h="$(shasum -a 256 "$src" 2>/dev/null | awk '{print $1}')"
    key="H:$h"
  else
    key="U:$src"                       # unique size -> cannot be a duplicate
  fi
  if grep -Fxq "$key" "$SEEN"; then
    printf 'DUP\t%s\t%s\t%s\t\n' "$cat" "$size" "$src" >> "$PLAN"
  else
    echo "$key" >> "$SEEN"
    printf 'KEEP\t%s\t%s\t%s\t%s\n' "$cat" "$size" "$src" "$(dest_for "$cat" "$base")" >> "$PLAN"
  fi
done

# ---- 4) write the report ---------------------------------------------------
human() { awk -v b="$1" 'BEGIN{ s="B KB MB GB TB"; split(s,u," "); i=1; while(b>=1024 && i<5){b/=1024;i++} printf "%.1f %s", b, u[i] }'; }

keep_n="$(grep -c '^KEEP' "$PLAN" || true)"
dup_n="$(grep -c '^DUP' "$PLAN" || true)"
keep_bytes="$(awk -F'\t' '$1=="KEEP"{s+=$3} END{print s+0}' "$PLAN")"
dup_bytes="$(awk -F'\t' '$1=="DUP"{s+=$3} END{print s+0}' "$PLAN")"

{
  echo "UNDER THE SCOPE — podcast material organize report"
  echo "Mode: $MODE"
  echo "Destination: ${DEST_ROOT}"
  echo "Scanned: ${ROOTS[*]}"
  echo
  echo "SUMMARY"
  echo "  Files found (matching):  $TOTAL_FOUND"
  echo "  Unique to copy:          $keep_n   ($(human "$keep_bytes"))"
  echo "  Duplicates skipped:      $dup_n   ($(human "$dup_bytes") saved)"
  echo
  echo "  By type (unique copies):"
  awk -F'\t' '$1=="KEEP"{c[$2]++} END{for(k in c) printf "    %-6s %d\n", k, c[k]}' "$PLAN"
  echo
  echo "PLANNED COPIES  (source  =>  Under the Scope/destination)"
  awk -F'\t' '$1=="KEEP"{printf "  %s\n      => %s\n", $4, $5}' "$PLAN"
  echo
  echo "DUPLICATES SKIPPED  (identical content already covered above)"
  awk -F'\t' '$1=="DUP"{printf "  %s\n", $4}' "$PLAN"
} > "$REPORT"

echo "---------------------------------------------------------------"
echo "Found $TOTAL_FOUND files | $keep_n unique to copy ($(human "$keep_bytes")) | $dup_n duplicates ($(human "$dup_bytes") saved)"
echo "Full report: $REPORT"

# ---- 5) apply (copy) -------------------------------------------------------
if [ "$MODE" != "apply" ]; then
  echo
  echo "This was a DRY RUN — nothing was copied. Review the report above, then run:"
  echo "    bash $0 apply"
  exit 0
fi

echo "Copying into: $DEST_ROOT"
copied=0; exists=0
# Re-read the plan (KEEP rows) and copy.
grep '^KEEP' "$PLAN" | while IFS="$(printf '\t')" read -r status cat size src rel; do
  dest="$DEST_ROOT/$rel"
  mkdir -p "$(dirname "$dest")"
  if [ -f "$dest" ] && [ "$(fsize "$dest")" = "$size" ]; then
    exists=$((exists+1)); continue                         # already there, same size
  fi
  cp -p "$src" "$dest" && copied=$((copied+1))
done

echo "---------------------------------------------------------------"
echo "Done. Originals untouched. Organized copies are in:"
echo "    $DEST_ROOT"
echo "Google Drive will now sync them to your 2 TB. Report: $REPORT"
