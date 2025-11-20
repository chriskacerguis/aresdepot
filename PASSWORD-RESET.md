# Password Reset System

The ARES Depot now includes a secure password reset system.

## How It Works

1. **Request Reset**: Users visit `/auth/forgot-password` and enter their email address
2. **Token Generation**: System generates a secure random token valid for 1 hour
3. **Reset Link**: A reset link is generated (currently logged to console, ready for email integration)
4. **Set New Password**: Users click the link and set a new password
5. **Token Cleanup**: Reset token is cleared after successful password reset

## Database Changes

Added to `users` table:
- `reset_token` - Stores the password reset token
- `reset_token_expires` - Timestamp when the token expires

## Routes

- `GET /auth/forgot-password` - Request password reset form
- `POST /auth/forgot-password` - Process reset request
- `GET /auth/reset-password/:token` - Reset password form
- `POST /auth/reset-password/:token` - Process password reset

## Email Integration

Currently, the reset link is logged to the console. To enable email sending:

1. Install nodemailer:
```bash
npm install nodemailer
```

2. Add to `.env`:
```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=ARES Depot <noreply@aresdepot.com>
```

3. Create `src/utils/email.js`:
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendPasswordResetEmail(email, resetLink) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Password Reset - ARES Depot',
    html: `
      <h2>Password Reset Request</h2>
      <p>You requested to reset your password. Click the link below to set a new password:</p>
      <p><a href="${resetLink}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  });
}

module.exports = { sendPasswordResetEmail };
```

4. Uncomment the email sending line in `src/routes/auth.js` (line ~185):
```javascript
await sendPasswordResetEmail(email, resetLink);
```

## Security Features

- Tokens are cryptographically random (32 bytes)
- Tokens expire after 1 hour
- Success message shown regardless of email existence (prevents email enumeration)
- Password must be at least 8 characters
- Password confirmation required
- Tokens are single-use (cleared after reset)
- Passwords are hashed with bcrypt

## Testing

1. Reset database to apply migration:
```bash
rm data/ares.db
npm run migrate
npm run seed
```

2. Request password reset at `/auth/forgot-password`
3. Check console for reset link
4. Use link to set new password
5. Login with new credentials
