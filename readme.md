# Lift - Daily Strength for Your Faith Journey

Lift is a faith-based web application that provides personalized biblical encouragement, Scripture verses, and spiritual growth tools to help believers navigate life's struggles and grow closer to God.

## About

"I will lift up my eyes to the hills—From whence comes my help? My help comes from the LORD, Who made heaven and earth." — Psalm 121:1-2 (NKJV)

Lift exists to bring God's Word directly into your daily life, speaking truth and hope into your struggles, goals, and journey with Christ. Based on Romans 10:17 ("faith comes by hearing, and hearing by the word of God"), we deliver carefully selected Scripture verses matched to your personal spiritual needs.

## Features

- **Daily Biblical Encouragement** - Receive personalized Scripture verses throughout your day (2-6 notifications per day)
- **Personalized Journey** - Tailored content based on your struggles and spiritual goals
- **Community Support** - Anonymous prayer requests and encouragement from fellow believers
- **Spiritual Growth Tools** - Scripture memory aids, devotions, and spiritual gifts assessment
- **Two Subscription Tiers**:
  - **Basic ($5/month)**: Email notifications, personalized verses, Scripture memory tools, devotions, prayer community
  - **Premium ($10/month)**: All Basic features plus text notifications, pastor Q&A access, exclusive content, and book recommendations

## Technology Stack

- **HTML5** - Semantic markup
- **CSS3** - Custom styling with responsive design
- **Vanilla JavaScript** - No frameworks or dependencies
- **Google Apps Script** - Backend data collection via Google Sheets
- **Git** - Version control

## File Structure

```
lift-faith-website/
├── index.html           # Landing page with email waitlist signup
├── explanation.html     # Features, pricing, FAQ, and testimonials
├── profile.html         # User onboarding form with struggles/goals assessment
└── readme.md           # Project documentation (this file)
```

## Design

- **Color Scheme**: Maroon/Burgundy (#8B1538, #5C0F28) with white backgrounds
- **Typography**: Georgia serif font for a traditional, faith-focused aesthetic
- **Responsive**: Fully mobile-responsive with breakpoints at 600px
- **Navigation**: Clean pill-shaped nav bar connecting all three pages
- **Interactions**: Smooth transitions, hover effects, and form validation

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- A web server (for local development) or hosting service

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/bdaws49/lift-faith-website.git
   cd lift-faith-website
   ```

2. Open the files in your browser:
   - Option 1: Use a local server (recommended)
     ```bash
     python -m http.server 8000
     # Then visit http://localhost:8000
     ```
   - Option 2: Open `index.html` directly in your browser

3. Make changes and test locally before deploying

### Deployment Options

#### GitHub Pages (Recommended for Static Sites)

1. Go to your repository settings on GitHub
2. Navigate to "Pages" in the left sidebar
3. Under "Source", select your branch (usually `main`)
4. Click "Save"
5. Your site will be live at `https://bdaws49.github.io/lift-faith-website/`

#### Netlify

1. Sign up at [netlify.com](https://netlify.com)
2. Connect your GitHub repository
3. Deploy with default settings
4. Your site will be live with a custom subdomain

#### Vercel

1. Sign up at [vercel.com](https://vercel.com)
2. Import your Git repository
3. Deploy with default settings
4. Your site will be live instantly

## Backend Configuration

Currently, form submissions are sent to a Google Apps Script endpoint:
```
https://script.google.com/macros/s/AKfycbwa4ViqgRLVoGh5ISs-rTJiYkV6FF4CvM9gxDTxrJ7OXud96nmPrVoO4XWgeoLwrQZO/exec
```

### Setting Up Your Own Backend

To use your own Google Sheets backend:

1. Create a Google Sheet with appropriate columns (email, struggles, goals, etc.)
2. Go to Extensions > Apps Script
3. Create a script to handle POST requests and write to your sheet
4. Deploy as a web app and get the URL
5. Replace the URL in `index.html` (line 238) and `profile.html` (line 529)

## Current Status

### Completed
- Landing page with email waitlist signup
- Features and pricing explanation page
- Comprehensive user profile creation form
- Navigation menu connecting all pages
- Responsive design for mobile devices
- Form validation and submission handling

### In Progress / TODO

#### Essential Before Launch
- [ ] Add Privacy Policy page
- [ ] Add Terms of Service page
- [ ] Add SEO meta tags (Open Graph, Twitter Cards)
- [ ] Add favicon
- [ ] Integrate payment processing (Stripe/PayPal)
- [ ] Set up proper backend/database
- [ ] Replace or secure Google Sheets API endpoint

#### Nice to Have
- [ ] Add real testimonials
- [ ] Create About/Contact page
- [ ] Add Google Analytics
- [ ] Create robots.txt and sitemap.xml
- [ ] Add email verification/double opt-in
- [ ] Implement better error handling
- [ ] Add loading indicators for API calls
- [ ] Create 404 error page
- [ ] Add social media links
- [ ] Blog or resources section

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

This is a private project, but if you have suggestions or find bugs, please reach out.

## License

All rights reserved. This project is proprietary.

## Contact

For questions or support regarding Lift, please contact:
- Email: [Your Email]
- Website: [Your Website]

## Acknowledgments

- Scripture verses from the New King James Version (NKJV)
- Inspired by Psalm 121:1-2 and Romans 10:17

---

**Note**: This is a pre-launch landing page. The full Lift application is currently in development.

**Last Updated**: November 2024
