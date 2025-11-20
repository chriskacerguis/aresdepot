const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { redirectIfAuthenticated } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');
const User = require('../models/User');
const Member = require('../models/Member');
const Passkey = require('../models/Passkey');
const { geocodeAddress } = require('../utils/geocode');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

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
      console.log('Login attempt:', { identifier, found_member: !!member });
      let user = null;
      
      if (member) {
        user = await User.findById(member.user_id);
        console.log('Found user:', { user_id: user?.id, is_admin: user?.is_admin });
      }

      if (!user || !(await User.verifyPassword(password, user.password))) {
        console.log('Login failed:', { user_found: !!user });
        return res.render('auth/login', {
          errors: [{ msg: 'Invalid callsign or password' }],
          formData: req.body
        });
      }

      req.session.user = {
        id: user.id,
        email: user.email,
        callsign: member ? member.callsign : identifier.toUpperCase(),
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

      // Geocode address if provided
      let latitude = null;
      let longitude = null;
      if (address && city && state && zip) {
        const coords = await geocodeAddress(address, city, state, zip);
        if (coords) {
          latitude = coords.lat;
          longitude = coords.lon;
        }
      }

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
        latitude,
        longitude,
        fccLicensePath: null
      });

      // Auto-login
      req.session.user = {
        id: userId,
        email: email,
        callsign: callsign,
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

// WebAuthn configuration
const RP_NAME = 'ARES Depot';
const RP_ID = process.env.RP_ID || 'localhost';
const ORIGIN = process.env.ORIGIN || 'http://localhost:3000';

// Passkey Registration - Generate Options
router.post('/passkey/register-options', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const member = await Member.findByUserId(user.id);
    const existingPasskeys = await Passkey.findByUserId(user.id);

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: user.id.toString(),
      userName: member ? member.callsign : user.email,
      userDisplayName: member ? `${member.first_name} ${member.last_name} (${member.callsign})` : user.email,
      timeout: 60000,
      attestationType: 'none',
      excludeCredentials: existingPasskeys.map(pk => ({
        id: Buffer.from(pk.credential_id, 'base64'),
        type: 'public-key',
        transports: pk.transports || [],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // Store challenge in database
    await Passkey.setChallenge(user.id, options.challenge);

    res.json(options);
  } catch (error) {
    console.error('Passkey registration options error:', error);
    res.status(500).json({ error: 'Failed to generate registration options' });
  }
});

// Passkey Registration - Verify Response
router.post('/passkey/register', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const expectedChallenge = await Passkey.getChallenge(user.id);
    if (!expectedChallenge) {
      return res.status(400).json({ error: 'No registration in progress' });
    }

    const { credential, deviceName } = req.body;

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'Verification failed' });
    }

    const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

    // Store the passkey
    await Passkey.create(
      user.id,
      Buffer.from(credentialID).toString('base64'),
      Buffer.from(credentialPublicKey).toString('base64'),
      counter,
      deviceName || 'Unnamed Device',
      credential.response.transports
    );

    // Clear the challenge
    await Passkey.clearChallenge(user.id);

    res.json({ verified: true });
  } catch (error) {
    console.error('Passkey registration verification error:', error);
    res.status(500).json({ error: 'Failed to verify registration' });
  }
});

// Passkey Authentication - Generate Options
router.post('/passkey/login-options', async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ error: 'Identifier required' });
    }

    // Find user by callsign
    const member = await Member.findByCallsign(identifier.toUpperCase());
    if (!member) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await User.findById(member.user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passkeys = await Passkey.findByUserId(user.id);

    if (passkeys.length === 0) {
      return res.status(404).json({ error: 'No passkeys registered' });
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      timeout: 60000,
      allowCredentials: passkeys.map(pk => ({
        id: Buffer.from(pk.credential_id, 'base64'),
        type: 'public-key',
        transports: pk.transports || [],
      })),
      userVerification: 'preferred',
    });

    // Store challenge in database
    await Passkey.setChallenge(user.id, options.challenge);

    res.json({ options, userId: user.id });
  } catch (error) {
    console.error('Passkey authentication options error:', error);
    res.status(500).json({ error: 'Failed to generate authentication options' });
  }
});

// Passkey Authentication - Verify Response
router.post('/passkey/login', async (req, res) => {
  try {
    const { credential, userId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const expectedChallenge = await Passkey.getChallenge(user.id);
    if (!expectedChallenge) {
      return res.status(400).json({ error: 'No authentication in progress' });
    }

    const passkey = await Passkey.findByCredentialId(credential.id);
    if (!passkey || passkey.user_id !== user.id) {
      return res.status(404).json({ error: 'Passkey not found' });
    }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: Buffer.from(passkey.credential_id, 'base64'),
        credentialPublicKey: Buffer.from(passkey.credential_public_key, 'base64'),
        counter: passkey.counter,
      },
    });

    if (!verification.verified) {
      return res.status(400).json({ error: 'Verification failed' });
    }

    // Update counter
    await Passkey.updateCounter(passkey.credential_id, verification.authenticationInfo.newCounter);

    // Clear challenge
    await Passkey.clearChallenge(user.id);

    // Get member info
    const member = await Member.findByUserId(user.id);

    // Set session
    req.session.user = {
      id: user.id,
      email: user.email,
      callsign: member ? member.callsign : 'Unknown',
      is_admin: user.is_admin
    };

    res.json({ 
      verified: true,
      redirectTo: user.is_admin ? '/admin/dashboard' : '/members/dashboard'
    });
  } catch (error) {
    console.error('Passkey authentication verification error:', error);
    res.status(500).json({ error: 'Failed to verify authentication' });
  }
});

module.exports = router;
