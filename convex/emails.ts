import { action } from "./_generated/server";
import { v } from "convex/values";

// Email templates
export const templates = {
  welcome: (name: string, versesPerDay: number) => ({
    subject: `Welcome to Lift, ${name}! Your 7-Day Free Trial Has Started 🎉`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8B1538 0%, #5C0F28 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { margin: 0; font-size: 2rem; }
          .content { background: white; padding: 30px; border: 1px solid #ddd; border-top: none; }
          .verse-box { background: #f8f9ff; padding: 20px; border-left: 4px solid #8B1538; margin: 20px 0; border-radius: 5px; }
          .verse-text { font-size: 1.1rem; font-style: italic; margin-bottom: 10px; }
          .verse-ref { color: #8B1538; font-weight: bold; }
          .cta-button { display: inline-block; background: #8B1538; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #999; font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Lift! 🎉</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>

            <p>Your 7-day free trial has officially started! We're excited to walk alongside you on your faith journey.</p>

            <p><strong>Here's what happens next:</strong></p>
            <ul>
              <li>✅ You'll receive ${versesPerDay} personalized Bible verses daily</li>
              <li>✅ Verses are selected based on your specific struggles and spiritual goals</li>
              <li>✅ For the next 7 days, everything is completely free</li>
              <li>✅ After your trial, you'll be charged only if you choose to continue</li>
            </ul>

            <div class="verse-box">
              <div class="verse-text">
                "I will lift up my eyes to the hills—From whence comes my help? My help comes from the LORD, Who made heaven and earth."
              </div>
              <div class="verse-ref">— Psalm 121:1-2 (NKJV)</div>
            </div>

            <p><strong>Your First Verses Are Coming Tomorrow Morning!</strong></p>
            <p>We've already started preparing personalized Scripture just for you. Expect your first delivery tomorrow.</p>

            <p><strong>Set Up Your Payment (Optional Now, Required After Trial):</strong></p>
            <p>No credit card is required during your free trial. Before day 7, we'll send you a link to set up payment if you want to continue.</p>

            <a href="https://liftfaith.com" class="cta-button">Visit Your Dashboard</a>

            <p style="margin-top: 30px;">Questions? Just reply to this email—we're here to help!</p>

            <p>Blessings,<br>
            <strong>The Lift Team</strong></p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Lift Faith. All rights reserved.</p>
            <p>"I will lift up my eyes to the hills."</p>
            <p><a href="https://liftfaith.com" style="color: #8B1538;">liftfaith.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  dailyVerses: (name: string, verses: Array<{ reference: string; text: string; translation: string }>, dayNumber: number) => ({
    subject: `Day ${dayNumber}: Your Daily Scripture from Lift 📖`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8B1538 0%, #5C0F28 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { margin: 0; font-size: 1.8rem; }
          .content { background: white; padding: 30px; border: 1px solid #ddd; border-top: none; }
          .verse-box { background: #f8f9ff; padding: 25px; border-left: 4px solid #8B1538; margin: 25px 0; border-radius: 5px; }
          .verse-text { font-size: 1.15rem; line-height: 1.8; font-style: italic; margin-bottom: 15px; color: #333; }
          .verse-ref { color: #8B1538; font-weight: bold; font-size: 1rem; }
          .reflection { background: #fff9e6; padding: 20px; border-left: 4px solid #FFA500; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #999; font-size: 0.9rem; border-top: 1px solid #ddd; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Day ${dayNumber}: Your Daily Scripture</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Personalized for your journey</p>
          </div>
          <div class="content">
            <p>Good morning, ${name}! 🌅</p>

            <p>God has prepared these verses specifically for you today. Take a moment to read, reflect, and let His Word speak to your heart.</p>

            ${verses.map((verse, index) => `
              <div class="verse-box">
                <div class="verse-text">"${verse.text}"</div>
                <div class="verse-ref">— ${verse.reference} (${verse.translation})</div>
              </div>
            `).join('')}

            <div class="reflection">
              <p><strong>💭 Reflection Prompt:</strong></p>
              <p>How can you apply this Scripture to your life today? Take a moment to pray and ask God to help you walk in this truth.</p>
            </div>

            <p style="margin-top: 30px; color: #666; font-size: 0.95rem;">
              <strong>Tip:</strong> Save these verses to your phone or write them down. Return to them throughout the day when you need encouragement.
            </p>

            <p style="margin-top: 30px;">Keep pressing forward,<br>
            <strong>The Lift Team</strong></p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Lift Faith. All rights reserved.</p>
            <p><a href="https://liftfaith.com" style="color: #8B1538; text-decoration: none;">Manage Your Preferences</a> | <a href="mailto:support@liftfaith.com" style="color: #8B1538; text-decoration: none;">Contact Us</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  trialEnding: (name: string, daysLeft: number) => ({
    subject: `${daysLeft} Days Left in Your Free Trial - Set Up Payment to Continue`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8B1538 0%, #5C0F28 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #ddd; border-top: none; }
          .cta-button { display: inline-block; background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; text-align: center; }
          .footer { text-align: center; padding: 20px; color: #999; font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Trial is Ending Soon</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>

            <p>You have <strong>${daysLeft} day${daysLeft > 1 ? 's' : ''} left</strong> in your free trial with Lift.</p>

            <p>We hope the daily Scripture has been encouraging you! To continue receiving personalized verses after your trial ends, please set up your payment method.</p>

            <p><strong>What happens next:</strong></p>
            <ul>
              <li>Click the button below to add your payment method</li>
              <li>You won't be charged until your trial ends</li>
              <li>Cancel anytime if you change your mind</li>
            </ul>

            <a href="[STRIPE_CHECKOUT_URL]" class="cta-button">Set Up Payment</a>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666;">
              <strong>Don't want to continue?</strong> No problem—your trial will simply end and you won't be charged. We'd love to hear your feedback though!
            </p>

            <p>Blessings,<br>
            <strong>The Lift Team</strong></p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Lift Faith. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};

// Send email action (will use Resend API)
export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
  },
  handler: async (ctx, args) => {
    // Get Resend API key from environment
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Send email via Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Lift Faith <daily@liftfaith.com>",
        to: [args.to],
        subject: args.subject,
        html: args.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    const result = await response.json();
    return result;
  },
});

// Send welcome email
export const sendWelcomeEmail = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get user from database
    const user = await ctx.runQuery("users:getUser", { userId: args.userId });

    if (!user) {
      throw new Error("User not found");
    }

    // Generate welcome email
    const email = templates.welcome(user.name, user.versesPerDay);

    // Send email
    return await ctx.runAction("emails:sendEmail", {
      to: user.email,
      subject: email.subject,
      html: email.html,
    });
  },
});

// Send daily verses email
export const sendDailyVersesEmail = action({
  args: {
    userId: v.id("users"),
    verses: v.array(
      v.object({
        reference: v.string(),
        text: v.string(),
        translation: v.string(),
      })
    ),
    dayNumber: v.number(),
  },
  handler: async (ctx, args) => {
    // Get user from database
    const user = await ctx.runQuery("users:getUser", { userId: args.userId });

    if (!user) {
      throw new Error("User not found");
    }

    // Generate daily verses email
    const email = templates.dailyVerses(user.name, args.verses, args.dayNumber);

    // Send email
    return await ctx.runAction("emails:sendEmail", {
      to: user.email,
      subject: email.subject,
      html: email.html,
    });
  },
});
