const nodemailer = require('nodemailer');
const Setting = require('../models/Setting');

let transporter = null;

async function getTransporter() {
  try {
    const config = await Setting.getSmtpConfig();
    
    // Verify nodemailer is loaded correctly
    if (!nodemailer || typeof nodemailer.createTransport !== 'function') {
      throw new Error('Nodemailer module not properly loaded');
    }
    
    // Create new transporter with current settings
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user && config.pass ? {
        user: config.user,
        pass: config.pass
      } : undefined
    });
  } catch (error) {
    console.error('Error creating transporter:', error);
    throw error;
  }
}

async function sendEmail(to, subject, html, text = null) {
  try {
    const config = await Setting.getSmtpConfig();
    const transport = await getTransporter();
    
    const mailOptions = {
      from: config.from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Strip HTML tags for text version
    };

    const info = await transport.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error: error.message };
  }
}

async function sendPasswordResetEmail(to, resetToken, recipientName) {
  const resetUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
  
  const html = `
    <h2>Password Reset Request</h2>
    <p>Hi ${recipientName},</p>
    <p>You requested to reset your password for ARES Depot. Click the link below to reset your password:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
    <p>Best regards,<br>ARES Depot Team</p>
  `;

  return await sendEmail(to, 'Password Reset Request - ARES Depot', html);
}

async function sendWelcomeEmail(to, recipientName, callsign) {
  const loginUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/auth/login`;
  
  const html = `
    <h2>Welcome to ARES Depot!</h2>
    <p>Hi ${recipientName} (${callsign}),</p>
    <p>Your account has been successfully created. You can now log in and start managing your ARES activities.</p>
    <p><a href="${loginUrl}">Log in to ARES Depot</a></p>
    <p>If you have any questions, please contact your administrator.</p>
    <p>Best regards,<br>ARES Depot Team</p>
  `;

  return await sendEmail(to, 'Welcome to ARES Depot', html);
}

async function testSmtpConnection() {
  try {
    const transport = await getTransporter();
    await transport.verify();
    return { success: true, message: 'SMTP connection successful' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  testSmtpConnection
};
