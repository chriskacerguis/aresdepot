const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { redirectIfAuthenticated } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');
const User = require('../models/User');
const Member = require('../models/Member');

// Login page
router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('auth/login', { errors: [], formData: {} });
});

// Login handler
router.post('/login', 
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    const { email, password } = req.body;

    try {
      const user = await User.findByEmail(email);

      if (!user || !(await User.verifyPassword(password, user.password))) {
        return res.render('auth/login', {
          errors: [{ msg: 'Invalid email or password' }],
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

module.exports = router;
