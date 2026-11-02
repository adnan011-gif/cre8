const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function test() {
  console.log('Testing SMTP connection...');
  console.log('User:', process.env.SMTP_USER);
  console.log('Host:', process.env.SMTP_HOST);
  console.log('Port:', process.env.SMTP_PORT);

  try {
    await transporter.verify();
    console.log('✅ SMTP connection is verified and ready!');
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
  }
}

test();
