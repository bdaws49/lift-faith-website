# Content Pipeline Item — template

Fill one per piece in flight, then mirror into `ops.json` under `contentPipeline[]`.
Use this for anything moving toward "shipped": a sermon, episode, chapter, short,
or post.

- **Piece:**
- **Type:** sermon / podcast / book / short / post / other
- **Stage:** idea → in progress → review → done → published
- **Owner:** (Billy, Abe, Barb, Chloe, or a person)
- **Due:** (real date, or TODO)
- **Notes / links:** (point to detailed records rather than duplicating them,
  e.g. a book lives in `barb/books.json`)

**ops.json shape**

```json
{
  "piece": "",
  "type": "podcast",
  "stage": "idea",
  "owner": "",
  "due": "TODO",
  "notes": ""
}
```
