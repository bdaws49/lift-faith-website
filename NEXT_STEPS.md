# Lift Faith - Next Steps Implementation Guide

## Overview
Your Lift Faith website is now professionally structured with navigation, SEO optimization, and improved validation. This guide will walk you through the remaining steps to make it fully functional.

---

## Priority 1: Add Your Logo (15 minutes)

### Steps:
1. **Prepare your logo image:**
   - Save your logo as `logo.png` (or `logo.svg` if vector)
   - Recommended size: 200x200px minimum
   - Transparent background preferred

2. **Upload to your project:**
   - Place `logo.png` in the root directory (`/home/user/lift-faith-website/`)

3. **Update all HTML files:**
   Replace the logo placeholder in `index.html`, `explanation.html`, and `profile.html`:

   **Find this:**
   ```html
   <div class="logo-placeholder">L</div>
   ```

   **Replace with:**
   ```html
   <img src="logo.png" alt="Lift Logo" class="nav-logo-img">
   ```

4. **Add favicon:**
   - Create a 32x32px version of your logo
   - Save as `favicon.png` in the root directory
   - The HTML files already reference it!

---

## Priority 2: Connect Airtable for Data Collection (30-45 minutes)

### Why Airtable?
- Easier to use than Google Sheets
- Better API support
- Free up to 1,200 records/base
- More powerful for filtering and organizing user data

### Setup Steps:

