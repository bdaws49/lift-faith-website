#!/usr/bin/env bash
#
# setup-home-base.sh  (macOS)
#
# Sets up a single, tidy home for a show's files inside Google Drive (your 2 TB),
# so nothing gets scattered or lost again. Run it once PER SHOW.
# Safe to re-run — it only creates what's missing and never overwrites anything.
#
# It adds, inside "My Drive/<Show Name>/":
#   1. "_NEW EPISODE - TEMPLATE"  — duplicate this for each new episode
#   2. "Show Assets"              — the show's intro card + brand files
#   3. "_READ ME - Where Everything Goes.md" — the one-page guide
#
# RUN:
#   bash setup-home-base.sh "Under the Scope"
#   bash setup-home-base.sh "Where Was the Church"
# (Defaults to "Under the Scope". Auto-finds Google Drive; optional 2nd arg = path.)
# ---------------------------------------------------------------------------

set -u

SHOW="${1:-Under the Scope}"

detect_drive() {
  local d
  for d in "$HOME"/Library/CloudStorage/GoogleDrive-*/"My Drive"; do
    [ -d "$d" ] && { printf '%s' "$d"; return; }
  done
  [ -d "$HOME/Google Drive/My Drive" ] && { printf '%s' "$HOME/Google Drive/My Drive"; return; }
  [ -d "$HOME/Google Drive" ]          && { printf '%s' "$HOME/Google Drive"; return; }
  printf ''
}
DRIVE="${2:-$(detect_drive)}"
if [ -z "$DRIVE" ]; then
  echo "ERROR: Couldn't find your Google Drive folder. Make sure Google Drive for Desktop is running,"
  echo "or pass the path:  bash setup-home-base.sh \"$SHOW\" \"/path/to/My Drive\""
  exit 1
fi

BASE="$DRIVE/$SHOW"
mkdir -p "$BASE"
echo "Home base for \"$SHOW\": $BASE"

# ---- 1. Show Assets --------------------------------------------------------
mkdir -p "$BASE/Show Assets"
# Bring the Under the Scope intro card in as its master copy (that show only).
if [ "$SHOW" = "Under the Scope" ]; then
  for c in "$HOME/Desktop/underthescopeintrostingv1.mp4" "$HOME/Desktop/under-the-scope-intro-sting-v1.mp4"; do
    if [ -f "$c" ] && [ ! -f "$BASE/Show Assets/$(basename "$c")" ]; then
      cp -p "$c" "$BASE/Show Assets/" && echo "  + copied intro card into Show Assets"
    fi
  done
fi

# ---- 2. Reusable episode template ------------------------------------------
T="$BASE/_NEW EPISODE - TEMPLATE"
mkdir -p "$T/content360" "$T/youtube" "$T/spotify"

write_if_missing() { [ -f "$1" ] || cat > "$1"; }

write_if_missing "$T/0 - START HERE.txt" <<'EOF'
HOW TO START A NEW EPISODE
--------------------------
1. Duplicate this whole "_NEW EPISODE - TEMPLATE" folder.
2. Rename the copy to:   YYYY-MM-DD - Episode Title
   (use the PUBLISH date, e.g. 2026-11-03 - The God Who Provides)
3. Drop your files into the slots below and fill in the checklist.

KEEP EVERYTHING FOR AN EPISODE IN ITS OWN FOLDER. That is the whole rule.
Because this lives in Google Drive, it is automatically backed up to your 2 TB.
EOF

write_if_missing "$T/READ THIS - SAVE THE BACKGROUND IMAGE HERE.txt" <<'EOF'
SAVE THE EPISODE'S BACKGROUND IMAGE IN THIS FOLDER.

This is the still picture that sits behind your audio in the YouTube video.
An episode once lost its background because the image wasn't saved anywhere.
Never again: keep a copy of the background image right here, named:

    background.png   (or .jpg)

If you reuse one standard background, keep it in  ../Show Assets/  too.
EOF

write_if_missing "$T/script.md" <<'EOF'
# [Episode Title]

**Publish date:**
**Passage(s):**
**One-line premise:**

## Cold open / hook

## Intro sting (title animation ~0:08)
Insert the show's intro card from  ../Show Assets/  right after the hook.

## Body

## Application / takeaway

## Close & call to action
EOF

write_if_missing "$T/UPLOAD CHECKLIST.md" <<'EOF'
# Upload checklist — [Episode Title]

- [ ] Final video exported as:  [Title] — YOUTUBE.mp4
- [ ] Intro card on the front (from Show Assets)
- [ ] Background image saved in this folder (background.png)
- [ ] Podcast audio exported:  [Title] — PODCAST.mp3
- [ ] Thumbnail saved:  thumbnail.png
- [ ] 3+ Shorts in content360/
- [ ] Title written
- [ ] Description written
- [ ] Scheduled on YouTube for the publish date
- [ ] Posted to Spotify / audio host
EOF

echo "  + episode template ready"

# ---- 3. The guide (placeholder swapped for the show name) ------------------
GUIDE="$BASE/_READ ME - Where Everything Goes.md"
if [ ! -f "$GUIDE" ]; then
cat > "$GUIDE" <<'EOF'
# __SHOW__ — Where Everything Goes

**This folder (in Google Drive, on your 2 TB) is the ONE home for __SHOW__.**
It's backed up to the cloud automatically, so files can't just disappear, and
you never have to wonder "which computer / which drive did I put that on?"

## The one rule
Every episode gets **its own folder**, and **everything for that episode lives
inside it** — video, audio, the background image, thumbnail, script, shorts.

## Starting a new episode
1. Duplicate **`_NEW EPISODE - TEMPLATE`**.
2. Rename it to the publish date + title: **`2026-11-03 - The God Who Provides`**.
3. Fill it in. The template already reminds you where each piece goes.

## What lives where
- **`_NEW EPISODE - TEMPLATE/`** — the master copy. Duplicate it; don't work in it.
- **Each `YYYY-MM-DD - Title/` folder** — one complete episode.
- **`Show Assets/`** — this show's intro card, logo, and reusable brand pieces.

## The two habits that prevent lost files
1. **Always save the background image inside the episode folder.** That's the one
   that went missing before. If it's in the folder, it's safe forever.
2. **Do your work in this Google Drive folder** — not the Desktop, not iCloud, not
   loose downloads. One home = nothing scattered, everything backed up.

## Nice to know
- Deleted something by accident? Google Drive keeps a **30-day trash** and
  **version history** — right-click in drive.google.com to restore.

_Each show you run has its own folder like this one, all under the same My Drive._
EOF
  # swap the placeholder for the real show name
  sed -i '' "s/__SHOW__/$SHOW/g" "$GUIDE" 2>/dev/null || sed -i "s/__SHOW__/$SHOW/g" "$GUIDE"
  echo "  + guide written"
fi

echo "---------------------------------------------------------------"
echo "Done. \"$SHOW\" home base is set up. Open it here:"
echo "  $BASE"
