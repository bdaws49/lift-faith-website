# tools

Small helper scripts (not part of the main pipeline).

## docx_to_pdf.py
Convert a Word manuscript into a clean giveaway PDF (title page, chapters on
new pages, part dividers).

```bash
pip install python-docx reportlab
python tools/docx_to_pdf.py path/to/book.docx giveaway/book.pdf
```
