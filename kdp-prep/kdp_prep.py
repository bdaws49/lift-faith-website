#!/usr/bin/env python3
"""
KDP Prep -- a print-ready file pipeline for Amazon Kindle Direct Publishing.

This tool does NOT upload to Amazon. Amazon KDP has no public publishing API,
and automating the KDP website violates Amazon's Terms of Service and can get
your account suspended. Instead, this pipeline gets your covers, images, and
interior to KDP spec so the manual upload on kdp.amazon.com is quick and safe.

Commands
--------
  sizes                       List supported trim sizes and paper types.
  new     <book-name>         Scaffold a project folder for a book.
  cover   ...                 Spine/bleed math, blank template, cover validation.
  image   ...                 Upscale an image, set 300 DPI, validate for print.
  check-pdf ...               Validate an interior PDF's page size and count.

Run any command with -h for its options, e.g.:
  python kdp_prep.py cover -h

Requires: Python 3.8+, Pillow, pypdf   (see requirements.txt)
Optional: Real-ESRGAN / Upscayl on PATH for AI upscaling (else Lanczos is used).
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit("Pillow is required. Install it with:  pip install -r requirements.txt")

import kdp_specs as spec


# --------------------------------------------------------------------------- #
# small output helpers
# --------------------------------------------------------------------------- #

def rule(char="-", n=64):
    print(char * n)


def head(title):
    rule("=")
    print(title)
    rule("=")


def ok(msg):
    print(f"  [OK]   {msg}")


def warn(msg):
    print(f"  [WARN] {msg}")


def fail(msg):
    print(f"  [FAIL] {msg}")


def info(msg):
    print(f"         {msg}")


def px(inches):
    """Inches -> whole pixels at KDP's 300 DPI."""
    return round(inches * spec.DPI)


# --------------------------------------------------------------------------- #
# command: sizes
# --------------------------------------------------------------------------- #

def cmd_sizes(args):
    head("KDP supported trim sizes (width x height, inches)")
    for name, (w, h) in spec.TRIM_SIZES.items():
        print(f"  {name:<12}  {w} x {h} in    ({px(w)} x {px(h)} px @ {spec.DPI} DPI)")
    print()
    info("You can also pass a custom size as 'WxH', e.g. 6.5x9.5")
    print()
    head("Paper types (per-page thickness, used for spine width)")
    for name, t in spec.PAPER_THICKNESS.items():
        print(f"  {name:<8}  {t} in/page")
    print()
    info(f"Bleed adds {spec.BLEED_IN} in to each outer edge.")
    info(f"Spine text requires at least {spec.SPINE_TEXT_MIN_PAGES} pages.")


# --------------------------------------------------------------------------- #
# command: new (scaffold a book project)
# --------------------------------------------------------------------------- #

METADATA_TEMPLATE = """\
KDP LISTING METADATA -- {book}
================================================================
Fill this in, then copy each field into the matching box on
kdp.amazon.com when you create the paperback/hardcover.

Language:            English
Book Title:
Subtitle:
Series (optional):
Edition number (optional):
Author (primary):
Contributors (optional):     e.g. Editor, Illustrator, Foreword by
Description (<= 4000 chars):

Publishing rights:   [ ] I own the copyright   [ ] Public domain
Keywords (up to 7, one per line):
  1.
  2.
  3.
  4.
  5.
  6.
  7.
Categories (up to 3):
  1.
  2.
  3.

PRINT OPTIONS
ISBN:                [ ] Free KDP ISBN   [ ] My own ISBN: ____________
Trim size:           {trim}
Paper type:          {paper}   (white / cream / color)
Bleed:               {bleed}
Cover finish:        [ ] Matte   [ ] Glossy
Interior:            [ ] Black & white   [ ] Color

PRICING
List price (USD):
Royalty plan:        [ ] 60%
Territories:         [ ] All
================================================================
"""

