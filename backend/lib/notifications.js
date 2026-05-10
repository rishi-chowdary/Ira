import nodemailer from 'nodemailer';

let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  });
}

export async function sendEmail({ to, subject, text }) {
  if (transporter) {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'no-reply@ira.local',
      to,
      subject,
      text,
    });
    return;
  }

  console.log(`[email:${to}] ${subject}\n${text}`);
}

export async function sendWhatsappMessage({ to, body }) {
  console.log(`[whatsapp:${to}] ${body}`);
}
