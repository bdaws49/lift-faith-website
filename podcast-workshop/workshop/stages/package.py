"""Stage 5 — Package.

Build the episode landing page from the template and gather everything into a
single `upload/` folder you can post from: the full episode audio, the three
reels, the web page, and a plain-text show-notes file (title, summary, quotes
with timestamps, Scripture).
"""

from __future__ import annotations

import html
import shutil
from pathlib import Path

from ..config import Config, log
from ..project import Project

TEMPLATE = Path(__file__).resolve().parent.parent / "templates" / "episode.html"


def run(project: Project, cfg: Config) -> None:
    episode = project.data.get("episode")
    if not episode:
        raise RuntimeError("No episode to package — run the earlier stages first.")

    upload = project.upload_dir

    # 1. Landing page
    page = _build_page(episode, cfg)
    (upload / "index.html").write_text(page)

    # 2. Full episode audio
    full = project.audio_dir / "full_episode.mp3"
    if full.exists():
        shutil.copy2(full, upload / f"{project.data['slug']}.mp3")

    # 3. Reels
    for reel in episode.get("reels", []):
        f = reel.get("file")
        if f and (project.reels_dir / f).exists():
            shutil.copy2(project.reels_dir / f, upload / f)

    # 4. Show notes
    (upload / "show-notes.txt").write_text(_show_notes(episode, cfg))

    project.mark_done("package")
    log("package", f"upload bundle ready → {upload}")


def _build_page(ep: dict, cfg: Config) -> str:
    tpl = TEMPLATE.read_text()

    cards = []
    for reel in ep.get("reels", []):
        stamp = reel.get("timestamp", "")
        cards.append(
            '<div class="quote-card"><p>“{q}”</p><span class="stamp">{s}</span></div>'.format(
                q=html.escape(reel["quote"]), s=html.escape(stamp)
            )
        )

    series = ep.get("series", "").strip()
    banner = ""
    if series:
        banner = (
            '<div class="series-banner"><h2>Part of the series: <em>{s}</em></h2>'
            "<p>Follow the show so you don't miss one — each episode is a closer "
            "look at who He is.</p></div>"
        ).format(s=html.escape(series))

    tokens = {
        "{{TITLE}}": html.escape(ep["title"]),
        "{{TAGLINE}}": html.escape(ep["tagline"]),
        "{{SUMMARY}}": html.escape(ep["summary"]),
        "{{SHOW_NAME}}": html.escape(cfg.show_name),
        "{{SHOW_HOST}}": html.escape(cfg.show_host),
        "{{SERIES_BANNER}}": banner,
        "{{QUOTE_CARDS}}": "\n        ".join(cards),
        "{{SCRIPTURE_TEXT}}": html.escape(ep["scripture"].get("text", "")),
        "{{SCRIPTURE_REF}}": html.escape(ep["scripture"].get("ref", "")),
    }
    for k, v in tokens.items():
        tpl = tpl.replace(k, v)
    return tpl


def _show_notes(ep: dict, cfg: Config) -> str:
    lines = [
        f"{ep['title']} — {cfg.show_name}",
        f"with {cfg.show_host}",
        "",
        ep["tagline"],
        "",
        "ABOUT THIS EPISODE",
        ep["summary"],
        "",
        "LINES WORTH SITTING WITH",
    ]
    for reel in ep.get("reels", []):
        lines.append(f"  [{reel.get('timestamp','')}] \"{reel['quote']}\"")
    lines += [
        "",
        "SCRIPTURE",
        f"  {ep['scripture'].get('text','')}",
        f"  — {ep['scripture'].get('ref','')}",
    ]
    return "\n".join(lines) + "\n"
