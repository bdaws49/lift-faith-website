# Lift Faith — App

A self-contained, working web app that delivers personalized daily Scripture
based on the struggles you're carrying and the spiritual goals you're reaching
toward. Built from scratch with vanilla HTML/CSS/JS — no build step, no backend,
no account required. All data persists in the browser (`localStorage`).

## Run it

Open `app/index.html` in any browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000/app/
```

## What it does

- **Onboarding** — pick your struggles (12), spiritual goals (6), how many
  verses you want per day (1–6), and your name.
- **Personalized daily feed** — a matching engine scores every verse in
  `verses.js` against your selected tags (struggles weigh heavier than goals)
  and picks your daily verses deterministically, so the feed is stable within a
  day and rotates day to day. Each verse shows *why* it was matched.
- **Read streak** — mark verses as read to build a daily streak.
- **Favorites** — save verses to revisit.
- **Prayer & reflection journal** — "Reflect" on any verse to start a journal
  entry pre-filled with that verse.
- **Settings** — adjust verses/day, edit your profile, or reset the app.

## Files

| File | Purpose |
|------|---------|
| `index.html` | App shell |
| `app.css` | All styling (burgundy Lift Faith theme) |
| `app.js` | State, onboarding, matching engine, dashboard, journal |
| `verses.js` | Scripture database (NKJV), tagged by struggle/goal |

## Extending

Add more verses by appending tagged objects to `window.LIFT_VERSES` in
`verses.js`. The tag vocabulary is documented at the top of that file. To later
sync data to a backend, the existing Convex functions in `/convex` are a natural
next step — swap the `save()`/`load()` helpers in `app.js` for Convex calls.
