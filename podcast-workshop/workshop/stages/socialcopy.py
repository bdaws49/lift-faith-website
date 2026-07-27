"""Stage — Social copy.

For each reel, write the post copy you'll paste when you upload:

  * description   — a short, scroll-stopping caption built from the quote, with a
                    soft CTA and hashtags.
  * first_comment — the pinned first comment carrying the four appeals:
                    (1) prayer, (2) financial support, (3) the book on Amazon,
                    (4) a free copy for the next supporter.

Descriptions are written by ChatGPT when a key is present (tailored to each
quote); otherwise a clean templated caption is used. The first comment is
templated from your links so it's consistent every time.

Stores description/first_comment onto each reel; the package stage writes them
into content360/.
"""

from __future__ import annotations

from ..config import Config, log
from ..project import Project


def run(project: Project, cfg: Config) -> None:
    episode = project.data.get("episode")
    if not episode:
        raise RuntimeError("No episode — run the earlier stages first.")

    reels = episode.get("reels", [])
    first_comment = build_first_comment(cfg)

    for n, reel in enumerate(reels, start=1):
        reel["description"] = _description(reel, episode, cfg)
        reel["first_comment"] = first_comment
        log("socialcopy", f"reel {n}: description + first comment ready.")

    episode["first_comment"] = first_comment
    project.mark_done("socialcopy")
    _warn_missing(cfg)


def build_first_comment(cfg: Config) -> str:
    support = cfg.support_url or "[add your support/giving link]"
    book_title = cfg.book_title or "[add your book title]"
    book_url = cfg.book_url or "[add your Amazon link]"
    return (
        "🙏 If this reached you today, would you do three things?\n\n"
        "1) PRAY — comment “praying,” and tell us how we can pray for YOU this "
        "week. We read every one and lift them by name.\n\n"
        "2) SUPPORT — Under the Scope is listener-funded. If God has used this "
        f"show in your life, help us keep making it: {support}\n\n"
        f"3) GO DEEPER — the book “{book_title}” takes these truths further: "
        f"{book_url}\n\n"
        "❤️ And we mean this: the NEXT person to support the show gets a FREE "
        "copy of the book. Support, then comment “BOOK” — we’re watching for you."
    )


def _description(reel: dict, episode: dict, cfg: Config) -> str:
    quote = reel["quote"]
    title = episode["title"]
    ref = episode["scripture"].get("ref", "")
    hashtags = _hashtags(title, ref)

    body = _ai_caption(quote, episode, cfg)
    if not body:
        body = (
            f"“{quote}”\n\n"
            f"🔍 {cfg.show_name} with {cfg.show_host} — “{title}.” "
            f"One detail in {ref}, put under the lens. Full episode out now — "
            f"follow so you don’t miss one."
        )
    return f"{body}\n\n{hashtags}"


def _ai_caption(quote: str, episode: dict, cfg: Config) -> str:
    if not cfg.openai_api_key:
        return ""
    try:
        from openai import OpenAI

        client = OpenAI(api_key=cfg.openai_api_key)
        resp = client.chat.completions.create(
            model=cfg.openai_model,
            temperature=0.8,
            messages=[
                {"role": "system", "content":
                    "You write short, scroll-stopping social captions for a "
                    "Christian podcast reel. Warm, punchy, pastoral. 2-4 short "
                    "lines. Open with or build on the quote, add one line of "
                    "intrigue, end with a soft 'full episode out now / follow' "
                    "CTA. No hashtags (added separately). No emojis except at "
                    "most one."},
                {"role": "user", "content":
                    f"Show: {cfg.show_name} with {cfg.show_host}\n"
                    f"Episode: {episode['title']}\n"
                    f"Scripture: {episode['scripture'].get('ref','')}\n"
                    f"Reel quote: \"{quote}\""},
            ],
        )
        return resp.choices[0].message.content.strip()
    except Exception as exc:  # non-fatal; fall back to template
        log("socialcopy", f"AI caption failed ({exc}); using template.")
        return ""


def _hashtags(title: str, ref: str) -> str:
    tag = "".join(w.capitalize() for w in title.split() if w.isalpha())[:24]
    book = ref.split()[0] if ref else ""
    tags = ["#UnderTheScope", "#Bible", "#Faith", "#Scripture", "#Jesus",
            "#DailyDevotion", "#Christian"]
    if tag:
        tags.append(f"#{tag}")
    if book:
        tags.append(f"#{book}")
    return " ".join(tags)


def _warn_missing(cfg: Config) -> None:
    missing = []
    if not cfg.support_url:
        missing.append("SUPPORT_URL")
    if not cfg.book_title:
        missing.append("BOOK_TITLE")
    if not cfg.book_url:
        missing.append("BOOK_URL")
    if missing:
        log("socialcopy",
            "heads up — set " + ", ".join(missing) + " in .env so the first "
            "comment has your real links (placeholders used for now).")