#### Step 1: Create Airtable Account
1. Go to [airtable.com](https://airtable.com) and sign up
2. Create a new workspace called "Lift Faith"

#### Step 2: Create Your Base
1. Create a new base called "User Data"
2. Create two tables:

**Table 1: Email Signups**
- Field 1: Email (Single line text)
- Field 2: Timestamp (Date with time)
- Field 3: Source (Single line text) - to track where signup came from

**Table 2: User Profiles**
- Field 1: Email (Single line text)
- Field 2: Struggles (Long text)
- Field 3: Struggles Other (Long text)
- Field 4: Goals (Long text)
- Field 5: Goals Other (Long text)
- Field 6: Notifications Per Day (Number)
- Field 7: Plan (Single select: Basic, Premium)
- Field 8: Timestamp (Date with time)
- Field 9: Payment Status (Single select: Pending, Paid, Cancelled)

#### Step 3: Get API Credentials
1. Click your profile picture → Account
2. Go to "Developer hub"
3. Click "Create new token"
4. Name it "Lift Website Integration"
5. Give it these scopes:
   - `data.records:read`
   - `data.records:write`
6. Select your "User Data" base
7. Click "Create token" and **COPY IT** (you won't see it again!)

#### Step 4: Get Table IDs
1. Open your base in Airtable
2. Click "Help" → "API documentation"
3. Find the Table IDs (they look like `tblXXXXXXXXXX`)
   - Copy ID for "Email Signups" table
   - Copy ID for "User Profiles" table

#### Step 5: Update Your Website Code

**For index.html (Email Signup Form):**

Find this section (around line 137):
```javascript
fetch('https://script.google.com/macros/s/AKfycbwa4ViqgRLVoGh5ISs-rTJiYkV6FF4CvM9gxDTxrJ7OXud96nmPrVoO4XWgeoLwrQZO/exec', {
```

Replace with:
```javascript
const AIRTABLE_API_KEY = 'YOUR_PERSONAL_ACCESS_TOKEN_HERE';
const BASE_ID = 'YOUR_BASE_ID_HERE';
const EMAIL_TABLE_ID = 'YOUR_EMAIL_SIGNUPS_TABLE_ID_HERE';

fetch(`https://api.airtable.com/v0/${BASE_ID}/${EMAIL_TABLE_ID}`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        fields: {
            'Email': email,
            'Timestamp': new Date().toISOString(),
            'Source': 'landing-page'
        }
    })
})
```

**For profile.html (Profile Form):**

Find this section (around line 354):
```javascript
await fetch('https://script.google.com/macros/s/AKfycbwa4ViqgRLVoGh5ISs-rTJiYkV6FF4CvM9gxDTxrJ7OXud96nmPrVoO4XWgeoLwrQZO/exec', {
```

Replace with:
```javascript
const AIRTABLE_API_KEY = 'YOUR_PERSONAL_ACCESS_TOKEN_HERE';
const BASE_ID = 'YOUR_BASE_ID_HERE';
const PROFILE_TABLE_ID = 'YOUR_USER_PROFILES_TABLE_ID_HERE';

await fetch(`https://api.airtable.com/v0/${BASE_ID}/${PROFILE_TABLE_ID}`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        fields: {
            'Email': formData.email,
            'Struggles': formData.struggles,
            'Struggles Other': formData.strugglesOther,
            'Goals': formData.goals,
            'Goals Other': formData.goalsOther,
            'Notifications Per Day': parseInt(formData.notificationsPerDay),
            'Plan': formData.plan,
            'Timestamp': formData.timestamp,
            'Payment Status': 'Pending'
        }
    })
})
```

#### Step 6: Test Your Forms
1. Deploy your updated code to Netlify
2. Submit a test email on the landing page
3. Submit a test profile
4. Check your Airtable base - you should see the data!

---

## Priority 3: Set Up Stripe for Payments (1-2 hours)

### Setup Steps:

#### Step 1: Create Stripe Account
1. Go to [stripe.com](https://stripe.com)
2. Sign up for an account
3. Complete business verification (may take 1-2 days)

#### Step 2: Create Products
1. In Stripe Dashboard, go to "Products"
2. Click "Add product"

**Product 1: Basic Plan**
- Name: Lift Basic
- Description: Daily biblical encouragement via email
- Pricing: $5/month recurring
- Click "Save product"
- **Copy the Price ID** (starts with `price_`)

**Product 2: Premium Plan**
- Name: Lift Premium
- Description: Daily encouragement via email + SMS, plus premium features
- Pricing: $10/month recurring
- Click "Save product"
- **Copy the Price ID** (starts with `price_`)

#### Step 3: Get API Keys
1. Click "Developers" → "API keys"
2. Copy your "Publishable key" (starts with `pk_`)
3. Click "Reveal test key" and copy your "Secret key" (starts with `sk_`)
   - **IMPORTANT:** Keep secret key private! Never commit to GitHub!

#### Step 4: Create Stripe Checkout Integration

Create a new file: `stripe-config.js`

```javascript
// stripe-config.js
const STRIPE_PUBLISHABLE_KEY = 'pk_test_YOUR_KEY_HERE';
const BASIC_PRICE_ID = 'price_YOUR_BASIC_PRICE_ID';
const PREMIUM_PRICE_ID = 'price_YOUR_PREMIUM_PRICE_ID';
```

#### Step 5: Update profile.html

After successfully saving to Airtable (around line 365), add this:

```javascript
// After Airtable save succeeds...
const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
const priceId = plan === 'basic' ? BASIC_PRICE_ID : PREMIUM_PRICE_ID;

// Redirect to Stripe Checkout
const { error } = await stripe.redirectToCheckout({
    lineItems: [{
        price: priceId,
        quantity: 1
    }],
    mode: 'subscription',
    successUrl: 'https://liftfaith.com/success.html?email=' + encodeURIComponent(email),
    cancelUrl: 'https://liftfaith.com/profile.html',
    customerEmail: email
});

if (error) {
    console.error('Stripe error:', error);
    alert('There was an error processing your payment. Please try again.');
}
```

Don't forget to include Stripe.js in the `<head>` of profile.html:
```html
<script src="https://js.stripe.com/v3/"></script>
```

#### Step 6: Create Success Page

Create `success.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Lift!</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="app-name">🎉 Welcome to Lift!</h1>
            <p class="subtitle">Your subscription is active</p>
        </div>
        <div class="success-message profile" style="display: block;">
            <h2>Payment Successful!</h2>
            <p>You're all set! You'll start receiving daily Scripture encouragement shortly.</p>
            <p>Check your email for:</p>
            <ul style="text-align: left; max-width: 500px; margin: 20px auto;">
                <li>Payment receipt</li>
                <li>Your first encouragement</li>
                <li>Instructions to manage your subscription</li>
            </ul>
            <a href="index.html" class="cta-button">Return Home</a>
        </div>
    </div>
