# How to Use Barb (plain-English guide)

Barb is your publishing manager. You **talk to her like a person** — in plain
English — and she keeps every book organized: status, word count, cover, ISBN,
KDP files, marketing, launch checklist, reader bonuses, and reviews. No commands
to memorize.

---

## Reaching Barb

Come back to this project (the `lift-faith-website` workspace in Claude Code).
Then either:

- **Type `/barb`**, or
- **Just say her name** — e.g. *"Barb, where does my new book stand?"*

Once she's in, you just keep talking.

---

## The thing Barb kills forever: "Where did I save that?"

Every file for every book has a home, and Barb knows the address:

- Covers → `barb/books/<book>/cover/`
- KDP interior + cover + metadata → `barb/books/<book>/kdp/`
- Reader bonuses / lead magnets → `barb/books/<book>/bonuses/`

Ask *"Barb, where's the paperback cover for Lift Your Eyes?"* and she gives you
the exact path — or tells you it isn't filed yet and offers to file it.

---

## The rhythm: ask → she updates → she tells you what's next

> **You:** Barb, the cover for Lift Your Eyes is approved — it's concept B.
> **Barb:** *(updates books.json + the book file, checks the box)* Done. Status
> is still "editing" — next up is the final pass to hit 22k words, then KDP
> upload. Want the file path to drop the final cover in?
> **You:** Yep, and add a new book called Still Waters.
> **Barb:** *(creates the record, working file, and asset folders)* Set up. I
> just need the format and target word count to finish the card.

---

## Things you can ask Barb for

- "Add a new book called ___." (she sets up everything)
- "Where does ___ stand?" (a tight status across all nine fields + the next step)
- "What's the next thing to do across all my books?"
- "The ISBN for the paperback is ___." / "I hit 25,000 words." / "Cover's done."
- "Where did I save the ___ for ___?"
- "Show me the launch checklist for ___ — what's left?"
- "Which books are closest to launch?"

---

## What Barb remembers

- **`barb/books.json`** — the master record of every book. Barb reads it every
  time, so she always knows the current state. This is her long-term memory.
- **`barb/books/<book>.md`** — the detailed working file for each title (full
  marketing copy, launch checklist, review notes, file locations).

The **visual dashboard** lives at `/dashboard` on the site (and `/barb`) — open it
to see every book's status at a glance. It's built from `books.json`, so whenever
Barb updates a book, the dashboard reflects it.

---

## The nine things Barb tracks for every book

Status · Word count · Cover artwork · ISBN · KDP files · Marketing · Launch
checklist · Reader bonuses · Reviews to monitor.

She never lets one of these go missing. If something isn't known yet, she marks
it clearly (`TODO`) instead of leaving a blank you'll forget about.
