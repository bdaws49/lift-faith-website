# Lift Faith - Complete Setup Guide

## 🚀 Launch Checklist (Do This Week!)

This guide will help you launch Lift Faith with:
- ✅ User signup with Convex database
- ✅ 7-day free trial via Stripe
- ✅ Automated verse selection matching user struggles
- ✅ Email delivery system
- ✅ 35+ categorized Scripture verses

---

## Step 1: Set Up Convex (15 minutes)

### 1.1 Create Convex Account
1. Go to https://www.convex.dev
2. Click "Start Building" or "Sign Up"
3. Sign up with GitHub (recommended) or email

### 1.2 Connect Your Project
```bash
# In your project directory
npx convex dev
```

This will:
- Ask you to login (opens browser)
- Create a new Convex project (name it "lift-faith")
- Generate API keys in `.env.local`
- Start watching your `convex/` folder

### 1.3 Seed the Verse Database
After `convex dev` is running, open the Convex dashboard:
1. Go to https://dashboard.convex.dev
2. Select your "lift-faith" project
3. Click "Functions" in the left sidebar
4. Find the `verses:seedVerses` mutation
5. Click "Run" (no arguments needed)
6. You should see: `{ message: "Inserted 35 verses successfully" }`

### 1.4 Get Your Convex URL
1. In the Convex dashboard, go to "Settings"
2. Copy your **Deployment URL** (looks like: `https://happy-animal-123.convex.cloud`)
3. Save this - you'll need it for the frontend

---

## Step 2: Set Up Stripe (20 minutes)

### 2.1 Create Stripe Account
1. Go to https://stripe.com
2. Sign up for free account
3. Complete business profile (can use personal info for now)

### 2.2 Enable Test Mode
1. Toggle "Test mode" ON (top right of dashboard)
2. We'll launch in test mode first, switch to live later

### 2.3 Create Products with 7-Day Trial

**Create Basic Plan ($5/month):**
1. Go to Products → Click "+ Add product"
2. Name: `Lift - Basic Plan`
3. Description: `Daily Scripture verses via email`
4. Pricing:
   - Model: **Recurring**
   - Price: **$5.00**
   - Billing period: **Monthly**
   - **Free trial**: 7 days
5. Click "Save product"
6. Copy the **Price ID** (starts with `price_...`)

**Create Premium Plan ($10/month):**
1. Repeat above steps
2. Name: `Lift - Premium Plan`
3. Price: **$10.00**
4. **Free trial**: 7 days
5. Copy the **Price ID**

### 2.4 Get Your API Keys
1. Go to Developers → API keys
2. Copy your **Publishable key** (starts with `pk_test_...`)
3. Copy your **Secret key** (starts with `sk_test_...`)
4. **IMPORTANT**: Keep the secret key private!

### 2.5 Set Up Webhook (for subscription updates)
1. Go to Developers → Webhooks
2. Click "+ Add endpoint"
3. Endpoint URL: `https://YOUR-CONVEX-URL/stripe-webhook` (we'll create this)
4. Events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy the **Signing secret** (starts with `whsec_...`)

---

## Step 3: Set Up Email Delivery with Resend (10 minutes)

### 3.1 Create Resend Account
1. Go to https://resend.com
2. Sign up (free tier: 3,000 emails/month, 100/day)
3. Verify your email

### 3.2 Verify Your Domain (Optional but Recommended)
1. Go to Domains → Add Domain
2. Enter: `liftfaith.com`
3. Add the DNS records to GoDaddy:
   - Copy the TXT, MX, and CNAME records
   - Go to GoDaddy DNS settings
   - Add each record
   - Wait 10-30 minutes for verification

**OR use Resend's test domain for now:**
- From: `onboarding@resend.dev`
- Works immediately but may land in spam

### 3.3 Get Your API Key
1. Go to API Keys
2. Click "Create API Key"
3. Name: `Lift Faith Production`
4. Permission: **Sending access**
5. Copy the API key (starts with `re_...`)

---

## Step 4: Configure Environment Variables

Create a `.env.local` file in your project root:

```bash
# Convex (automatically created by `npx convex dev`)
CONVEX_DEPLOYMENT=your-convex-deployment-url

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_BASIC_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend
RESEND_API_KEY=re_...

# App URLs
NEXT_PUBLIC_APP_URL=https://liftfaith.com
```

**IMPORTANT**: Never commit `.env.local` to GitHub!

---

## Step 5: Update Profile.html with Convex + Stripe

I'll create this for you next. It will:
1. Collect user info (name, email, struggles, goals)
2. Create user in Convex database
3. Redirect to Stripe Checkout with 7-day trial
4. User returns to success page after payment

---

## Step 6: Create Email Delivery System

We need to create:
1. **Email templates** (HTML for verse delivery emails)
2. **Convex cron job** (runs daily to send verses)
3. **Verse matching algorithm** (picks relevant verses based on user struggles)

---

## Step 7: Testing Checklist

Before launching:
- [ ] User can sign up on profile.html
- [ ] User data saves to Convex
- [ ] Stripe checkout works with 7-day trial
- [ ] User receives welcome email
- [ ] Daily verses are sent (test with cron job)
- [ ] Verse content matches user struggles
- [ ] Subscription webhooks update Convex
- [ ] Trial expiration works correctly

---

## Step 8: Launch Day!

1. Update landing page messaging (remove "waitlist", add "7 Day Free Trial")
2. Switch Stripe to **Live Mode**
3. Update `.env.local` with live Stripe keys
4. Test one more time with real credit card (your own)
5. Deploy to Netlify
6. Post on social media!

---

## What's Built So Far

### ✅ Convex Backend
- User schema with subscriptions, struggles, goals
- 35+ verses categorized by struggle/goal
- Verse matching algorithm
- User management functions

### ⏳ Still To Build
- Frontend Convex integration on profile.html
- Stripe Checkout integration
- Email delivery with Resend
- Daily cron job for verse delivery
- Success/payment confirmation pages

---

## Next Steps for YOU

1. **Run `npx convex dev`** to connect your Convex account
2. **Seed the verse database** (run `verses:seedVerses` in dashboard)
3. **Create Stripe account** and get API keys
4. **Create Resend account** and get API key
5. **Share your Convex URL + Stripe keys** so I can integrate them

Then I'll build the rest!

---

## Need Help?

- Convex Docs: https://docs.convex.dev
- Stripe Docs: https://stripe.com/docs
- Resend Docs: https://resend.com/docs

Let's ship this! 🚀
