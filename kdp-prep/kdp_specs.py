"""KDP print specifications.

These are Amazon KDP's published values for paperback/hardcover print books.
Amazon's own Cover Template Generator and the KDP Help pages remain the
authoritative source -- always verify the final cover PDF dimensions there
before uploading. This module gets you to spec so the manual upload is quick.

References (Amazon KDP Help):
  - Trim size, bleed, and margins
  - Spine width / paper thickness
  - Cover calculator
"""

# Resolution KDP expects for print interiors and covers.
DPI = 300

# Bleed added to each *outer* edge when a book uses bleed (full-page art, etc.).
BLEED_IN = 0.125

# Minimum page count for KDP to allow text on the spine.
SPINE_TEXT_MIN_PAGES = 79

# Common KDP trim sizes, width x height in inches.
# You may also pass an arbitrary size as "WxH" (e.g. "6.5x9.5").
TRIM_SIZES = {
    "5x8":       (5.00, 8.00),
    "5.06x7.81": (5.06, 7.81),
    "5.25x8":    (5.25, 8.00),
    "5.5x8.5":   (5.50, 8.50),
    "6x9":       (6.00, 9.00),
    "6.14x9.21": (6.14, 9.21),
    "6.69x9.61": (6.69, 9.61),
    "7x10":      (7.00, 10.00),
    "7.44x9.69": (7.44, 9.69),
    "7.5x9.25":  (7.50, 9.25),
    "8x10":      (8.00, 10.00),
    "8.25x6":    (8.25, 6.00),
    "8.25x8.25": (8.25, 8.25),
    "8.5x8.5":   (8.50, 8.50),
    "8.5x11":    (8.50, 11.00),
}

# Per-page paper thickness in inches, used for spine width.
PAPER_THICKNESS = {
    "white": 0.002252,
    "cream": 0.0025,
    "color": 0.002347,
}


def resolve_trim(name):
    """Return (width_in, height_in) for a named trim size or a 'WxH' string."""
    key = name.strip().lower()
    if key in TRIM_SIZES:
        return TRIM_SIZES[key]
    if "x" in key:
        try:
            w, h = key.split("x", 1)
            return (float(w), float(h))
        except ValueError:
            pass
    raise ValueError(
        f"Unknown trim size '{name}'. Use one of "
        f"{', '.join(TRIM_SIZES)} or a custom 'WxH' like '6.5x9.5'."
    )


def inside_margin_in(page_count):
    """KDP recommended minimum inside (gutter) margin by page count."""
    if page_count <= 150:
        return 0.375
    if page_count <= 300:
        return 0.500
    if page_count <= 500:
        return 0.625
    if page_count <= 700:
        return 0.750
    return 0.875


def outside_margin_in(has_bleed):
    """KDP minimum outside margin."""
    return 0.375 if has_bleed else 0.25


def spine_width_in(page_count, paper):
    """Spine width in inches = page count x per-page paper thickness."""
    paper = paper.strip().lower()
    if paper not in PAPER_THICKNESS:
        raise ValueError(
            f"Unknown paper '{paper}'. Use one of {', '.join(PAPER_THICKNESS)}."
        )
    return page_count * PAPER_THICKNESS[paper]
