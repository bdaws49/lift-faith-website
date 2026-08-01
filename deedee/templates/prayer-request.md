# Prayer Request — template  (handle with care)

Fill one per request, then mirror into `ops.json` under `prayerRequests[]`.
**Honor "anonymous." Keep private notes private.**

- **Request / who:** (respect any anonymity — use initials or "anonymous")
- **Received:** (date)
- **Status:** open → praying → followed-up → answered → closed
- **Follow-up owed:** (what and by when — a promise to keep)
- **Private?:** yes / no  (if yes, don't surface details beyond what's asked)
- **Notes:**

**ops.json shape**

```json
{
  "request": "",
  "who": "anonymous",
  "received": "TODO",
  "status": "open",
  "followUp": "",
  "private": true,
  "notes": ""
}
```
