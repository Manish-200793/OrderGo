const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

/**
 * Email service using real Gmail SMTP
 */

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter;
}

/**
 * Send a password reset code via email.
 */
async function sendResetCodeEmail(toEmail, userName, resetCode) {
  const transport = getTransporter();

  const mailOptions = {
    from: `"OrderGo 🍽️" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '🔐 Your OrderGo Password Reset Code',
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;background:#0a0a1a;border-radius:16px;overflow:hidden;border:1px solid #2a2a4a;">
        <div style="background:linear-gradient(135deg,#ff6b35,#ff3d7f);padding:32px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:28px;">🍽️ OrderGo</h1>
          <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Password Reset Request</p>
        </div>
        <div style="padding:32px;color:#e0e0ff;">
          <p style="font-size:16px;margin:0 0 16px;">Hi <strong>${userName}</strong>,</p>
          <p style="font-size:14px;color:#a0a0c0;margin:0 0 24px;line-height:1.6;">
            We received a request to reset your password. Use the code below to set a new password. This code expires in <strong>10 minutes</strong>.
          </p>
          <div style="text-align:center;margin:24px 0;">
            <div style="display:inline-block;background:linear-gradient(135deg,#ff6b35,#ff3d7f);border-radius:12px;padding:16px 40px;">
              <span style="font-size:36px;font-weight:900;letter-spacing:8px;color:white;font-family:monospace;">${resetCode}</span>
            </div>
          </div>
          <p style="font-size:13px;color:#6b6b8a;margin:24px 0 0;line-height:1.6;">
            If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </div>
        <div style="padding:16px 32px;border-top:1px solid #2a2a4a;text-align:center;">
          <p style="font-size:12px;color:#6b6b8a;margin:0;">© 2024 OrderGo • Built for campus life</p>
        </div>
      </div>
    `,
  };

  const info = await transport.sendMail(mailOptions);
  
  console.log(`📧 Real reset code email sent to ${toEmail}`);

  return { messageId: info.messageId };
}

module.exports = { sendResetCodeEmail };