CHECKLIST_TEMPLATE = """\
PRE-UPLOAD CHECKLIST -- {book}
================================================================
INTERIOR
  [ ] Final interior exported to PDF
  [ ] Page size matches trim ({trim}) -- run:  check-pdf
  [ ] All interior images are >= 300 DPI at placed size
  [ ] Inside/gutter margin adequate for page count
  [ ] Fonts embedded in the PDF

COVER
  [ ] Page count is FINAL (spine width depends on it)
  [ ] Spine width + full-cover size confirmed -- run:  cover
  [ ] Cross-checked against Amazon's own Cover Template Generator
  [ ] Cover is 300 DPI, no important text inside the 0.25" safe margin
  [ ] Spine text only if >= 79 pages

METADATA
  [ ] metadata.txt filled in
  [ ] Description proofread
  [ ] 7 keywords chosen
  [ ] Categories chosen

FINAL
  [ ] Ordered/checked KDP digital proof before publishing
================================================================
"""

PROJECT_CONFIG = {
    "title": "",
    "trim": spec.DEFAULT_TRIM,
    "paper": spec.DEFAULT_PAPER,
    "page_count": 0,
    "bleed": False,
    "notes": "Edit these values, then run cover/image/check-pdf with --project.",
}


def cmd_new(args):
    base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "projects")
    slug = "".join(c if c.isalnum() or c in "-_" else "-" for c in args.name.strip().lower())
    proj = os.path.join(base, slug)
    if os.path.exists(proj) and not args.force:
        sys.exit(f"Project already exists: {proj}\nUse --force to overwrite scaffolding.")

    for sub in ("source", "output"):
        os.makedirs(os.path.join(proj, sub), exist_ok=True)

    cfg = dict(PROJECT_CONFIG, title=args.name)
    with open(os.path.join(proj, "config.json"), "w") as f:
        json.dump(cfg, f, indent=2)

    fields = {"book": args.name, "trim": cfg["trim"], "paper": cfg["paper"],
              "bleed": "yes" if cfg["bleed"] else "no"}
    with open(os.path.join(proj, "metadata.txt"), "w") as f:
        f.write(METADATA_TEMPLATE.format(**fields))
    with open(os.path.join(proj, "checklist.txt"), "w") as f:
        f.write(CHECKLIST_TEMPLATE.format(**fields))

    head(f"Created project: {slug}")
    print(f"  {proj}/")
    print("    config.json      <- set title, trim, paper, page_count, bleed")
    print("    source/          <- put your raw manuscript PDF & images here")
    print("    output/          <- KDP-ready files are written here")
    print("    metadata.txt     <- fill in, then copy into KDP at upload time")
    print("    checklist.txt    <- work through before you publish")
    print()
    info("Next: edit config.json, drop files in source/, then run e.g.")
    info(f"  python kdp_prep.py cover --project {slug}")


def load_project(name):
    base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "projects")
    proj = os.path.join(base, name)
    cfg_path = os.path.join(proj, "config.json")
    if not os.path.exists(cfg_path):
        sys.exit(f"No project '{name}' found (expected {cfg_path}). Run: new {name}")
    with open(cfg_path) as f:
        cfg = json.load(f)
    cfg["_dir"] = proj
    return cfg


# --------------------------------------------------------------------------- #
# command: cover
# --------------------------------------------------------------------------- #

def compute_cover(trim, page_count, paper, has_bleed=True):
    """Return a dict of full-cover geometry. Covers always use bleed."""
    tw, th = spec.resolve_trim(trim)
    spine = spec.spine_width_in(page_count, paper)
    bleed = spec.BLEED_IN
    full_w = 2 * tw + spine + 2 * bleed
    full_h = th + 2 * bleed
    return {
        "trim": trim, "trim_w_in": tw, "trim_h_in": th,
        "paper": paper, "page_count": page_count,
        "spine_in": round(spine, 4),
        "bleed_in": bleed,
        "full_w_in": round(full_w, 4), "full_h_in": round(full_h, 4),
        "full_w_px": px(full_w), "full_h_px": px(full_h),
        "spine_px": px(spine),
        "dpi": spec.DPI,
        "spine_text_allowed": page_count >= spec.SPINE_TEXT_MIN_PAGES,
    }


