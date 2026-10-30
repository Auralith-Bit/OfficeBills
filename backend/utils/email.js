const nodemailer = require('nodemailer');

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOtpEmail({ email, otp, subject, title, description }) {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 587);
  const secure = String(process.env.EMAIL_SECURE || 'false').toLowerCase() === 'true';
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const fromAddress = process.env.EMAIL_FROM || user || 'noreply@officebill.local';

  if (!host || !user || !pass) {
    console.warn(`[OTP] Email not configured for ${email}. Fallback OTP: ${otp}`);
    return {
      ok: false,
      fallbackOtp: otp,
      message: 'Email delivery is not configured on this server yet. OTP logged in the backend console for local testing.',
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || 'OfficeBill'}" <${fromAddress}>`,
    to: email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a; background: #f8fafc; padding: 24px;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
          <p style="margin: 0 0 12px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #0f766e; font-weight: bold;">
            OfficeBill Security
          </p>
          <h2 style="margin: 0 0 16px; font-size: 24px; color: #0f172a;">${title}</h2>
          <p style="margin: 0 0 16px; font-size: 15px; color: #475569;">${description}</p>
          <div style="background: #ecfeff; border: 1px solid #a7f3d0; border-radius: 8px; padding: 18px; text-align: center; margin: 18px 0;">
            <div style="font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; color: #115e59; margin-bottom: 8px; font-weight: bold;">
              Your code
            </div>
            <div style="font-size: 32px; letter-spacing: 0.3em; font-weight: 700; color: #0f172a;">${otp}</div>
          </div>
          <p style="margin: 0; font-size: 13px; color: #64748b;">This code expires in 10 minutes. Never share it with anyone.</p>
        </div>
      </div>
    `,
  });

  return { ok: true };
}

module.exports = { generateOtp, sendOtpEmail };
