const nodemailer = require('nodemailer');

const sendVerificationCode = async (email, code) => {
  // If SMTP is not configured, don't hang trying to connect to Gmail
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`\n======================================================`);
    console.log(`🔑 [MOCK EMAIL] Verification code for ${email}: ${code}`);
    console.log(`   (Configure SMTP_USER & SMTP_PASS in Render to send real emails)`);
    console.log(`======================================================\n`);
    return { success: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      connectionTimeout: 3000,
      greetingTimeout: 3000,
      socketTimeout: 3000,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Cre8Hub" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your Cre8Hub Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a1a; color: #e2e8f0; border-radius: 12px; padding: 32px; border: 1px solid #1e293b;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 24px; font-weight: 800; color: #6366f1; letter-spacing: 2px;">CRE8HUB</span>
          </div>
          <h1 style="font-size: 20px; margin: 0 0 8px; color: #f8fafc;">Verify your email</h1>
          <p style="margin: 0 0 24px; color: #94a3b8; font-size: 14px; line-height: 1.5;">
            Use the code below to complete your verification. This code expires in <strong style="color: #f8fafc;">10 minutes</strong>.
          </p>
          <div style="background: #1e293b; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #6366f1; font-family: monospace;">${code}</span>
          </div>
          <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;">
            If you did not request this code, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    console.log(`📧 Verification email sent to ${email} (messageId: ${info.messageId})`);
    return { success: true, delivered: true };
  } catch (error) {
    console.error('⚠️ SMTP unavailable or blocked by hosting provider:', error.message);
    console.log(`\n======================================================`);
    console.log(`🔑 [VERIFICATION CODE] for ${email}: ${code}`);
    console.log(`======================================================\n`);
    return { success: true, delivered: false, error: error.message };
  }
};

module.exports = {
  sendVerificationCode,
};
