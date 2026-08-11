const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

/**
 * Email service using Gmail SMTP with App Password.
 *
 * Requires these env vars:
 *   EMAIL_USER  – full Gmail address (e.g. ordergo2006@gmail.com)
 *   EMAIL_PASS  – 16-char App Password generated from Google Account settings
 */

let transporter = null;
let transporterVerified = false;

/**
 * Create (or return cached) nodemailer transporter using Gmail SMTP.
 */
function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error(
      'EMAIL_USER and EMAIL_PASS must be set in your .env file. ' +
      'Generate an App Password at https://myaccount.google.com/apppasswords'
    );
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',          // Uses smtp.gmail.com:465 under the hood
    auth: { user, pass },
    // Pool connections for better throughput if multiple emails are sent
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
  });

  return transporter;
}

/**
 * Verify the SMTP connection is alive. Runs once and caches the result.
 * Throws a descriptive error if credentials are wrong.
 */
async function ensureConnection() {
  if (transporterVerified) return;

  const t = getTransporter();
  try {
    await t.verify();
    transporterVerified = true;
    console.log('✅ Gmail SMTP connection verified');
  } catch (err) {
    // Reset so next call re-creates the transporter
    transporter = null;
    transporterVerified = false;

    if (err.responseCode === 535 || err.code === 'EAUTH') {
      throw new Error(
        'Gmail authentication failed. Make sure EMAIL_PASS is a valid App Password ' +
        '(not your regular Gmail password). Generate one at ' +
        'https://myaccount.google.com/apppasswords'
      );
    }
    throw new Error(`SMTP connection failed: ${err.message}`);
  }
}

/**
 * Send a password reset code via email.
 *
 * Retries up to 3 times on transient failures.
 */
async function sendResetCodeEmail(toEmail, userName, resetCode) {
  const MAX_RETRIES = 3;

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

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await ensureConnection();

      const transport = getTransporter();
      const info = await transport.sendMail(mailOptions);

      console.log(`📧 Reset code email sent to ${toEmail} (attempt ${attempt}, messageId: ${info.messageId})`);
      return { messageId: info.messageId };
    } catch (err) {
      lastError = err;
      console.error(`❌ Email send attempt ${attempt}/${MAX_RETRIES} failed:`, err.message);

      // Don't retry on auth errors – they won't self-heal
      if (err.message.includes('authentication failed') || err.responseCode === 535) {
        break;
      }

      // Reset transporter so next attempt creates a fresh connection
      transporter = null;
      transporterVerified = false;

      if (attempt < MAX_RETRIES) {
        // Exponential back-off: 1s, 2s
        await new Promise((r) => setTimeout(r, attempt * 1000));
      }
    }
  }

  // All retries exhausted
  throw lastError;
}

module.exports = { sendResetCodeEmail };
