# KDP Prep

A small command-line pipeline that gets your **print book covers, images, and
interior** to Amazon KDP specification, so the manual upload on
[kdp.amazon.com](https://kdp.amazon.com) is quick and error-free.

## Important: this tool does not upload to Amazon

Amazon KDP has **no public API for publishing**, and automating the KDP
website with a bot **violates Amazon's Terms of Service** and can get your
account suspended. So this pipeline deliberately stops at the last safe step:
it produces validated, print-ready files and a filled-out metadata sheet.
You still click "Publish" yourself — but it becomes a copy-paste job instead
of an hour of fiddling with dimensions.

## What it does

| Command | What you get |
|---|---|
| `sizes` | All KDP trim sizes and paper types, in inches and pixels. |
| `new <name>` | A tidy project folder: `source/`, `output/`, a metadata sheet, and a pre-upload checklist. |
| `cover` | Spine width + full wraparound-cover size (inches **and** pixels), a blank guide template, and validation of a cover you already have. |
| `image` | Upscales an image (AI if available, else high-quality resample), stamps it to **300 DPI**, and confirms it meets 300 DPI at your print size. |
| `check-pdf` | Confirms your interior PDF's page size matches the trim, reports page count, and gives the right margins for that length. |

## Setup (one time)

```bash
cd kdp-prep
python3 -m pip install -r requirements.txt
```

**Optional but recommended for best image quality:** install
[Upscayl](https://github.com/upscayl/upscayl) or
[Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) and make sure its
command is on your PATH. If found, `image` uses it automatically; otherwise it
falls back to a high-quality Lanczos resample.

## Quick start

```bash
# 1. See what KDP supports
python3 kdp_prep.py sizes

# 2. Start a book (creates projects/my-book/)
python3 kdp_prep.py new "My Book"
#    -> edit projects/my-book/config.json (trim, paper, page_count, bleed)
#    -> drop your manuscript PDF and cover/images into projects/my-book/source/

# 3. Check the interior PDF is the right size
python3 kdp_prep.py check-pdf --project my-book

# 4. Get the cover spine/size + a blank guide template
python3 kdp_prep.py cover --project my-book --template

# 5. Prep a full-page interior image (with bleed) to 300 DPI
python3 kdp_prep.py image --project my-book --input projects/my-book/source/art.png --bleed
```

You can also run every command **without a project**, passing options directly:

```bash
python3 kdp_prep.py cover --trim 6x9 --pages 240 --paper cream --template
python3 kdp_prep.py image --input photo.jpg --placement 4x6 --format tif
python3 kdp_prep.py check-pdf --input interior.pdf --trim 6x9 --bleed
```

## How the cover math works

Full cover width = `bleed + back(trim width) + spine + front(trim width) + bleed`
and spine width = `page count x paper thickness`. Covers always use 0.125"
bleed on every outer edge, and KDP only allows spine text at **79+ pages**.

Because Amazon occasionally adjusts paper thickness, always cross-check the
generated `cover_spec.json` against Amazon's own
**Cover Template Generator** before you upload — it is the authoritative
source for the exact PDF dimensions. This tool gets you there in seconds and
catches mistakes; the KDP generator confirms them.

## Project layout

```
kdp-prep/
  kdp_prep.py        # the command-line program
  kdp_specs.py       # KDP trim sizes, paper, bleed, margin constants
  requirements.txt
  projects/
    my-book/
      config.json    # trim, paper, page_count, bleed for this book
      source/        # your raw manuscript PDF + cover/images
      output/        # KDP-ready files land here
      metadata.txt   # fill in, then copy into KDP at upload time
      checklist.txt  # work through before publishing
```

## What it can't check

Automated tools can't see everything a printer will. Before you hit publish,
**order a KDP digital proof** — it's the only reliable check of margins,
embedded fonts, color, and how images actually render at print size.
