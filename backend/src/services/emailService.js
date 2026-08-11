const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

/**
 * Email service using SendGrid Web API (HTTP).
 *
 * Render free tier blocks SMTP ports (25, 465, 587), so we use the
 * HTTP-based SendGrid API instead, which communicates over port 443.
 *
 * Requires:
 *   SENDGRID_API_KEY  – SendGrid API key
 *   EMAIL_USER        – verified sender email address on SendGrid
 */

let sgMail = null;

function getSendGrid() {
  if (sgMail) return sgMail;

  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY must be set in your .env file.');
  }

  sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(apiKey);
  return sgMail;
}

/**
 * Send a password reset code via email.
 *
 * Retries up to 3 times on transient failures.
 */
async function sendResetCodeEmail(toEmail, userName, resetCode) {
  const MAX_RETRIES = 3;
  const sg = getSendGrid();

  const msg = {
    to: toEmail,
    from: {
      email: process.env.EMAIL_USER || 'ordergo2006@gmail.com',
      name: 'OrderGo',
    },
    subject: 'Your OrderGo Password Reset Code',
    text: `Hi ${userName}, your OrderGo password reset code is: ${resetCode}. This code expires in 10 minutes. If you didn't request this, ignore this email.`,
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
      const [response] = await sg.send(msg);

      console.log(`📧 Reset code email sent to ${toEmail} (attempt ${attempt}, status: ${response.statusCode})`);
      return { messageId: response.headers['x-message-id'] || 'sent' };
    } catch (err) {
      lastError = err;
      const status = err.code || err.response?.statusCode;
      const body = err.response?.body;

      console.error(`❌ Email send attempt ${attempt}/${MAX_RETRIES} failed (status: ${status}):`, 
        body?.errors || err.message);

      // Don't retry on auth/permission errors (401, 403) – they won't self-heal
      if (status === 401 || status === 403) {
        const errorMsg = body?.errors?.[0]?.message || 'SendGrid authentication failed';
        throw new Error(`SendGrid auth error: ${errorMsg}`);
      }

      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, attempt * 1000));
      }
    }
  }

  throw lastError;
}

module.exports = { sendResetCodeEmail };