</body>
</html>
```

#### Step 7: Set Up Stripe Webhooks (Advanced)
This allows you to update Airtable when payments succeed/fail.

1. In Stripe Dashboard, go to "Developers" → "Webhooks"
2. Click "Add endpoint"
3. Endpoint URL: `https://liftfaith.com/webhook` (you'll need a backend for this)
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

**Note:** Webhooks require a backend server. Consider using:
- **Netlify Functions** (easiest)
- **Vercel Serverless Functions**
- **AWS Lambda**

---

## Priority 4: Build Scripture Verse Database (2-3 hours)

### Option A: Manual Curation (Recommended to Start)

Create a spreadsheet (Google Sheets or Airtable) with these columns:

| Category Type | Category Name | Verse Reference | Verse Text | Translation |
|---------------|---------------|-----------------|------------|-------------|
| Struggle | Anxiety/Worry | Philippians 4:6-7 | Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus. | NKJV |
| Struggle | Depression/Sadness | Psalm 34:18 | The Lord is close to the brokenhearted and saves those who are crushed in spirit. | NKJV |
| Goal | Pray daily | 1 Thessalonians 5:17 | Pray without ceasing. | NKJV |

**Target: 20-30 verses per category**

#### Struggles to cover:
- Anxiety/Worry
- Depression/Sadness
- Anger/Bitterness
- Addiction
- Relationship Issues
- Financial Stress
- Temptation
- Doubt/Faith Questions
- Grief/Loss
- Loneliness
- Fear
- Guilt/Shame

#### Goals to cover:
- Memorize Scripture
- Pray daily
- Read Bible daily
- Overcome temptation
- Grow closer to God
- Serve others

### Option B: ChatGPT API Integration (More Dynamic)

**Cost:** ~$0.002 per request (very affordable)

