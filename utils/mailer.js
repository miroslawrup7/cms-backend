// utils/mailer.js
const nodemailer = require('nodemailer')

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM = 'no-reply@example.com'
} = process.env

// pojedynczy transport – wielokrotne użycie
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT) || 587,
  secure: String(SMTP_SECURE) === 'true',
  auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
})

// prosta funkcja wysyłki
async function sendMail({ to, subject, text, html }) {
  if (!to) throw new Error('Brak adresata (to)')
  const info = await transporter.sendMail({
    from: MAIL_FROM,
    to,
    subject,
    text,
    html
  })
  return info
}

module.exports = { sendMail, transporter }
