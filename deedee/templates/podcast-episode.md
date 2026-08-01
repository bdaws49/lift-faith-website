# Podcast Episode — template

Fill one of these per episode, then mirror it into `ops.json` under
`podcastSchedule.episodes[]`.

- **Number:** (e.g. 3 — or leave null until fixed)
- **Title:**
- **Passage / topic:**
- **Guest:** (or none)
- **Status:** planned → scripted → recorded → edited → scheduled → published
- **Target publish date:** (real date, or TODO)
- **Assets / script:** (path, e.g. `abe/output/<slug>/`)
- **Notes:**

**ops.json shape**

```json
{
  "number": 3,
  "title": "",
  "topicOrPassage": "",
  "guest": null,
  "status": "planned",
  "targetPublish": "TODO",
  "notes": "",
  "assets": ""
}
```
