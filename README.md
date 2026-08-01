# Lift Faith - Daily Biblical Strength for Your Faith Journey

A web application that delivers personalized Scripture verses to help people navigate life's struggles and achieve their spiritual goals.

## Overview

Lift is a faith-based subscription service that provides daily biblical encouragement tailored to each user's specific struggles and spiritual goals. Users receive 2-6 personalized Scripture verses daily via email or text message.

**Live Site:** [liftfaith.com](https://liftfaith.com)

---

## Features

### Current Features ✅
- **Landing Page** - Beautiful introduction with Psalm 121:1-2 and email waitlist
- **Explanation Page** - Detailed feature overview, pricing, FAQs
- **Profile Creation** - Comprehensive user intake form collecting:
  - Personal struggles (12 categories + custom)
  - Spiritual goals (6 categories + custom)
  - Notification frequency preferences (2-6 daily)
  - Plan selection (Basic $5/month or Premium $10/month)
- **Responsive Navigation** - Mobile-friendly menu across all pages
- **SEO Optimized** - Meta tags, Open Graph tags for social sharing
- **Form Validation** - Real-time error checking with helpful feedback
- **Professional Design** - Burgundy gradient theme, elegant typography
- **Footer** - Links to privacy policy, terms, contact

### Agents 🤖
- **Abe** — Ministry Content Agent (`.claude/agents/abe.md`, `abe/`). Turns one
  seed into a full content set in your voice. Talk to Abe at `/talk-to-abe`.
- **Barb** — Publishing Agent (`.claude/agents/barb.md`, `barb/`). Maintains an
  organized dashboard for every book — status, word count, cover, ISBN, KDP
  files, marketing, launch checklist, reader bonuses, reviews. Two web apps:
  the **visual dashboard** at `/dashboard`, and **Talk to Barb** (mic + chat) at
  `/talk-to-barb` (a.k.a. `/barb`) — which can *edit* the dashboard once unlocked
  with a passcode. Books live in Convex (`convex/books.ts`, live source of truth)
  seeded from `barb/books.json`. Setup: `TALK-TO-BARB-SETUP.md`.
- **Chloe** — Research Agent (`.claude/agents/chloe.md`, `chloe/`). Your digital
  seminary research partner — say "prepare everything on Romans 8" for a full
  brief (history, outline, word studies, cross-refs, maps, archaeology,
  illustrations, quotes, application, hard passages, discussion questions). Talk
  to Chloe at `/talk-to-chloe` (a.k.a. `/chloe`).
- **DeeDee** — Ministry Operations Agent (`.claude/agents/deedee.md`, `deedee/`).
  Runs the day-to-day from one calendar-and-board: podcast schedule, recording
  days, publishing calendar, speaking invitations, prayer requests, donations,
  newsletter schedule, and the content pipeline — so you always know what's done
  and what's next. Two web apps: the **operations board** at `/operations`, and
  **Talk to DeeDee** (mic + chat, ElevenLabs *Emily* voice) at `/talk-to-deedee`
  (a.k.a. `/deedee`) — which can *edit* the board once unlocked with a passcode.
  The board lives in Convex (`convex/ops.ts`, live source of truth) seeded from
  `deedee/ops.json` (mirrored to `deedee/dashboard.md`). Setup:
  `TALK-TO-DEEDEE-SETUP.md`.

### Planned Features 🚧
- Airtable data collection integration
- Stripe payment processing
- Mailgun email delivery system
- Scripture verse matching engine
- User dashboard
- Community prayer requests
- Scripture memory system
- Progress tracking

---

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Hosting:** Netlify
- **Domain:** GoDaddy (liftfaith.com)
- **Data Storage:** Airtable (planned)
- **Payments:** Stripe (planned)
- **Email:** Mailgun (planned)

---

## Project Structure

```
lift-faith-website/
│
├── index.html           # Landing page with email signup
├── explanation.html     # Features, pricing, and FAQs
├── profile.html         # User profile creation form
├── styles.css           # Shared stylesheet for all pages
│
├── NEXT_STEPS.md        # Detailed implementation guide
├── README.md            # This file
└── readme.md            # Original project notes
```

---

## Pages

### 1. Landing Page (`index.html`)
- Hero section with Psalm 121:1-2 (NKJV)
- Mountain illustration background
- Email waitlist signup form
- "Learn More" and "Get Started" call-to-action buttons

### 2. Explanation Page (`explanation.html`)
- Biblical foundation (Romans 10:17)
- 6 feature cards explaining how Lift works
- Pricing comparison (Basic vs Premium)
- FAQ section (6 common questions)
- Testimonials placeholder
- "Get Started Now" call-to-action

### 3. Profile Page (`profile.html`)
- **Struggles Assessment** (12 checkboxes + text field):
  - Anxiety/Worry, Depression/Sadness, Anger/Bitterness, Addiction
  - Relationship Issues, Financial Stress, Temptation, Doubt/Faith Questions
  - Grief/Loss, Loneliness, Fear, Guilt/Shame
- **Spiritual Goals** (6 checkboxes + text field):
  - Memorize Scripture, Pray daily, Read Bible daily
  - Overcome temptation, Grow closer to God, Serve others
- **Notification Frequency:** 2-6 daily encouragements
- **Plan Selection:** Basic ($5/mo) or Premium ($10/mo)
- **Email Collection:** Where to send daily verses
- Enhanced validation with inline error messages
- Success confirmation page

---

## Design Philosophy

### Color Scheme
- **Primary:** Burgundy (#8B1538)
- **Secondary:** Deep Burgundy (#5C0F28)
- **Background:** White (#FFFFFF)
- **Accents:** Light Blue (#f8f9ff)
- **Text:** Dark Gray (#333)

### Typography
- **Font:** Georgia (serif) - Classic, readable, trustworthy
- **Headings:** Bold, burgundy color
- **Body:** 1rem base, 1.6-1.8 line height for readability

### Principles
- Clean, distraction-free interface
- Biblical imagery (mountains, lifting eyes to hills)
- Warm, inviting atmosphere
- Mobile-first responsive design
- Accessibility-focused (ARIA labels, semantic HTML)

---

## SEO & Social Sharing

Each page includes:
- Unique title and description
- Keywords for search engines
- Open Graph tags for Facebook
- Twitter Card tags
- Canonical URLs
- Favicon reference

---

## Form Integrations

### Current Status
Forms are configured to submit to Google Sheets (not working - needs Airtable migration).

### Data Collection Points

**Landing Page Form:**
- Email address
- Timestamp
- Source (landing-page)

**Profile Form:**
- Email address
- Selected struggles (comma-separated)
- Additional struggles (free text)
- Selected goals (comma-separated)
- Additional goals (free text)
- Notifications per day (2-6)
- Selected plan (basic/premium)
- Timestamp
- Payment status (pending/paid/cancelled)

---

## Next Steps

See [NEXT_STEPS.md](NEXT_STEPS.md) for detailed implementation guide covering:

1. **Add Logo** (15 min)
2. **Connect Airtable** (30-45 min)
3. **Set Up Stripe** (1-2 hours)
4. **Build Scripture Database** (2-3 hours)
5. **Configure Mailgun** (1-2 hours)
6. **Deploy & Test**

**Estimated time to full launch:** 2-4 weeks (part-time work)

---

## Installation & Development

### Local Development
1. Clone this repository
2. Open `index.html` in your browser
3. No build process required - pure HTML/CSS/JS

### Deployment to Netlify
1. Connect your GitHub repository to Netlify
2. Build command: (none)
3. Publish directory: `/`
4. Enable automatic deploys on push to main branch

### Domain Setup (GoDaddy)
1. Log in to GoDaddy
2. Manage DNS for liftfaith.com
3. Update nameservers to Netlify's:
   - dns1.p03.nsone.net
   - dns2.p03.nsone.net
   - dns3.p03.nsone.net
   - dns4.p03.nsone.net
4. Wait 24-48 hours for propagation

---

## Testing

### Manual Testing Checklist
- [ ] Landing page loads correctly
- [ ] Navigation works on all pages
- [ ] Mobile menu toggles properly
- [ ] Email signup form validates
- [ ] Profile form validates all required fields
- [ ] Error messages display correctly
- [ ] Success messages appear after submission
- [ ] Links navigate to correct pages
- [ ] Responsive design works on mobile/tablet
- [ ] SEO tags appear in page source

### Browser Compatibility
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)

---

## Business Model

### Pricing
- **Basic Plan:** $5/month
  - Email notifications (2-6 per day)
  - Personalized Bible verses
  - Scripture memory tools
  - Community prayer requests
  - Access to devotions
  - Spiritual gifts assessment

- **Premium Plan:** $10/month
  - Everything in Basic, PLUS:
  - Text message notifications
  - Priority support
  - Exclusive content
  - Book recommendations
  - Access to pastor Q&A

### Revenue Projections
- **100 users:** ~$650/month ($575-600 profit after expenses)
- **500 users:** ~$3,250/month
- **1,000 users:** ~$6,500/month

### Monthly Costs (estimated)
- Domain: $1/month ($12/year)
- Netlify: $0 (free tier)
- Airtable: $0 (free up to 1,000 records)
- Mailgun: $25-50 (based on volume)
- Stripe fees: 2.9% + $0.30 per transaction
- ChatGPT API: $5-20 (optional)

**Total:** ~$50-75/month for 100 users

---

## Biblical Foundation

Lift is built on the principle found in Romans 10:17:

> "So then faith comes by hearing, and hearing by the word of God." (NKJV)

We believe God's Word has the power to:
- Comfort those who are struggling
- Guide those seeking direction
- Strengthen those pursuing spiritual growth
- Transform hearts and renew minds

Our mission is to make Scripture accessible, personal, and actionable for everyone.

---

## Contributing

This is a solo project, but suggestions are welcome! If you have ideas for features or improvements, feel free to open an issue or submit a pull request.

---

## License

© 2024 Lift Faith. All rights reserved.

---

## Contact

For questions, support, or partnership inquiries:
- Website: [liftfaith.com](https://liftfaith.com)
- Email: (to be added)

---

## Acknowledgments

- **Scripture:** New King James Version (NKJV)
- **Design Inspiration:** Mountain theme from Psalm 121
- **Font:** Georgia (serif) for classic, trustworthy feel
- **Hosting:** Netlify for reliable, fast delivery

---

> "I will lift up my eyes to the hills—From whence comes my help? My help comes from the Lord, Who made heaven and earth."
> — Psalm 121:1-2 (NKJV)
