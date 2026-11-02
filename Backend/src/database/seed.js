/**
 * seed.js - Database seeding script for Cre8Hub
 * 
 * Creates test users with bcrypt-hashed passwords for each role.
 * 
 * Usage:
 *   npm run seed
 *   node src/database/seed.js
 *   node src/database/seed.js --clean   (drops all users before seeding)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cre8hub';
const BCRYPT_ROUNDS = 12;

const testUsers = [
  {
    username: 'creator_test',
    email: 'creator@test.com',
    plainPassword: 'Test@1234',
    userRole: 'content-creator',
    profileCompleted: true,
    contentCreatorProfile: {
      contentGenre: 'educational',
      primaryPlatform: 'YouTube',
      audienceSize: '1000-10000',
      postingFrequency: 'weekly',
    },
    persona: {
      tone: 'educational and engaging',
      topics: ['technology', 'AI', 'productivity'],
      style: 'informative with humor',
    },
  },
  {
    username: 'entrepreneur_test',
    email: 'entrepreneur@test.com',
    plainPassword: 'Test@1234',
    userRole: 'entrepreneur',
    profileCompleted: true,
    entrepreneurProfile: {
      businessCategory: 'SaaS',
      businessDescription: 'AI-powered content creation tools for small businesses.',
      businessStage: 'growth',
      targetAudience: 'small business owners',
    },
    persona: {
      tone: 'professional and persuasive',
      topics: ['business growth', 'SaaS', 'automation'],
      style: 'data-driven with storytelling',
    },
  },
  {
    username: 'socialmgr_test',
    email: 'smm@test.com',
    plainPassword: 'Test@1234',
    userRole: 'social-media-manager',
    profileCompleted: true,
    socialMediaManagerProfile: {
      clientType: 'e-commerce',
      businessSize: 'small',
      socialMediaNiche: 'fashion and lifestyle',
      managedPlatforms: ['Instagram', 'TikTok'],
    },
    persona: {
      tone: 'trendy and conversational',
      topics: ['fashion', 'lifestyle', 'brand identity'],
      style: 'visual-first with concise captions',
    },
  },
  {
    username: 'admin_test',
    email: 'admin@test.com',
    plainPassword: 'Admin@5678',
    userRole: 'content-creator',
    profileCompleted: false,
  },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log(`✅ Connected to MongoDB: ${MONGO_URI}`);

  const args = process.argv.slice(2);
  const clean = args.includes('--clean');

  if (clean) {
    const count = await User.countDocuments();
    await User.deleteMany({});
    console.log(`🧹 Wiped ${count} existing user(s).`);
  }

  console.log('\n🔐 Hashing passwords with bcrypt...');
  const usersToInsert = [];

  for (const userData of testUsers) {
    const { plainPassword, ...rest } = userData;
    const hashedPassword = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
    usersToInsert.push({ ...rest, password: hashedPassword });
  }

  console.log(`📝 Inserting ${usersToInsert.length} test users...`);

  let inserted = 0;
  let skipped = 0;

  for (const user of usersToInsert) {
    try {
      await User.create(user);
      inserted++;
      console.log(`  ✅ Created: ${user.email} (role: ${user.userRole})`);
    } catch (err) {
      if (err.code === 11000) {
        console.log(`  ⏭️  Skipped (already exists): ${user.email}`);
        skipped++;
      } else {
        console.error(`  ❌ Failed to create ${user.email}:`, err.message);
      }
    }
  }

  console.log(`\n📊 Seeding complete: ${inserted} inserted, ${skipped} skipped.`);
  console.log('\n🔑 Test credentials (plain-text for your reference only):');
  testUsers.forEach(u => {
    console.log(`   ${u.email} / ${u.plainPassword}  (role: ${u.userRole})`);
  });

  await mongoose.disconnect();
  console.log('\n✅ Disconnected from MongoDB. Done!');
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