def draw_cover_template(g, path):
    """Generate a blank full-cover PNG with bleed/spine/safe-zone guides."""
    W, H = g["full_w_px"], g["full_h_px"]
    bleed = px(g["bleed_in"])
    trim_w = px(g["trim_w_in"])
    spine = g["spine_px"]
    safe = px(0.25)  # text-safe inset from trim edge

    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)

    back_x0 = bleed
    spine_x0 = bleed + trim_w
    spine_x1 = spine_x0 + spine
    front_x1 = spine_x1 + trim_w
    top = bleed
    bot = H - bleed

    # Trim boundary (green) -- where the cover is cut.
    d.rectangle([back_x0, top, front_x1, bot], outline=(0, 150, 0), width=3)
    # Spine fold lines (blue).
    d.line([spine_x0, 0, spine_x0, H], fill=(0, 90, 220), width=3)
    d.line([spine_x1, 0, spine_x1, H], fill=(0, 90, 220), width=3)
    # Text-safe zone inside trim (red, dashed-ish via short segments).
    for (x0, x1) in ((back_x0, spine_x0), (spine_x1, front_x1)):
        d.rectangle([x0 + safe, top + safe, x1 - safe, bot - safe],
                    outline=(220, 40, 40), width=2)

    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", 40)
    except Exception:
        font = ImageFont.load_default()
    d.text((back_x0 + safe + 20, top + safe + 20), "BACK COVER", fill=(120, 120, 120), font=font)
    d.text((spine_x1 + safe + 20, top + safe + 20), "FRONT COVER", fill=(120, 120, 120), font=font)
    if spine > 60:
        d.text((spine_x0 + 8, H // 2), "SPINE", fill=(120, 120, 120), font=font)

    img.save(path, dpi=(spec.DPI, spec.DPI))
    return path


def validate_cover_image(path, g):
    """Check a supplied cover file against required geometry."""
    with Image.open(path) as im:
        w, h = im.size
        mode = im.mode
        dpi = im.info.get("dpi", (None, None))

    need_w, need_h = g["full_w_px"], g["full_h_px"]
    print(f"  file:   {os.path.basename(path)}")
    print(f"  size:   {w} x {h} px   (need {need_w} x {need_h} px)")
    tol = px(0.03)  # ~0.03 in tolerance
    if abs(w - need_w) <= tol and abs(h - need_h) <= tol:
        ok("Dimensions match the full cover (back + spine + front + bleed).")
    else:
        fail("Dimensions do not match. Resize the cover to the size above.")
    if dpi and dpi[0]:
        (ok if dpi[0] >= spec.DPI - 1 else warn)(f"Embedded DPI: {dpi[0]}")
    else:
        warn("No DPI tag found. Effective DPI depends on pixel size at print scale.")
    (ok if mode in ("RGB", "CMYK") else warn)(f"Color mode: {mode} (RGB or CMYK expected)")


def cmd_cover(args):
    if args.project:
        cfg = load_project(args.project)
        trim = args.trim or cfg.get("trim") or spec.DEFAULT_TRIM
        paper = args.paper or cfg.get("paper") or spec.DEFAULT_PAPER
        pages = args.pages or cfg["page_count"]
        out_dir = args.out_dir or os.path.join(cfg["_dir"], "output")
        cover_in = args.input or _first_match(os.path.join(cfg["_dir"], "source"),
                                              ("cover",))
    else:
        trim = args.trim or spec.DEFAULT_TRIM
        paper = args.paper or spec.DEFAULT_PAPER
        pages = args.pages
        out_dir = args.out_dir or "."
        cover_in = args.input

    if not pages:
        sys.exit("Page count is required for spine width. Pass --pages N "
                 "(or set page_count in the project config).")

    g = compute_cover(trim, pages, paper)
    head(f"Cover spec: {trim}, {pages} pages, {paper} paper")
    print(f"  Spine width:      {g['spine_in']} in   ({g['spine_px']} px)")
    print(f"  Full cover size:  {g['full_w_in']} x {g['full_h_in']} in")
    print(f"                    {g['full_w_px']} x {g['full_h_px']} px @ {spec.DPI} DPI")
    print(f"  Layout:           bleed | back {g['trim_w_in']}\" | spine "
          f"{g['spine_in']}\" | front {g['trim_w_in']}\" | bleed")
    (ok if g["spine_text_allowed"] else warn)(
        "Spine text allowed" if g["spine_text_allowed"]
        else f"Spine text NOT allowed (< {spec.SPINE_TEXT_MIN_PAGES} pages)")
    warn("Confirm against Amazon's Cover Template Generator before final upload.")
    print()

    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "cover_spec.json"), "w") as f:
        json.dump(g, f, indent=2)
    ok(f"Wrote spec sheet: {os.path.join(out_dir, 'cover_spec.json')}")

    if args.template:
        tpath = os.path.join(out_dir, f"cover_template_{trim}_{pages}p.png")
        draw_cover_template(g, tpath)
        ok(f"Wrote blank cover template: {tpath}")

    if cover_in:
        print()
        rule()
        print("Validating supplied cover:")
        validate_cover_image(cover_in, g)


