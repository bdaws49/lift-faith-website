#!/usr/bin/env python3
"""Convert The Path to Spiritual Maturity (.docx) into a clean giveaway PDF."""
import re
import sys
import docx
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
)

SRC, OUT = sys.argv[1], sys.argv[2]

# --- fonts: DejaVu Serif renders curly quotes / em-dashes; strip color emoji ---
FONTS = {
    "Body": "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    "Body-Bold": "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
    "Body-Italic": "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf",
}
import os
have_fonts = all(os.path.exists(p) for p in FONTS.values())
if have_fonts:
    for name, path in FONTS.items():
        pdfmetrics.registerFont(TTFont(name, path))
    BODY, BOLD, ITAL = "Body", "Body-Bold", "Body-Italic"
else:
    BODY, BOLD, ITAL = "Times-Roman", "Times-Bold", "Times-Italic"

EMOJI = re.compile(
    "[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF⬀-⯿️]"
)

def clean(t: str) -> str:
    t = EMOJI.sub("", t)
    t = (t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
    return t.replace("\n", "<br/>").strip()

styles = getSampleStyleSheet()
title_style = ParagraphStyle("BookTitle", fontName=BOLD, fontSize=30, leading=36,
                             alignment=TA_CENTER, spaceAfter=18, textColor="#5C0F28")
subtitle_style = ParagraphStyle("Sub", fontName=ITAL, fontSize=15, leading=20,
                                alignment=TA_CENTER, spaceAfter=10, textColor="#333333")
front_style = ParagraphStyle("Front", fontName=BODY, fontSize=10.5, leading=15,
                             alignment=TA_CENTER, spaceAfter=8, textColor="#444444")
h1 = ParagraphStyle("H1", fontName=BOLD, fontSize=22, leading=26,
                    alignment=TA_LEFT, spaceBefore=6, spaceAfter=14, textColor="#5C0F28")
h2 = ParagraphStyle("H2", fontName=BOLD, fontSize=18, leading=22,
                    alignment=TA_CENTER, spaceBefore=6, spaceAfter=16, textColor="#8B1538")
h3 = ParagraphStyle("H3", fontName=BOLD, fontSize=13.5, leading=18,
                    spaceBefore=12, spaceAfter=6, textColor="#5C0F28")
h4 = ParagraphStyle("H4", fontName=ITAL, fontSize=12, leading=16,
                    spaceBefore=8, spaceAfter=4, textColor="#333333")
body = ParagraphStyle("BodyText2", fontName=BODY, fontSize=11.5, leading=17,
                      alignment=TA_JUSTIFY, spaceAfter=8, firstLineIndent=0)

d = docx.Document(SRC)
story = []
seen_title = False
first_h1 = True
first_h2 = True
for p in d.paragraphs:
    txt = p.text.strip()
    if not txt:
        continue
    name = p.style.name
    c = clean(txt)
    if not c:
        continue
    if name == "Title":
        story.append(Spacer(1, 1.8 * inch))
        story.append(Paragraph(c, title_style))
        seen_title = True
    elif name == "Heading 1":
        story.append(PageBreak())
        story.append(Paragraph(c, h1))
        first_h1 = False
    elif name == "Heading 2":
        story.append(PageBreak())
        story.append(Paragraph(c, h2))
    elif name == "Heading 3":
        story.append(Paragraph(c, h3))
    elif name == "Heading 4":
        story.append(Paragraph(c, h4))
    else:  # Normal / Normal (Web)
        # Front matter (before the first chapter) is centered & lighter.
        if first_h1:
            story.append(Paragraph(c, front_style))
        else:
            story.append(Paragraph(c, body))

def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont(BODY, 9)
    canvas.setFillColor("#999999")
    if doc.page > 1:
        canvas.drawCentredString(letter[0] / 2, 0.5 * inch, str(doc.page))
    canvas.restoreState()

doc = SimpleDocTemplate(OUT, pagesize=letter,
                        leftMargin=1 * inch, rightMargin=1 * inch,
                        topMargin=1 * inch, bottomMargin=0.9 * inch,
                        title="The Path to Spiritual Maturity", author="Billy Daws")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print("wrote", OUT, "pages≈", doc.page)
