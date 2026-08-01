# Donation — template  (handle with care)

Fill one per gift, then mirror into `ops.json` under `donations.items[]` and
update `donations.runningTotal`. **Honor "anonymous."**

- **Donor:** (name, or "anonymous")
- **Amount:** (number)
- **Date:** (received)
- **Channel:** (e.g. check, PayPal, in person, benevolence fund)
- **Thank-you status:** received → thanked → receipted
- **Notes:** (designation, recurring?, receipt needed?)

**ops.json shape**

```json
{
  "donor": "anonymous",
  "amount": 0,
  "date": "TODO",
  "channel": "",
  "status": "received",
  "notes": ""
}
```

When you add a gift, add its amount to `donations.runningTotal` for the period.
A thank-you is owed within a week unless the gift is anonymous with no contact.
