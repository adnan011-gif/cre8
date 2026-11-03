const nodemailer = require('nodemailer');

const sendVerificationCode = async (email, code) => {
  const htmlContent = `
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
  `;

  // 1. Primary: Brevo HTTPS REST API (Free 300 emails/day to ANY email address without domain verification)
  if (process.env.BREVO_API_KEY) {
    try {
      const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || 'adnankhanofficial105@gmail.com';
      const senderName = process.env.BREVO_SENDER_NAME || 'Cre8Hub';
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email }],
          subject: 'Your Cre8Hub Verification Code',
          htmlContent,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        console.log(`📧 [Brevo] Verification email delivered to ${email} (messageId: ${data.messageId})`);
        return { success: true, delivered: true };
      } else {
        console.error('⚠️ Brevo API error:', data);
      }
    } catch (err) {
      console.error('⚠️ Brevo HTTP error:', err.message);
    }
  }

  // 2. Secondary: Resend HTTPS API (Works on Render/Vercel/Cloud)
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'Cre8Hub <onboarding@resend.dev>',
          to: [email],
          subject: 'Your Cre8Hub Verification Code',
          html: htmlContent,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        console.log(`📧 [Resend] Verification email delivered to ${email} (id: ${data.id})`);
        return { success: true, delivered: true };
      } else {
        console.error('⚠️ Resend API returned error:', data);
      }
    } catch (err) {
      console.error('⚠️ Resend HTTP error:', err.message);
    }
  }

  // 2. Fallback: SMTP (Gmail or custom SMTP server)
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
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
        html: htmlContent,
      });

      console.log(`📧 [SMTP] Verification email sent to ${email} (messageId: ${info.messageId})`);
      return { success: true, delivered: true };
    } catch (error) {
      console.error('⚠️ SMTP unavailable or blocked:', error.message);
    }
  }

  // 3. Fallback: Log code to server console so user is never blocked
  console.log(`\n======================================================`);
  console.log(`🔑 [VERIFICATION CODE] for ${email}: ${code}`);
  console.log(`======================================================\n`);
  return { success: true, delivered: false };
};

module.exports = {
  sendVerificationCode,
};
