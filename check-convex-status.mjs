#!/usr/bin/env node
/**
 * Convex Database Status Checker
 * Run this on your Mac with: node check-convex-status.mjs
 */

import { ConvexHttpClient } from "convex/browser";

const DEPLOYMENT_URL = "https://tame-fennec-574.convex.cloud";

const client = new ConvexHttpClient(DEPLOYMENT_URL);

console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║        LIFT FAITH - CONVEX DATABASE STATUS CHECK              ║");
console.log("╚════════════════════════════════════════════════════════════════╝\n");

console.log(`Deployment: ${DEPLOYMENT_URL}\n`);

async function checkConvex() {
  try {
    // Check users
    console.log("📊 Checking USERS table...");
    const users = await client.query("users:getActiveUsers");

    console.log(`\n✅ Users table exists!`);
    console.log(`   Total active users: ${users.length}`);

    if (users.length > 0) {
      console.log("\n   Recent users:");
      users.slice(0, 5).forEach((user, i) => {
        console.log(`   ${i + 1}. ${user.name} (${user.email})`);
        console.log(`      Plan: ${user.subscriptionTier} | Status: ${user.subscriptionStatus}`);
        console.log(`      Verses/day: ${user.versesPerDay}`);
      });

      if (users.length > 5) {
        console.log(`   ... and ${users.length - 5} more users`);
      }
    } else {
      console.log("\n   ⚠️  No users yet - test the signup form!");
    }

  } catch (error) {
    console.error("\n❌ Error checking users:", error.message);
  }

  console.log("\n" + "─".repeat(64));

  // Note about verses
  console.log("\n📖 VERSES table:");
  console.log("   To check verses:");
  console.log("   1. Go to https://dashboard.convex.dev");
  console.log("   2. Select 'liftfaith' project");
  console.log("   3. Click 'Data' → 'verses' table");
  console.log("   4. Should have 35 verses");
  console.log("\n   If empty, run 'verses:seedVerses' mutation in dashboard");

  console.log("\n" + "─".repeat(64));

  // Instructions
  console.log("\n✨ NEXT STEPS:");
  console.log("   1. If verses table is empty, seed it from dashboard");
  console.log("   2. Test signup form: open profile.html in browser");
  console.log("   3. Fill out form and submit");
  console.log("   4. Run this script again to see your test user!");

  console.log("\n" + "═".repeat(64) + "\n");
}

checkConvex().catch(console.error);