# --------------------------------------------------------------------------- #
# command: image  (upscale + set 300 DPI + validate)
# --------------------------------------------------------------------------- #

def find_upscaler():
    for name in ("realesrgan-ncnn-vulkan", "upscayl-bin", "upscayl", "realesrgan"):
        p = shutil.which(name)
        if p:
            return p
    return None


def ai_upscale(src, scale):
    """Run an external Real-ESRGAN/Upscayl binary. Returns output path or None."""
    binary = find_upscaler()
    if not binary:
        return None
    out = tempfile.NamedTemporaryFile(suffix=".png", delete=False).name
    try:
        subprocess.run([binary, "-i", src, "-o", out, "-s", str(scale)],
                       check=True, capture_output=True)
        return out
    except (subprocess.CalledProcessError, OSError):
        return None


def cmd_image(args):
    if args.project:
        cfg = load_project(args.project)
        trim = args.trim or cfg.get("trim") or spec.DEFAULT_TRIM
        out_dir = args.out_dir or os.path.join(cfg["_dir"], "output")
    else:
        trim = args.trim or spec.DEFAULT_TRIM
        out_dir = args.out_dir or "."

    if not os.path.exists(args.input):
        sys.exit(f"Input not found: {args.input}")

    # Target print size on the page.
    if args.placement:
        pw, ph = (float(x) for x in args.placement.lower().split("x", 1))
    elif trim:
        tw, th = spec.resolve_trim(trim)
        if args.bleed:
            pw, ph = tw + spec.BLEED_IN, th + 2 * spec.BLEED_IN
        else:
            pw, ph = tw, th
    else:
        sys.exit("Give a target size with --placement WxH or --trim NAME.")

    need_w, need_h = px(pw), px(ph)
    head(f"Image prep: target {pw} x {ph} in  ->  {need_w} x {need_h} px @ {spec.DPI} DPI")

    with Image.open(args.input) as im:
        im = im.convert("RGB") if im.mode not in ("RGB", "RGBA", "L") else im
        src_w, src_h = im.size
        print(f"  source: {src_w} x {src_h} px")

        working = args.input
        if src_w < need_w or src_h < need_h:
            scale = min(4, max(2, -(-max(need_w / src_w, need_h / src_h) // 1)))
            scale = int(scale)
            up = ai_upscale(args.input, scale) if not args.no_ai else None
            if up:
                ok(f"AI-upscaled x{scale} with {os.path.basename(find_upscaler())}")
                working = up
            else:
                if not args.no_ai:
                    warn("No Real-ESRGAN/Upscayl found on PATH -- using Lanczos resample.")
                    info("For best print quality install Upscayl and re-run.")
        else:
            ok("Source already large enough; no upscaling needed.")

        with Image.open(working) as w_im:
            w_im = w_im.convert("RGB")
            # Final exact-size resample to the print pixel target.
            if w_im.size != (need_w, need_h):
                w_im = w_im.resize((need_w, need_h), Image.LANCZOS)

            os.makedirs(out_dir, exist_ok=True)
            fmt = args.format.lower()
            stem = os.path.splitext(os.path.basename(args.input))[0]
            out_path = os.path.join(out_dir, f"{stem}_kdp.{fmt}")
            save_kw = {"dpi": (spec.DPI, spec.DPI)}
            if fmt in ("jpg", "jpeg"):
                save_kw["quality"] = 95
            elif fmt == "tif" or fmt == "tiff":
                save_kw["compression"] = "tiff_lzw"
            w_im.save(out_path, **save_kw)

    print()
    ok(f"Effective resolution now {spec.DPI} DPI at {pw} x {ph} in.")
    ok(f"Wrote: {out_path}")
    if src_w < need_w or src_h < need_h:
        warn("Image was enlarged -- upscaling cannot invent detail that "
             "was not in the original. Start from the highest-res source you have.")


def _first_match(folder, keywords):
    if not os.path.isdir(folder):
        return None
    for fn in sorted(os.listdir(folder)):
        low = fn.lower()
        if any(k in low for k in keywords) and low.endswith(
                (".png", ".jpg", ".jpeg", ".tif", ".tiff")):
            return os.path.join(folder, fn)
    return None


# --------------------------------------------------------------------------- #
# command: check-pdf
# --------------------------------------------------------------------------- #

def cmd_check_pdf(args):
    try:
        from pypdf import PdfReader
    except ImportError:
        sys.exit("pypdf is required for check-pdf. Install:  pip install -r requirements.txt")

    if args.project:
        cfg = load_project(args.project)
        trim = args.trim or cfg.get("trim") or spec.DEFAULT_TRIM
        has_bleed = args.bleed or cfg.get("bleed", False)
        pdf_in = args.input or _first_pdf(os.path.join(cfg["_dir"], "source"))
    else:
        trim = args.trim or spec.DEFAULT_TRIM
        has_bleed, pdf_in = args.bleed, args.input

    if not pdf_in or not os.path.exists(pdf_in):
        sys.exit("No interior PDF found. Pass --input path/to/interior.pdf")

    tw, th = spec.resolve_trim(trim)
    exp_w = tw + (spec.BLEED_IN if has_bleed else 0)
    exp_h = th + (2 * spec.BLEED_IN if has_bleed else 0)

    reader = PdfReader(pdf_in)
    n = len(reader.pages)
    head(f"Interior check: {os.path.basename(pdf_in)}")
    print(f"  Trim:        {trim}  ({'with' if has_bleed else 'no'} bleed)")
    print(f"  Expected page size: {round(exp_w,3)} x {round(exp_h,3)} in")
    print(f"  Page count:  {n}")

    # PDF points -> inches (72 pt = 1 in).
    sizes = {}
    for pg in reader.pages:
        box = pg.mediabox
        w_in = round(float(box.width) / 72.0, 3)
        h_in = round(float(box.height) / 72.0, 3)
        sizes[(w_in, h_in)] = sizes.get((w_in, h_in), 0) + 1

    print()
    tol = 0.02
    all_good = True
    for (w_in, h_in), count in sorted(sizes.items(), key=lambda x: -x[1]):
        match = abs(w_in - exp_w) <= tol and abs(h_in - exp_h) <= tol
        line = f"{count} page(s) at {w_in} x {h_in} in"
        if match:
            ok(line + "  -- matches trim")
        else:
            all_good = False
            fail(line + "  -- does NOT match expected size")

    print()
    im = spec.inside_margin_in(n)
    om = spec.outside_margin_in(has_bleed)
    info(f"Recommended inside/gutter margin for {n} pages: >= {im} in")
    info(f"Recommended outside margin: >= {om} in")
    if n < 24:
        warn("KDP paperbacks generally need at least 24 pages.")
    print()
    (ok if all_good else fail)(
        "All pages match trim size." if all_good
        else "Fix page size mismatches before uploading.")
    warn("Margin, embedded-font, and image-DPI checks inside the PDF still "
         "need a visual proof -- order a KDP digital proof before publishing.")


def _first_pdf(folder):
    if not os.path.isdir(folder):
        return None
    for fn in sorted(os.listdir(folder)):
        if fn.lower().endswith(".pdf"):
            return os.path.join(folder, fn)
    return None


# --------------------------------------------------------------------------- #
# command: ebook-cover  (Kindle eBook cover prep + validation)
# --------------------------------------------------------------------------- #

def cmd_ebook_cover(args):
    iw, ih = spec.KINDLE_COVER_IDEAL
    head("Kindle eBook cover spec")
    print(f"  Ideal size:   {iw} x {ih} px (width x height)")
    print(f"  Ratio:        {spec.KINDLE_COVER_RATIO}:1 (height : width)")
    print(f"  Minimum:      >= {spec.KINDLE_COVER_MIN_SHORT} px on the shortest side")
    print(f"  Format:       JPEG or TIFF, RGB (sRGB), under {spec.KINDLE_COVER_MAX_MB} MB")
    info("The eBook cover is separate from the print (wraparound) cover -- "
         "it is front-only.")

    src = args.input
    if not src and args.project:
        cfg = load_project(args.project)
        src = _first_match(os.path.join(cfg["_dir"], "source"), ("cover",))
        out_dir = args.out_dir or os.path.join(cfg["_dir"], "output")
    else:
        out_dir = args.out_dir or "."
    if not src:
        print()
        info("Pass --input path/to/cover.jpg to validate or build an eBook cover.")
        return
    if not os.path.exists(src):
        sys.exit(f"Input not found: {src}")

    print()
    rule()
    print(f"Checking: {os.path.basename(src)}")
    with Image.open(src) as im:
        w, h = im.size
        mode = im.mode
        ratio = h / w if w else 0
        print(f"  size:   {w} x {h} px   (ratio {ratio:.2f}:1)")

        short = min(w, h)
        long = max(w, h)
        (ok if short >= spec.KINDLE_COVER_MIN_SHORT else fail)(
            f"Shortest side {short} px "
            f"({'>=' if short >= spec.KINDLE_COVER_MIN_SHORT else '<'} "
            f"{spec.KINDLE_COVER_MIN_SHORT} px minimum)")
        ratio_ok = abs(ratio - spec.KINDLE_COVER_RATIO) <= 0.05
        (ok if ratio_ok else warn)(
            f"Aspect ratio {ratio:.2f}:1 "
            f"({'matches' if ratio_ok else 'differs from'} the ideal "
            f"{spec.KINDLE_COVER_RATIO}:1)")
        (ok if long <= spec.KINDLE_COVER_MAX_LONG else fail)(
            f"Longest side {long} px (max {spec.KINDLE_COVER_MAX_LONG})")
        (ok if mode in ("RGB", "L") else warn)(
            f"Color mode: {mode} (RGB expected; CMYK is not accepted for eBooks)")
        size_mb = os.path.getsize(src) / (1024 * 1024)
        (ok if size_mb <= spec.KINDLE_COVER_MAX_MB else fail)(
            f"File size: {size_mb:.1f} MB (max {spec.KINDLE_COVER_MAX_MB} MB)")

        if args.build:
            os.makedirs(out_dir, exist_ok=True)
            rgb = im.convert("RGB")
            iw, ih = spec.KINDLE_COVER_IDEAL
            if not ratio_ok:
                warn("Ratio is not 1.6:1 -- resizing to ideal would distort the "
                     "image. Re-crop the source to 1.6:1 first, then re-run --build.")
            else:
                if short >= spec.KINDLE_COVER_MIN_SHORT:
                    rgb = rgb.resize((iw, ih), Image.LANCZOS)
                else:
                    warn("Source is below the recommended minimum; enlarging it "
                         "cannot add detail.")
                    rgb = rgb.resize((iw, ih), Image.LANCZOS)
                stem = os.path.splitext(os.path.basename(src))[0]
                out_path = os.path.join(out_dir, f"{stem}_kindle.jpg")
                rgb.save(out_path, quality=90)
                print()
                ok(f"Wrote Kindle-ready cover: {out_path}")


# --------------------------------------------------------------------------- #
# command: check-epub  (validate an EPUB before upload)
# --------------------------------------------------------------------------- #

def _local(tag):
    """Strip an XML namespace: '{ns}title' -> 'title'."""
    return tag.rsplit("}", 1)[-1]


def cmd_check_epub(args):
    import zipfile
    import xml.etree.ElementTree as ET

    src = args.input
    if not src and args.project:
        cfg = load_project(args.project)
        folder = os.path.join(cfg["_dir"], "source")
        if os.path.isdir(folder):
            for fn in sorted(os.listdir(folder)):
                if fn.lower().endswith(".epub"):
                    src = os.path.join(folder, fn)
                    break
    if not src or not os.path.exists(src):
        sys.exit("No EPUB found. Pass --input path/to/book.epub")

    head(f"EPUB check: {os.path.basename(src)}")
    if not zipfile.is_zipfile(src):
        fail("Not a valid ZIP archive -- this is not a usable EPUB.")
        return

    problems = 0
    with zipfile.ZipFile(src) as z:
        names = z.namelist()

        # 1. mimetype must be first, stored uncompressed, exact content.
        if names and names[0] == "mimetype":
            info0 = z.getinfo("mimetype")
            content = z.read("mimetype").decode("ascii", "replace").strip()
            if content == "application/epub+zip":
                ok("mimetype is present, first, and correct.")
            else:
                problems += 1
                fail(f"mimetype content is '{content}', expected application/epub+zip.")
            if info0.compress_type != zipfile.ZIP_STORED:
                problems += 1
                warn("mimetype should be stored uncompressed (some validators reject it).")
        else:
            problems += 1
            fail("mimetype file is missing or not the first entry.")

        # 2. container.xml -> OPF path.
        opf_path = None
        if "META-INF/container.xml" in names:
            try:
                root = ET.fromstring(z.read("META-INF/container.xml"))
                for el in root.iter():
                    if _local(el.tag) == "rootfile" and el.get("full-path"):
                        opf_path = el.get("full-path")
                        break
                (ok if opf_path else fail)(
                    f"container.xml points to: {opf_path}" if opf_path
                    else "container.xml has no rootfile path.")
                if not opf_path:
                    problems += 1
            except ET.ParseError:
                problems += 1
                fail("container.xml is not valid XML.")
        else:
            problems += 1
            fail("META-INF/container.xml is missing.")

        # 3. Parse the OPF for metadata, spine, and cover.
        if opf_path and opf_path in names:
            try:
                opf = ET.fromstring(z.read(opf_path))
            except ET.ParseError:
                problems += 1
                fail("The OPF package file is not valid XML.")
                opf = None
            if opf is not None:
                meta = {"title": None, "creator": None, "language": None,
                        "identifier": None}
                spine_count = 0
                manifest_ids = {}
                cover_declared = False
                for el in opf.iter():
                    t = _local(el.tag)
                    txt = (el.text or "").strip()
                    if t in meta and txt and not meta[t]:
                        meta[t] = txt
                    if t == "item":
                        manifest_ids[el.get("id")] = el.get("href")
                        if (el.get("properties") or "").find("cover-image") >= 0:
                            cover_declared = True
                    if t == "itemref":
                        spine_count += 1
                    if t == "meta" and el.get("name") == "cover":
                        cover_declared = True

                print()
                print("  Metadata:")
                for k in ("title", "creator", "language", "identifier"):
                    label = {"creator": "author", "identifier": "identifier/ISBN"}.get(k, k)
                    val = meta[k] or "(missing)"
                    (ok if meta[k] else warn)(f"{label}: {val}")
                    if not meta[k]:
                        problems += 1
                print()
                (ok if spine_count else fail)(
                    f"Reading order (spine): {spine_count} document(s)")
                if not spine_count:
                    problems += 1
                (ok if cover_declared else warn)(
                    "Cover image is declared in the manifest." if cover_declared
                    else "No cover image declared -- upload one in KDP, or add a "
                         "cover-image to the EPUB.")
        elif opf_path:
            problems += 1
            fail(f"OPF file '{opf_path}' is referenced but not in the archive.")

    print()
    if problems == 0:
        ok("EPUB passed the structural checks. Preview it in Kindle Previewer "
           "before publishing.")
    else:
        warn(f"{problems} issue(s) found above. Fix them, or open the file in "
             "Kindle Create / Calibre / Sigil to repair, then re-check.")
    warn("This is a structural check only. Amazon's free Kindle Previewer is the "
         "authoritative test of how the book renders on devices.")


# --------------------------------------------------------------------------- #
# argument parsing
# --------------------------------------------------------------------------- #

def build_parser():
    p = argparse.ArgumentParser(
        prog="kdp_prep.py",
        description="Prepare print-ready files for Amazon KDP (no uploading).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="This tool does not upload to Amazon. It gets files to KDP spec "
               "so the manual upload is quick and safe.",
    )
    sub = p.add_subparsers(dest="command", required=True)

    sp = sub.add_parser("sizes", help="List trim sizes and paper types.")
    sp.set_defaults(func=cmd_sizes)

    sp = sub.add_parser("new", help="Scaffold a book project folder.")
    sp.add_argument("name", help="Book name, e.g. \"Daily Devotions\"")
    sp.add_argument("--force", action="store_true", help="Overwrite existing scaffolding.")
    sp.set_defaults(func=cmd_new)

    sp = sub.add_parser("cover", help="Spine/bleed math, template, cover validation.")
    sp.add_argument("--project", help="Use a project's config.json for defaults.")
    sp.add_argument("--trim", help="Trim size (default 6x9).")
    sp.add_argument("--pages", type=int, help="FINAL interior page count.")
    sp.add_argument("--paper", help="white | cream | color (default cream).")
    sp.add_argument("--input", help="Existing cover image to validate.")
    sp.add_argument("--template", action="store_true", help="Generate a blank guide template PNG.")
    sp.add_argument("--out-dir", help="Where to write outputs.")
    sp.set_defaults(func=cmd_cover)

    sp = sub.add_parser("image", help="Upscale an image, set 300 DPI, validate.")
    sp.add_argument("--input", required=True, help="Source image path.")
    sp.add_argument("--project", help="Use a project's config.json for defaults.")
    sp.add_argument("--trim", help="Target trim size for full-page images (default 6x9).")
    sp.add_argument("--placement", help="Target print size WxH in inches, e.g. 4x6.")
    sp.add_argument("--bleed", action="store_true", help="Add bleed to a full-page image.")
    sp.add_argument("--format", default="png", help="Output format: png | jpg | tif.")
    sp.add_argument("--no-ai", action="store_true", help="Skip AI upscaler, use Lanczos only.")
    sp.add_argument("--out-dir", help="Where to write outputs.")
    sp.set_defaults(func=cmd_image)

    sp = sub.add_parser("check-pdf", help="Validate an interior PDF's size and page count.")
    sp.add_argument("--input", help="Interior PDF path.")
    sp.add_argument("--project", help="Use a project's config.json for defaults.")
    sp.add_argument("--trim", help="Trim size (default 6x9).")
    sp.add_argument("--bleed", action="store_true", help="Interior uses bleed.")
    sp.set_defaults(func=cmd_check_pdf)

    sp = sub.add_parser("ebook-cover", help="Prep/validate a Kindle eBook cover.")
    sp.add_argument("--input", help="Cover image to validate.")
    sp.add_argument("--project", help="Use a project's source/ folder.")
    sp.add_argument("--build", action="store_true",
                    help="Also write a Kindle-ready 1600x2560 sRGB JPEG.")
    sp.add_argument("--out-dir", help="Where to write outputs.")
    sp.set_defaults(func=cmd_ebook_cover)

    sp = sub.add_parser("check-epub", help="Validate an EPUB before upload.")
    sp.add_argument("--input", help="EPUB file path.")
    sp.add_argument("--project", help="Use a project's source/ folder.")
    sp.set_defaults(func=cmd_check_epub)

    return p


def main(argv=None):
    args = build_parser().parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
