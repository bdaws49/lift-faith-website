# How to Use DeeDee (plain-English guide)

DeeDee is your ministry operations manager. You **talk to her like a person** —
in plain English — and she keeps the whole operation on one calendar-and-board:
the podcast, recording days, the publishing calendar, speaking invitations,
prayer requests, donations, the newsletter, and everything in the content
pipeline. No commands to memorize.

---

## Reaching DeeDee

Come back to this project (the `lift-faith-website` workspace in Claude Code).
Then either:

- **Type `/deedee`**, or
- **Just say her name** — e.g. *"DeeDee, what's on for this week?"*

Once she's in, you just keep talking.

On your phone, open **`/deedee`** on the site to talk to her out loud (she answers
in the Emily voice), or **`/operations`** to see the whole board at a glance.

---

## The one question DeeDee lives to answer: "What's next?"

Ask *"DeeDee, what's next?"* and she reads the whole board and gives you the short
list that actually matters right now:

- the next **recording day** (and whether prep is done),
- what **publishes** this week,
- **speaking dates** coming up (and invites still waiting on a yes/no),
- the next **newsletter** deadline,
- **thank-yous** still owed for gifts,
- **prayer follow-ups** you promised.

She ends with the single most useful next step — not a wall of options.

---

## The rhythm: tell her → she logs it → she tells you what's next

> **You:** DeeDee, we're recording the Habakkuk episode next Tuesday at the studio.
> **DeeDee:** *(adds the recording day + links the episode)* Got it — Tuesday
> Aug 4 at the studio, recording the Habakkuk episode. Prep left: finalize the
> script. Want me to pencil a publish date a week out?
> **You:** Yeah, and log a $50 gift from the Andersons.
> **DeeDee:** *(logs the donation, flags the thank-you)* Logged — $50 from the
> Andersons, received today. Thank-you owed. Want me to remind you if it's not
> marked sent in a few days?

---

## Things you can tell or ask DeeDee

**Podcast & recording**
- "Add episode 3 on Psalm 23." / "The Habakkuk episode is recorded."
- "When's my next recording day?" / "Set our publish day to Wednesdays."

**Calendar & pipeline**
- "What's on the calendar next week?" / "What's stuck in the pipeline?"
- "Move the short to Friday."

**Speaking**
- "I got a speaking invite for the men's retreat in October." / "They confirmed."
- "What speaking dates do I have coming up?"

**Prayer requests** *(handled with care)*
- "Add a prayer request for the Miller family — keep it anonymous."
- "Any open prayer requests I owe a follow-up on?"

**Donations**
- "Log a $100 gift from the church benevolence fund." / "That thank-you is sent."
- "What's my running total this month?" / "Any thank-yous still owed?"

**Newsletter**
- "Newsletter #1 goes out the first Monday of September, theme Habakkuk."
- "Is the next newsletter draft ready?"

---

## What DeeDee remembers

- **`deedee/ops.json`** — the master record of the whole operation. DeeDee reads
  it every time, so she always knows the current state. This is her long-term memory.
- **`deedee/dashboard.md`** — the readable roll-up she regenerates from it.

The **visual dashboard** lives at `/operations` on the site — open it to see every
area at a glance. It's built from `ops.json`, so whenever DeeDee updates
something, the dashboard reflects it.

---

## A gentle note on the sensitive stuff

**Prayer requests** and **donations** are handled with extra care. If you say
"keep it anonymous," DeeDee keeps it anonymous. Private notes stay private, and
she treats every thank-you and every follow-up you mention as a promise to keep —
so she'll remind you rather than let it slip.

---

## The eight areas DeeDee runs

Podcast schedule · Recording days · Publishing calendar · Speaking invitations ·
Prayer requests · Donations · Newsletter schedule · Content pipeline.

She never lets one of these go missing. If something isn't known yet, she marks it
clearly (`TODO`) instead of leaving a blank you'll forget about — and she always
knows what's next.
