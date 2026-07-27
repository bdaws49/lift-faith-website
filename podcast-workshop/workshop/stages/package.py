"""Stage 9 — Package.

Gather everything into an upload/ folder split by destination, so the manual
uploads at the end are just drag-and-drop:

    upload/spotify/      <- the episode audio + show notes  (audio to Spotify)
    upload/youtube/      <- the video + captions + description + thumbnail
    upload/content360/   <- the 3 reels + a distribution manifest
    upload/UPLOAD_CHECKLIST.md  <- the remaining manual steps

Also writes the episode landing page (episode.html) alongside the bundle.
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

    slug = project.data["slug"]
    up = project.upload_dir
    spotify = _sub(up, "spotify")
    youtube = _sub(up, "youtube")
    content360 = _sub(up, "content360")

    # --- Spotify: audio + notes ---
    full = project.audio_dir / "full_episode.mp3"
    if full.exists():
        shutil.copy2(full, spotify / f"{slug}.mp3")
    (spotify / "show-notes.txt").write_text(_show_notes(episode, cfg))

    # --- YouTube: video + captions + description + thumbnail ---
    yt_video = project.root / "video" / "youtube_episode.mp4"
    if yt_video.exists():
        shutil.copy2(yt_video, youtube / f"{slug}.mp4")
    srt = project.root / "captions" / "episode.srt"
    if srt.exists():
        shutil.copy2(srt, youtube / f"{slug}.srt")
    cover = project.root / "images" / "cover.png"
    if cover.exists():
        shutil.copy2(cover, youtube / "thumbnail.png")
    (youtube / "description.txt").write_text(_youtube_description(episode, cfg))

    # --- Content360: the 3 reels + per-reel post copy + manifest ---
    reels_made = []
    for n, reel in enumerate(episode.get("reels", []), start=1):
        f = reel.get("file")
        if f and (project.reels_dir / f).exists():
            dest = f"reel_{n}.mp4"
            shutil.copy2(project.reels_dir / f, content360 / dest)
            reels_made.append((n, reel))
            # The copy you paste when uploading this reel.
            if reel.get("description") or reel.get("first_comment"):
                (content360 / f"reel_{n}_description.txt").write_text(
                    (reel.get("description", "") + "\n").lstrip()
                )
                (content360 / f"reel_{n}_first_comment.txt").write_text(
                    (reel.get("first_comment", "") + "\n").lstrip()
                )
    (content360 / "manifest.txt").write_text(_content360_manifest(episode, cfg, reels_made))

    # --- Landing page + checklist ---
    (up / "episode.html").write_text(_build_page(episode, cfg))
    (up / "UPLOAD_CHECKLIST.md").write_text(_checklist(episode, cfg, slug))

    project.mark_done("package")
    log("package", f"upload bundle ready → {up}")


def _sub(parent: Path, name: str) -> Path:
    d = parent / name
    d.mkdir(parents=True, exist_ok=True)
    return d


# --------------------------------------------------------------------------- #
# Text artifacts
# --------------------------------------------------------------------------- #
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
    lines += ["", "SCRIPTURE",
              f"  {ep['scripture'].get('text','')}",
              f"  — {ep['scripture'].get('ref','')}"]
    return "\n".join(lines) + "\n"


def _youtube_description(ep: dict, cfg: Config) -> str:
    parts = [
        f"{ep['title']} | {cfg.show_name} with {cfg.show_host}",
        "",
        ep["summary"],
        "",
        "TIMESTAMPS",
    ]
    for reel in ep.get("reels", []):
        parts.append(f"  {reel.get('timestamp','')}  {reel['quote']}")
    parts += ["", f"Scripture: {ep['scripture'].get('ref','')}",
              "", "Follow the show so you don't miss an episode."]
    return "\n".join(parts) + "\n"


def _content360_manifest(ep: dict, cfg: Config, reels) -> str:
    lines = [f"{cfg.show_name} — reels for distribution", ""]
    for n, reel in reels:
        lines += [
            f"reel_{n}.mp4  —  {ep['title']} @ {reel.get('timestamp','')}",
            f"  quote: \"{reel['quote']}\"",
            f"  description: paste reel_{n}_description.txt",
            f"  first comment (pin it): paste reel_{n}_first_comment.txt",
            "",
        ]
    return "\n".join(lines)


def _tag(title: str) -> str:
    return "".join(w.capitalize() for w in title.split())[:30] or "Episode"


def _checklist(ep: dict, cfg: Config, slug: str) -> str:
    return "\n".join([
        f"# Upload checklist — {ep['title']}",
        "",
        "The grunt work is done. What's left is by hand:",
        "",
        "- [ ] **Fine-tune** — review the audio, reels, captions, and images; tweak anything.",
        f"- [ ] **Spotify** — upload `spotify/{slug}.mp3` + paste `spotify/show-notes.txt`.",
        f"- [ ] **YouTube** — upload `youtube/{slug}.mp4`, add `youtube/{slug}.srt`,",
        "        paste `youtube/description.txt`, set `youtube/thumbnail.png`.",
        "- [ ] **Content360** — upload the 3 reels in `content360/`; for each,",
        "        paste `reel_N_description.txt` and pin `reel_N_first_comment.txt`",
        "        (the prayer / support / book / free-copy appeals).",
        "",
    ]) + "\n"


# --------------------------------------------------------------------------- #
# Landing page
# --------------------------------------------------------------------------- #
def _build_page(ep: dict, cfg: Config) -> str:
    tpl = TEMPLATE.read_text()
    cards = []
    for reel in ep.get("reels", []):
        cards.append(
            '<div class="quote-card"><p>“{q}”</p><span class="stamp">{s}</span></div>'.format(
                q=html.escape(reel["quote"]), s=html.escape(reel.get("timestamp", ""))
            )
        )
    series = ep.get("series", "").strip()
    banner = ""
    if series:
        banner = (
            '<div class="series-banner"><h2>Part of the series: <em>{s}</em></h2>'
            "<p>Follow the show so you don't miss one.</p></div>"
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
