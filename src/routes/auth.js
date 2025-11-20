const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { redirectIfAuthenticated } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');
const User = require('../models/User');
const Member = require('../models/Member');

// Login page
router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('auth/login', { errors: [], formData: {}, query: req.query });
});

// Login handler
router.post('/login', 
  loginLimiter,
  [
    body('identifier').notEmpty().withMessage('Callsign is required'),
    body('password').notEmpty()
  ],
  async (req, res) => {
    const { identifier, password } = req.body;

    try {
      // Find member by callsign
      const member = await Member.findByCallsign(identifier.toUpperCase());
      let user = null;
      
      if (member) {
        user = await User.findById(member.user_id);
      }

      if (!user || !(await User.verifyPassword(password, user.password))) {
        return res.render('auth/login', {
          errors: [{ msg: 'Invalid callsign or password' }],
          formData: req.body
        });
      }

      req.session.user = {
        id: user.id,
        email: user.email,
        is_admin: user.is_admin
      };

      const returnTo = req.session.returnTo || (user.is_admin ? '/admin/dashboard' : '/members/dashboard');
      delete req.session.returnTo;
      res.redirect(returnTo);

    } catch (error) {
      console.error('Login error:', error);
      res.render('auth/login', {
        errors: [{ msg: 'An error occurred. Please try again.' }],
        formData: req.body
      });
    }
  }
);

// Register page
router.get('/register', redirectIfAuthenticated, (req, res) => {
  res.render('auth/register', { errors: [], formData: {} });
});

// Register handler
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('callsign').trim().notEmpty().toUpperCase(),
    body('phone').trim().notEmpty(),
    body('county').trim().notEmpty()
  ],
  async (req, res) => {
    const errors = require('express-validator').validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.render('auth/register', {
        errors: errors.array(),
        formData: req.body
      });
    }

    const { email, password, firstName, lastName, address, city, state, zip, phone, callsign, county } = req.body;

    try {
      // Check if email already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.render('auth/register', {
          errors: [{ msg: 'Email already registered' }],
          formData: req.body
        });
      }

      // Check if callsign already exists
      const existingCallsign = await Member.findByCallsign(callsign);
      if (existingCallsign) {
        return res.render('auth/register', {
          errors: [{ msg: 'Callsign already registered' }],
          formData: req.body
        });
      }

      // Create user
      const userId = await User.create(email, password, false);

      // Create member profile
      await Member.create({
        userId,
        firstName,
        lastName,
        address: address || '',
        city: city || '',
        state: state || '',
        zip: zip || '',
        phone,
        callsign,
        county,
        fccLicensePath: null
      });

      // Auto-login
      req.session.user = {
        id: userId,
        email: email,
        is_admin: false
      };

      res.redirect('/members/dashboard');

    } catch (error) {
      console.error('Registration error:', error);
      res.render('auth/register', {
        errors: [{ msg: 'An error occurred. Please try again.' }],
        formData: req.body
      });
    }
  }
);

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

// Forgot password page
router.get('/forgot-password', redirectIfAuthenticated, (req, res) => {
  res.render('auth/forgot-password', { errors: [], formData: {}, success: false });
});

// Forgot password handler
router.post('/forgot-password',
  [
    body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email address')
  ],
  async (req, res) => {
    const { email } = req.body;

    try {
      const user = await User.findByEmail(email);

      if (user) {
        // Generate reset token
        const crypto = require('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

        await User.setResetToken(user.id, resetToken, resetTokenExpires);

        // Send email (for now, just log the reset link)
        const resetLink = `${req.protocol}://${req.get('host')}/auth/reset-password/${resetToken}`;
        console.log('Password reset link:', resetLink);
        console.log('Password reset requested for:', email);
        
        // TODO: Send actual email here
        // await sendPasswordResetEmail(email, resetLink);
      }

      // Always show success message for security (don't reveal if email exists)
      res.render('auth/forgot-password', { 
        errors: [], 
        formData: {}, 
        success: true 
      });

    } catch (error) {
      console.error('Forgot password error:', error);
      res.render('auth/forgot-password', {
        errors: [{ msg: 'An error occurred. Please try again.' }],
        formData: req.body,
        success: false
      });
    }
  }
);

// Reset password page
router.get('/reset-password/:token', async (req, res) => {
  try {
    const user = await User.findByResetToken(req.params.token);

    if (!user || new Date(user.reset_token_expires) < new Date()) {
      return res.render('error', { 
        message: 'Password reset link is invalid or has expired.' 
      });
    }

    res.render('auth/reset-password', { 
      errors: [], 
      token: req.params.token 
    });

  } catch (error) {
    console.error('Reset password page error:', error);
    res.render('error', { message: 'An error occurred' });
  }
});

// Reset password handler
router.post('/reset-password/:token',
  [
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('confirmPassword')
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Passwords do not match')
  ],
  async (req, res) => {
    const { password } = req.body;
    const { token } = req.params;

    try {
      const user = await User.findByResetToken(token);

      if (!user || new Date(user.reset_token_expires) < new Date()) {
        return res.render('auth/reset-password', {
          errors: [{ msg: 'Password reset link is invalid or has expired.' }],
          token
        });
      }

      // Update password and clear reset token
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.updatePassword(user.id, hashedPassword);
      await User.clearResetToken(user.id);

      // Redirect to login with success message
      res.redirect('/auth/login?reset=success');

    } catch (error) {
      console.error('Reset password error:', error);
      res.render('auth/reset-password', {
        errors: [{ msg: 'An error occurred. Please try again.' }],
        token
      });
    }
  }
);

module.exports = router;