1. Get OpenAI API key from [platform.openai.com](https://platform.openai.com)
2. Create a function to generate personalized verses:

```javascript
async function getVerseForStruggle(struggle) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer YOUR_OPENAI_API_KEY',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4',
            messages: [{
                role: 'system',
                content: 'You are a biblical encouragement assistant. Provide relevant Bible verses (NKJV) with references for the given struggle or goal.'
            }, {
                role: 'user',
                content: `Provide 3 encouraging Bible verses for someone struggling with: ${struggle}`
            }],
            temperature: 0.7,
            max_tokens: 500
        })
    });

    const data = await response.json();
    return data.choices[0].message.content;
}
```

---

## Priority 5: Set Up Mailgun for Email Delivery (1-2 hours)

### Setup Steps:

#### Step 1: Create Mailgun Account
1. Go to [mailgun.com](https://www.mailgun.com)
2. Sign up (free for first 5,000 emails/month)
3. Verify your email

#### Step 2: Add and Verify Your Domain
1. In Mailgun dashboard, click "Sending" → "Domains"
2. Click "Add New Domain"
3. Enter: `mg.liftfaith.com` (subdomain recommended)
4. Follow DNS setup instructions:
   - Add TXT records for verification
   - Add MX records for receiving
   - Add CNAME for tracking
5. Wait for verification (can take up to 48 hours)

#### Step 3: Get API Credentials
1. Click "Settings" → "API Keys"
2. Copy your Private API Key
3. Copy your domain name (mg.liftfaith.com)

#### Step 4: Create Email Templates

**Morning Encouragement Template:**
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Georgia, serif; background: #f4f4f4; padding: 20px; }
        .container { background: white; max-width: 600px; margin: 0 auto; padding: 40px; border-radius: 10px; }
        .verse { background: #f8f9ff; border-left: 5px solid #8B1538; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .reference { color: #8B1538; font-weight: bold; margin-top: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <h1 style="color: #8B1538;">Good Morning!</h1>
        <p>Here's your encouragement for today:</p>
        <div class="verse">
            <p>{{VERSE_TEXT}}</p>
            <p class="reference">— {{VERSE_REFERENCE}}</p>
        </div>
        <p>Have a blessed day walking with Christ!</p>
        <p style="color: #999; font-size: 0.9rem; margin-top: 30px;">
            You're receiving this because you subscribed to Lift.<br>
            <a href="{{UNSUBSCRIBE_URL}}">Unsubscribe</a> | <a href="{{MANAGE_URL}}">Manage Preferences</a>
        </p>
    </div>
</body>
</html>
```

#### Step 5: Set Up Scheduled Sending

You'll need a backend service (Netlify Functions, AWS Lambda, or Node.js server) to:

1. **Daily at 6 AM:** Query Airtable for all active users
2. **For each user:**
   - Get their struggles/goals from Airtable
   - Select a relevant verse from your database
   - Send email via Mailgun API
3. **Repeat** based on user's notification frequency (2-6 times/day)

**Example Mailgun API call:**
```javascript
const mailgun = require('mailgun-js')({
    apiKey: 'YOUR_MAILGUN_API_KEY',
    domain: 'mg.liftfaith.com'
});

const data = {
    from: 'Lift Faith <encouragement@mg.liftfaith.com>',
    to: userEmail,
    subject: 'Your Morning Encouragement from Lift',
    html: emailTemplate
        .replace('{{VERSE_TEXT}}', verseText)
        .replace('{{VERSE_REFERENCE}}', verseReference)
};

mailgun.messages().send(data, (error, body) => {
    if (error) console.error('Email error:', error);
    else console.log('Email sent:', body);
});
```

---

## Priority 6: Deploy Updates to Netlify

### Steps:
1. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Add navigation, SEO, improved validation, and integration prep"
   git push origin main
   ```

2. **Netlify will auto-deploy** (if you have continuous deployment enabled)
   - OR manually drag/drop your folder to Netlify dashboard

3. **Test everything:**
   - Navigation works across all pages
   - Forms submit properly
   - Mobile responsive design
   - SEO tags are present

---

## Recommended Timeline

### Week 1:
- ✅ Day 1-2: Add logo, set up Airtable
- ✅ Day 3-4: Integrate Stripe payments
- ✅ Day 5-7: Build Scripture verse database

### Week 2:
- ✅ Day 1-3: Set up Mailgun and email templates
- ✅ Day 4-5: Create automation script for sending emails
- ✅ Day 6-7: Beta test with friends/family

### Week 3:
- ✅ Gather feedback and refine
- ✅ Fix any bugs
- ✅ Prepare for launch

### Week 4:
- ✅ Official launch!
- ✅ Market to churches and Christian communities
- ✅ Monitor and respond to user feedback

---

## Additional Resources

### Helpful Tools:
- **Airtable Templates:** Search for "subscription management"
- **Stripe Testing:** Use test card `4242 4242 4242 4242`
- **Email Testing:** [Mail-Tester.com](https://www.mail-tester.com)
- **Bible API:** [API.Bible](https://scripture.api.bible) for automated verse lookup

### Learning Resources:
- [Airtable API Docs](https://airtable.com/developers/web/api/introduction)
- [Stripe Checkout Guide](https://stripe.com/docs/payments/checkout)
- [Mailgun Quick Start](https://documentation.mailgun.com/en/latest/quickstart.html)

---

## Support & Questions

If you get stuck:
1. Check error console in browser (F12 → Console tab)
2. Review Airtable/Stripe/Mailgun API documentation
3. Test one integration at a time
4. Ask Claude for help with specific error messages!

---

## Next Phase Features (Post-Launch)

Once the core is working, consider adding:
1. **User Dashboard:** Let users update their profile
2. **Community Prayer Requests:** Anonymous sharing
3. **Scripture Memory System:** Spaced repetition
4. **Progress Tracking:** Badges, streaks, milestones
5. **Premium Features:** Pastor Q&A, book recommendations
6. **Mobile App:** React Native or Flutter

---

You've made incredible progress! The foundation is solid. Now it's time to connect the integrations and launch! 🚀

**Remember:** Start small, test thoroughly, and iterate based on user feedback. God bless your work on Lift!
