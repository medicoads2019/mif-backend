const nodemailer = require("nodemailer");

let transporter = null;

const toBoolean = (value, defaultValue) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  return String(value).toLowerCase() === "true";
};

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: toBoolean(
        process.env.SMTP_TLS_REJECT_UNAUTHORIZED,
        false,
      ),
    },
  });

  return transporter;
};

exports.sendForgotPasswordOtpMail = async ({ to, name, otpCode }) => {
  const activeTransporter = getTransporter();

  if (!activeTransporter) {
    throw new Error("SMTP is not configured");
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await activeTransporter.sendMail({
    from,
    to,
    subject: "MyIndianFestivals Password Reset OTP",
    text: `Hello ${name || "Client"}, your OTP code is ${otpCode}. Use this code to reset your password.`,
    html: `<p>Hello ${name || "Client"},</p><p>Your OTP code is <b>${otpCode}</b>.</p><p>Use this code to reset your password.</p>`,
  });
};

exports.sendEmailVerificationOtpMail = async ({ to, name, otpCode }) => {
  const activeTransporter = getTransporter();

  if (!activeTransporter) {
    throw new Error("SMTP is not configured");
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await activeTransporter.sendMail({
    from,
    to,
    subject: "MyIndianFestivals – Verify Your Email",
    text: `Hello ${name || "Client"}, your email verification OTP is ${otpCode}. Enter this code to complete your registration.`,
    html: `<p>Hello ${name || "Client"},</p><p>Your email verification OTP is <b>${otpCode}</b>.</p><p>Enter this code to complete your registration.</p>`,
  });
};
