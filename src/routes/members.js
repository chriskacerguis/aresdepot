const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { requireAuth, requireMember } = require('../middleware/auth');
const { uploadLicense, uploadPhoto } = require('../middleware/upload');
const Member = require('../models/Member');
const Task = require('../models/Task');
const Event = require('../models/Event');
const multer = require('multer');
const { geocodeAddress } = require('../utils/geocode');

// Member dashboard
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const member = await Member.findByUserId(req.session.user.id);
    
    if (!member) {
      return res.redirect('/members/profile/edit');
    }

    const progress = await Member.getWithProgress(member.id);
    const upcomingEvents = await Event.getUpcoming();

    // Filter events member can attend
    const eligibleEvents = [];
    for (const event of upcomingEvents) {
      if (await Event.canMemberAttend(member.id, event.id)) {
        const rsvp = await Event.getMemberRSVPStatus(event.id, member.id);
        event.userRSVP = rsvp;
        eligibleEvents.push(event);
      }
    }

    res.render('members/dashboard', { 
      member: progress,
      events: eligibleEvents
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('error', { message: 'Error loading dashboard' });
  }
});

// View/Edit profile
router.get('/profile/edit', requireAuth, async (req, res) => {
  try {
    const member = await Member.findByUserId(req.session.user.id);
    res.render('members/profile-edit', { 
      member: member || {},
      errors: [],
      formData: member || {}
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.render('error', { message: 'Error loading profile' });
  }
});

// Update profile
router.post('/profile/edit',
  requireAuth,
  (req, res, next) => {
    const upload = multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          const path = require('path');
          const dir = file.fieldname === 'fccLicense' ? 
            path.join(__dirname, '../../uploads/licenses') : 
            path.join(__dirname, '../../uploads/photos');
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const prefix = file.fieldname === 'fccLicense' ? 'license-' : 'photo-';
          cb(null, prefix + uniqueSuffix + require('path').extname(file.originalname));
        }
      }),
      fileFilter: (req, file, cb) => {
        if (file.fieldname === 'fccLicense') {
          cb(null, file.mimetype === 'application/pdf');
        } else {
          cb(null, /jpeg|jpg|png/.test(file.mimetype));
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 }
    }).fields([
      { name: 'fccLicense', maxCount: 1 },
      { name: 'profilePhoto', maxCount: 1 }
    ]);
    upload(req, res, next);
  },
  [
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('callsign').trim().notEmpty().toUpperCase(),
    body('phone').trim().notEmpty(),
    body('county').trim().notEmpty()
  ],
  async (req, res) => {
    const errors = require('express-validator').validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.render('members/profile-edit', {
        errors: errors.array(),
        formData: req.body,
        member: req.body
      });
    }

    const { firstName, lastName, address, city, state, zip, phone, callsign, county, licenseClass } = req.body;
    const fccLicensePath = req.files?.fccLicense ? '/uploads/licenses/' + req.files.fccLicense[0].filename : null;
    const profilePhotoPath = req.files?.profilePhoto ? '/uploads/photos/' + req.files.profilePhoto[0].filename : null;

    try {
      const member = await Member.findByUserId(req.session.user.id);

      // Check if address changed and geocode if needed
      let latitude = member?.latitude || null;
      let longitude = member?.longitude || null;
      
      const addressChanged = member && (
        member.address !== address || 
        member.city !== city || 
        member.state !== state || 
        member.zip !== zip
      );

      if ((addressChanged || !member) && address && city && state && zip) {
        const coords = await geocodeAddress(address, city, state, zip);
        if (coords) {
          latitude = coords.lat;
          longitude = coords.lon;
        }
      }

      const updateData = { 
        firstName, 
        lastName, 
        address, 
        city, 
        state, 
        zip, 
        phone, 
        callsign, 
        county, 
        licenseClass,
        latitude,
        longitude,
        // Radio Equipment
        hfCapable: req.body.hfCapable ? 1 : 0,
        hfPower: req.body.hfPower || null,
        vhfUhfCapable: req.body.vhfUhfCapable ? 1 : 0,
        vhfUhfPower: req.body.vhfUhfPower || null,
        mobileStation: req.body.mobileStation ? 1 : 0,
        portableStation: req.body.portableStation ? 1 : 0,
        towerAntennaHeight: req.body.towerAntennaHeight || null,
        // Digital Modes
        winlinkCapable: req.body.winlinkCapable ? 1 : 0,
        aprsCapable: req.body.aprsCapable ? 1 : 0,
        packetRadio: req.body.packetRadio ? 1 : 0,
        ft8Capable: req.body.ft8Capable ? 1 : 0,
        js8callCapable: req.body.js8callCapable ? 1 : 0,
        rttyCapable: req.body.rttyCapable ? 1 : 0,
        sstvCapable: req.body.sstvCapable ? 1 : 0,
        // Digital Voice
        dstarCapable: req.body.dstarCapable ? 1 : 0,
        dmrCapable: req.body.dmrCapable ? 1 : 0,
        fusionCapable: req.body.fusionCapable ? 1 : 0,
        // Power & Infrastructure
        emergencyPower: req.body.emergencyPower ? 1 : 0,
        emergencyPowerType: req.body.emergencyPowerType || null,
        backupBatteries: req.body.backupBatteries ? 1 : 0,
        solarPower: req.body.solarPower ? 1 : 0,
        satelliteInternet: req.body.satelliteInternet ? 1 : 0,
        meshNetwork: req.body.meshNetwork ? 1 : 0,
        firstnetDevice: req.body.firstnetDevice ? 1 : 0,
        // Emergency Readiness
        goKitReady: req.body.goKitReady ? 1 : 0,
        capabilitiesNotes: req.body.capabilitiesNotes || null
      };
      if (fccLicensePath) updateData.fccLicensePath = fccLicensePath;
      if (profilePhotoPath) updateData.profilePhotoPath = profilePhotoPath;

      if (member) {
        await Member.update(member.id, updateData);
      } else {
        await Member.create({
          userId: req.session.user.id,
          ...updateData
        });
      }

      res.redirect('/members/dashboard');
    } catch (error) {
      console.error('Profile update error:', error);
      res.render('members/profile-edit', {
        errors: [{ msg: 'Error updating profile' }],
        formData: req.body,
        member: req.body
      });
    }
  }
);

// View member directory
router.get('/directory', requireAuth, async (req, res) => {
  try {
    const directory = await Member.getDirectory();
    res.render('members/directory', { members: directory });
  } catch (error) {
    console.error('Directory error:', error);
    res.render('error', { message: 'Error loading directory' });
  }
});

// View tasks
router.get('/tasks', requireAuth, async (req, res) => {
  try {
    const member = await Member.findByUserId(req.session.user.id);
    if (!member) {
      return res.redirect('/members/profile/edit');
    }

    const tasks = await Task.getMemberTasks(member.id);
    res.render('members/tasks', { tasks });
  } catch (error) {
    console.error('Tasks error:', error);
    res.render('error', { message: 'Error loading tasks' });
  }
});

// Mark task as completed
router.post('/tasks/:taskId/complete', requireAuth, async (req, res) => {
  try {
    const member = await Member.findByUserId(req.session.user.id);
    if (!member) {
      return res.redirect('/members/profile/edit');
    }

    await Task.markCompleted(member.id, req.params.taskId, req.body.notes || '');
    res.redirect('/members/tasks');
  } catch (error) {
    console.error('Task completion error:', error);
    res.redirect('/members/tasks');
  }
});

module.exports = router;
