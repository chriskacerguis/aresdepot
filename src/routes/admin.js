const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Member = require('../models/Member');
const Tier = require('../models/Tier');
const Task = require('../models/Task');
const Event = require('../models/Event');
const Achievement = require('../models/Achievement');
const Setting = require('../models/Setting');
const { testSmtpConnection } = require('../utils/email');

// Admin dashboard
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const members = await Member.getAll();
    const tiers = await Tier.getAll();
    const upcomingEvents = await Event.getUpcoming();
    const pendingVerifications = await Achievement.getPendingVerifications();

    res.render('admin/dashboard', {
      stats: {
        totalMembers: members.length,
        totalTiers: tiers.length,
        upcomingEvents: upcomingEvents.length,
        pendingVerifications: pendingVerifications.length
      },
      recentMembers: members.slice(0, 5),
      upcomingEvents: upcomingEvents.slice(0, 5),
      pendingVerifications: pendingVerifications.slice(0, 5)
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.render('error', { message: 'Error loading dashboard' });
  }
});

// Manage tiers
router.get('/tiers', requireAdmin, async (req, res) => {
  try {
    const tiers = await Tier.getAll();
    res.render('admin/tiers', { tiers, errors: [], formData: {} });
  } catch (error) {
    console.error('Tiers error:', error);
    res.render('error', { message: 'Error loading tiers' });
  }
});

// Create tier
router.post('/tiers/create',
  requireAdmin,
  [
    body('name').trim().notEmpty(),
    body('sortOrder').isInt()
  ],
  async (req, res) => {
    const errors = require('express-validator').validationResult(req);
    
    if (!errors.isEmpty()) {
      const tiers = await Tier.getAll();
      return res.render('admin/tiers', {
        tiers,
        errors: errors.array(),
        formData: req.body
      });
    }

    try {
      await Tier.create(req.body.name, req.body.description || '', req.body.sortOrder);
      res.redirect('/admin/tiers');
    } catch (error) {
      console.error('Create tier error:', error);
      const tiers = await Tier.getAll();
      res.render('admin/tiers', {
        tiers,
        errors: [{ msg: 'Error creating tier' }],
        formData: req.body
      });
    }
  }
);

// Manage tasks for a tier
router.get('/tiers/:id/tasks', requireAdmin, async (req, res) => {
  try {
    const tier = await Tier.getWithTasks(req.params.id);
    if (!tier) {
      return res.render('error', { message: 'Tier not found' });
    }

    res.render('admin/tier-tasks', { tier, errors: [], formData: {} });
  } catch (error) {
    console.error('Tier tasks error:', error);
    res.render('error', { message: 'Error loading tier tasks' });
  }
});

// Create task
router.post('/tiers/:id/tasks/create',
  requireAdmin,
  [
    body('name').trim().notEmpty(),
    body('sortOrder').isInt()
  ],
  async (req, res) => {
    const errors = require('express-validator').validationResult(req);
    
    if (!errors.isEmpty()) {
      const tier = await Tier.getWithTasks(req.params.id);
      return res.render('admin/tier-tasks', {
        tier,
        errors: errors.array(),
        formData: req.body
      });
    }

    try {
      await Task.create(req.params.id, req.body.name, req.body.description || '', req.body.sortOrder);
      res.redirect(`/admin/tiers/${req.params.id}/tasks`);
    } catch (error) {
      console.error('Create task error:', error);
      const tier = await Tier.getWithTasks(req.params.id);
      res.render('admin/tier-tasks', {
        tier,
        errors: [{ msg: 'Error creating task' }],
        formData: req.body
      });
    }
  }
);

// View members
router.get('/members', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let members = await Member.getAll();
    
    // Filter by search if provided
    if (search) {
      const searchLower = search.toLowerCase();
      members = members.filter(m => 
        (m.first_name && m.first_name.toLowerCase().includes(searchLower)) ||
        (m.last_name && m.last_name.toLowerCase().includes(searchLower)) ||
        (m.callsign && m.callsign.toLowerCase().includes(searchLower)) ||
        (m.email && m.email.toLowerCase().includes(searchLower))
      );
    }
    
    const totalMembers = members.length;
    const totalPages = Math.ceil(totalMembers / limit);
    const paginatedMembers = members.slice(offset, offset + limit);
    
    res.render('admin/members', { 
      members: paginatedMembers,
      totalMembers,
      currentPage: page,
      totalPages,
      search
    });
  } catch (error) {
    console.error('Members error:', error);
    res.render('error', { message: 'Error loading members' });
  }
});

// View member details
router.get('/members/:id', requireAdmin, async (req, res) => {
  try {
    const member = await Member.getWithProgress(req.params.id);
    if (!member) {
      return res.render('error', { message: 'Member not found' });
    }

    const tasks = await Task.getMemberTasks(req.params.id);
    const allCertifications = await Achievement.getAll();
    res.render('admin/member-details', { member, tasks, allCertifications });
  } catch (error) {
    console.error('Member details error:', error);
    res.render('error', { message: 'Error loading member details' });
  }
});

// Update member contact info
router.post('/members/:id/update',
  requireAdmin,
  [
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('phone').trim().notEmpty(),
    body('address').trim().notEmpty(),
    body('city').trim().notEmpty(),
    body('state').trim().notEmpty(),
    body('zip').trim().notEmpty(),
    body('county').trim().notEmpty(),
    body('status').isIn(['active', 'inactive', 'suspended', 'banned'])
  ],
  async (req, res) => {
    const errors = require('express-validator').validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.redirect('/admin/members/' + req.params.id);
    }

    try {
      // Get current member to check if background check status changed
      const currentMember = await Member.findById(req.params.id);
      
      const updateData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
        address: req.body.address,
        city: req.body.city,
        state: req.body.state,
        zip: req.body.zip,
        county: req.body.county,
        callsign: req.body.callsign,
        status: req.body.status,
        title: req.body.title,
        backgroundCheck: req.body.backgroundCheck,
        emergencyContactName: req.body.emergencyContactName,
        emergencyContactRelationship: req.body.emergencyContactRelationship,
        emergencyContactPhone: req.body.emergencyContactPhone,
        emergencyContactEmail: req.body.emergencyContactEmail,
        adminNotes: req.body.adminNotes || null
      };
      
      // If background check status changed, update the date
      if (currentMember && currentMember.background_check !== req.body.backgroundCheck) {
        updateData.backgroundCheckDate = new Date().toISOString();
      }
      
      await Member.update(req.params.id, updateData);
      res.redirect('/admin/members/' + req.params.id);
    } catch (error) {
      console.error('Update member error:', error);
      res.redirect('/admin/members/' + req.params.id);
    }
  }
);

// Toggle admin status
router.post('/members/:id/toggle-admin',
  requireAdmin,
  async (req, res) => {
    try {
      const member = await Member.findById(req.params.id);
      
      if (!member) {
        return res.redirect('/admin/members');
      }

      // Prevent admins from removing their own admin access
      if (member.user_id === req.session.user.id) {
        return res.redirect('/admin/members/' + req.params.id);
      }

      // Toggle admin status
      await User.toggleAdmin(member.user_id);
      
      res.redirect('/admin/members/' + req.params.id);
    } catch (error) {
      console.error('Toggle admin error:', error);
      res.redirect('/admin/members/' + req.params.id);
    }
  }
);

// Update member capabilities
router.post('/members/:id/update-capabilities', requireAdmin, async (req, res) => {
  try {
    await Member.update(req.params.id, {
      emergencyPower: req.body.emergencyPower === 'true' ? 1 : 0,
      emergencyPowerType: req.body.emergencyPowerType || null,
      hfCapable: req.body.hfCapable === 'true' ? 1 : 0,
      hfPower: req.body.hfPower ? parseInt(req.body.hfPower) : null,
      vhfUhfCapable: req.body.vhfUhfCapable === 'true' ? 1 : 0,
      vhfUhfPower: req.body.vhfUhfPower ? parseInt(req.body.vhfUhfPower) : null,
      winlinkCapable: req.body.winlinkCapable === 'true' ? 1 : 0,
      satelliteInternet: req.body.satelliteInternet === 'true' ? 1 : 0,
      satelliteInternetType: req.body.satelliteInternetType || null,
      mobileStation: req.body.mobileStation === 'true' ? 1 : 0,
      portableStation: req.body.portableStation === 'true' ? 1 : 0,
      aprsCapable: req.body.aprsCapable === 'true' ? 1 : 0,
      dstarCapable: req.body.dstarCapable === 'true' ? 1 : 0,
      dmrCapable: req.body.dmrCapable === 'true' ? 1 : 0,
      fusionCapable: req.body.fusionCapable === 'true' ? 1 : 0,
      packetRadio: req.body.packetRadio === 'true' ? 1 : 0,
      sstvCapable: req.body.sstvCapable === 'true' ? 1 : 0,
      rttyCapable: req.body.rttyCapable === 'true' ? 1 : 0,
      ft8Capable: req.body.ft8Capable === 'true' ? 1 : 0,
      js8callCapable: req.body.js8callCapable === 'true' ? 1 : 0,
      aresRacesTrained: req.body.aresRacesTrained === 'true' ? 1 : 0,
      skywarnTrained: req.body.skywarnTrained === 'true' ? 1 : 0,
      incidentCommandTrained: req.body.incidentCommandTrained === 'true' ? 1 : 0,
      cprFirstAidCertified: req.body.cprFirstAidCertified === 'true' ? 1 : 0,
      goKitReady: req.body.goKitReady === 'true' ? 1 : 0,
      towerAntennaHeight: req.body.towerAntennaHeight ? parseInt(req.body.towerAntennaHeight) : null,
      backupBatteries: req.body.backupBatteries === 'true' ? 1 : 0,
      solarPower: req.body.solarPower === 'true' ? 1 : 0,
      meshNetwork: req.body.meshNetwork === 'true' ? 1 : 0,
      capabilitiesNotes: req.body.capabilitiesNotes || null
    });
    res.redirect('/admin/members/' + req.params.id);
  } catch (error) {
    console.error('Update capabilities error:', error);
    res.redirect('/admin/members/' + req.params.id);
  }
});

// Verify task
router.post('/members/:memberId/tasks/:taskId/verify', requireAdmin, async (req, res) => {
  try {
    await Task.verifyTask(req.params.memberId, req.params.taskId, req.session.user.id, req.body.notes || '');
    res.redirect(`/admin/members/${req.params.memberId}`);
  } catch (error) {
    console.error('Verify task error:', error);
    res.redirect(`/admin/members/${req.params.memberId}`);
  }
});

// Manage events
router.get('/events', requireAdmin, async (req, res) => {
  try {
    const events = await Event.getAll();
    const tiers = await Tier.getAll();
    res.render('admin/events', { events, tiers, errors: [], formData: {} });
  } catch (error) {
    console.error('Events error:', error);
    res.render('error', { message: 'Error loading events' });
  }
});

// Create event
router.post('/events/create',
  requireAdmin,
  [
    body('name').trim().notEmpty(),
    body('eventDate').isISO8601()
  ],
  async (req, res) => {
    const errors = require('express-validator').validationResult(req);
    
    if (!errors.isEmpty()) {
      const events = await Event.getAll();
      const tiers = await Tier.getAll();
      return res.render('admin/events', {
        events,
        tiers,
        errors: errors.array(),
        formData: req.body
      });
    }

    try {
      await Event.create({
        name: req.body.name,
        description: req.body.description || '',
        location: req.body.location || '',
        eventDate: req.body.eventDate,
        minimumTierId: req.body.minimumTierId || null,
        maxAttendees: req.body.maxAttendees || null,
        createdBy: req.session.user.id
      });
      res.redirect('/admin/events');
    } catch (error) {
      console.error('Create event error:', error);
      const events = await Event.getAll();
      const tiers = await Tier.getAll();
      res.render('admin/events', {
        events,
        tiers,
        errors: [{ msg: 'Error creating event' }],
        formData: req.body
      });
    }
  }
);

// Manage special achievements
router.get('/certifications', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let certifications = await Achievement.getAll();
    
    // Filter by search if provided
    if (search) {
      const searchLower = search.toLowerCase();
      certifications = certifications.filter(a => 
        a.name.toLowerCase().includes(searchLower) || 
        (a.description && a.description.toLowerCase().includes(searchLower))
      );
    }
    
    const totalCertifications = certifications.length;
    const totalPages = Math.ceil(totalCertifications / limit);
    const paginatedCertifications = certifications.slice(offset, offset + limit);
    
    const pending = await Achievement.getPendingVerifications();
    res.render('admin/certifications', { 
      certifications: paginatedCertifications,
      totalCertifications,
      currentPage: page,
      totalPages,
      search,
      pending, 
      errors: [], 
      formData: {} 
    });
  } catch (error) {
    console.error('Certifications error:', error);
    res.render('error', { message: 'Error loading certifications' });
  }
});

// Create special achievement
router.post('/certifications/create',
  requireAdmin,
  [body('name').trim().notEmpty()],
  async (req, res) => {
    const errors = require('express-validator').validationResult(req);
    
    if (!errors.isEmpty()) {
      const certifications = await Achievement.getAll();
      const pending = await Achievement.getPendingVerifications();
      return res.render('admin/certifications', {
        certifications,
        totalCertifications: certifications.length,
        currentPage: 1,
        totalPages: Math.ceil(certifications.length / 5),
        search: '',
        pending,
        errors: errors.array(),
        formData: req.body
      });
    }

    try {
      await Achievement.create(
        req.body.name,
        req.body.description || '',
        req.body.requiresProof === 'true',
        req.body.adminOnly === 'true'
      );
      res.redirect('/admin/certifications');
    } catch (error) {
      console.error('Create certification error:', error);
      const certifications = await Achievement.getAll();
      const pending = await Achievement.getPendingVerifications();
      res.render('admin/certifications', {
        certifications,
        totalCertifications: certifications.length,
        currentPage: 1,
        totalPages: Math.ceil(certifications.length / 5),
        search: '',
        pending,
        errors: [{ msg: 'Error creating certification' }],
        formData: req.body
      });
    }
  }
);

// Update achievement
router.post('/certifications/:id/update',
  requireAdmin,
  [body('name').trim().notEmpty()],
  async (req, res) => {
    const errors = require('express-validator').validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.redirect('/admin/certifications');
    }

    try {
      await Achievement.update(
        req.params.id,
        req.body.name,
        req.body.description || '',
        req.body.requiresProof === 'true',
        req.body.adminOnly === 'true'
      );
      res.redirect('/admin/certifications');
    } catch (error) {
      console.error('Update achievement error:', error);
      res.redirect('/admin/certifications');
    }
  }
);

// Delete achievement
router.post('/certifications/:id/delete', requireAdmin, async (req, res) => {
  try {
    await Achievement.delete(req.params.id);
    res.redirect('/admin/certifications');
  } catch (error) {
    console.error('Delete achievement error:', error);
    res.redirect('/admin/certifications');
  }
});

// Verify achievement
router.post('/certifications/:memberId/:achievementId/verify', requireAdmin, async (req, res) => {
  try {
    await Achievement.verify(req.params.memberId, req.params.achievementId, req.session.user.id, req.body.notes || '');
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      res.json({ success: true });
    } else {
      res.redirect(`/admin/members/${req.params.memberId}#certifications`);
    }
  } catch (error) {
    console.error('Verify achievement error:', error);
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      res.status(500).json({ success: false, error: error.message });
    } else {
      res.redirect(`/admin/members/${req.params.memberId}#certifications`);
    }
  }
});

// Grant admin-only achievement
router.post('/certifications/:memberId/:achievementId/grant', requireAdmin, async (req, res) => {
  try {
    await Achievement.grantAdminAchievement(req.params.memberId, req.params.achievementId, req.session.user.id, req.body.notes || '');
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      res.json({ success: true });
    } else {
      res.redirect(`/admin/members/${req.params.memberId}#certifications`);
    }
  } catch (error) {
    console.error('Verify achievement error:', error);
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      res.status(500).json({ success: false, error: error.message });
    } else {
      res.redirect(`/admin/members/${req.params.memberId}#certifications`);
    }
  }
});

// Revoke admin-only achievement
router.post('/certifications/:memberId/:achievementId/revoke', requireAdmin, async (req, res) => {
  try {
    await Achievement.revokeAdminAchievement(req.params.memberId, req.params.achievementId);
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      res.json({ success: true });
    } else {
      res.redirect(`/admin/members/${req.params.memberId}#certifications`);
    }
  } catch (error) {
    console.error('Revoke achievement error:', error);
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      res.status(500).json({ success: false, error: error.message });
    } else {
      res.redirect(`/admin/members/${req.params.memberId}#certifications`);
    }
  }
});

// Reports
router.get('/reports', requireAdmin, (req, res) => {
  res.render('admin/reports');
});

// Event report
router.get('/reports/event/:id', requireAdmin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.render('error', { message: 'Event not found' });
    }

    const attendees = await Event.getAttendees(req.params.id);
    
    res.render('admin/event-report', { event, attendees });
  } catch (error) {
    console.error('Event report error:', error);
    res.render('error', { message: 'Error generating report' });
  }
});

// Member progress report
router.get('/reports/member-progress', requireAdmin, async (req, res) => {
  try {
    const members = await Member.getAll();
    const tiers = await Tier.getAll();
    
    const memberProgress = [];
    for (const member of members) {
      const progress = await Member.getWithProgress(member.id);
      memberProgress.push(progress);
    }

    res.render('admin/member-progress-report', { members: memberProgress, tiers });
  } catch (error) {
    console.error('Member progress report error:', error);
    res.render('error', { message: 'Error generating report' });
  }
});

// Member location map report
router.get('/reports/member-map', requireAdmin, async (req, res) => {
  try {
    const db = require('../database/config');
    const members = await db.all(`
      SELECT m.id, m.first_name, m.last_name, m.callsign, m.address, m.city, m.state, m.zip, m.county, m.phone, m.latitude, m.longitude, u.email
      FROM members m
      JOIN users u ON m.user_id = u.id
      WHERE m.status = 'active' AND m.address IS NOT NULL AND m.address != ''
      ORDER BY m.last_name, m.first_name
    `);
    
    res.render('admin/member-map-report', { members });
  } catch (error) {
    console.error('Member map report error:', error);
    res.render('error', { message: 'Error generating map report' });
  }
});

// Cache geocoded coordinates for a member
router.post('/members/:id/geocode', requireAdmin, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const memberId = req.params.id;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Missing coordinates' });
    }
    
    await Member.update(memberId, { latitude, longitude });
    res.json({ success: true });
  } catch (error) {
    console.error('Error caching coordinates:', error);
    res.status(500).json({ error: 'Failed to cache coordinates' });
  }
});

// Capabilities report
router.get('/reports/capabilities', requireAdmin, async (req, res) => {
  try {
    const members = await Member.getAll();
    
    // Calculate capability statistics
    const stats = {
      // Radio Equipment
      hfCapable: members.filter(m => m.hf_capable).length,
      vhfUhfCapable: members.filter(m => m.vhf_uhf_capable).length,
      mobileStation: members.filter(m => m.mobile_station).length,
      portableStation: members.filter(m => m.portable_station).length,
      
      // Digital Modes
      winlinkCapable: members.filter(m => m.winlink_capable).length,
      aprsCapable: members.filter(m => m.aprs_capable).length,
      packetRadio: members.filter(m => m.packet_radio).length,
      ft8Capable: members.filter(m => m.ft8_capable).length,
      js8callCapable: members.filter(m => m.js8call_capable).length,
      rttyCapable: members.filter(m => m.rtty_capable).length,
      sstvCapable: members.filter(m => m.sstv_capable).length,
      
      // Digital Voice
      dstarCapable: members.filter(m => m.dstar_capable).length,
      dmrCapable: members.filter(m => m.dmr_capable).length,
      fusionCapable: members.filter(m => m.fusion_capable).length,
      
      // Power & Infrastructure
      emergencyPower: members.filter(m => m.emergency_power).length,
      backupBatteries: members.filter(m => m.backup_batteries).length,
      solarPower: members.filter(m => m.solar_power).length,
      satelliteInternet: members.filter(m => m.satellite_internet).length,
      meshNetwork: members.filter(m => m.mesh_network).length,
      
      // Training & Certifications
      aresRacesTrained: members.filter(m => m.ares_races_trained).length,
      skywarnTrained: members.filter(m => m.skywarn_trained).length,
      incidentCommandTrained: members.filter(m => m.incident_command_trained).length,
      cprFirstAidCertified: members.filter(m => m.cpr_first_aid_certified).length,
      
      // Emergency Readiness
      goKitReady: members.filter(m => m.go_kit_ready).length,
      
      // Totals
      totalMembers: members.length,
      activeMembers: members.filter(m => m.status === 'active').length
    };

    // Get members with specific capabilities for detailed views
    const capabilityDetails = {
      hfOperators: members.filter(m => m.hf_capable).map(m => ({
        name: `${m.first_name} ${m.last_name}`,
        callsign: m.callsign,
        power: m.hf_power
      })),
      winlinkOperators: members.filter(m => m.winlink_capable).map(m => ({
        name: `${m.first_name} ${m.last_name}`,
        callsign: m.callsign
      })),
      emergencyPowerSources: members.filter(m => m.emergency_power).map(m => ({
        name: `${m.first_name} ${m.last_name}`,
        callsign: m.callsign,
        type: m.emergency_power_type
      })),
      trainedPersonnel: members.filter(m => m.ares_races_trained || m.skywarn_trained || m.incident_command_trained).map(m => ({
        name: `${m.first_name} ${m.last_name}`,
        callsign: m.callsign,
        ares: m.ares_races_trained,
        skywarn: m.skywarn_trained,
        ics: m.incident_command_trained
      }))
    };

    res.render('admin/capabilities-report', { stats, capabilityDetails });
  } catch (error) {
    console.error('Capabilities report error:', error);
    res.render('error', { message: 'Error generating capabilities report' });
  }
});

// Certifications report
router.get('/reports/certifications', requireAdmin, async (req, res) => {
  try {
    const db = require('../database/config');
    const Achievement = require('../models/Achievement');
    
    // Get all certifications with member counts
    const certifications = await db.all(`
      SELECT 
        sa.id,
        sa.name,
        sa.description,
        sa.requires_proof,
        sa.admin_only,
        COUNT(DISTINCT CASE WHEN msa.verified = 1 THEN msa.member_id END) as verified_count,
        COUNT(DISTINCT CASE WHEN msa.verified = 0 THEN msa.member_id END) as pending_count
      FROM special_achievements sa
      LEFT JOIN member_special_achievements msa ON sa.id = msa.achievement_id
      GROUP BY sa.id, sa.name, sa.description, sa.requires_proof, sa.admin_only
      ORDER BY sa.name
    `);

    // Get detailed member information for each certification
    const certificationDetails = [];
    for (const cert of certifications) {
      const members = await db.all(`
        SELECT 
          m.id,
          m.first_name,
          m.last_name,
          m.callsign,
          msa.verified,
          msa.verified_at,
          msa.granted_at,
          m2.callsign as verified_by_callsign,
          m3.callsign as granted_by_callsign
        FROM member_special_achievements msa
        JOIN members m ON msa.member_id = m.id
        LEFT JOIN members m2 ON msa.verified_by = m2.user_id
        LEFT JOIN members m3 ON msa.granted_by = m3.user_id
        WHERE msa.achievement_id = ?
        ORDER BY msa.verified DESC, msa.verified_at DESC, m.last_name, m.first_name
      `, [cert.id]);

      certificationDetails.push({
        ...cert,
        members
      });
    }

    // Calculate summary stats
    const stats = {
      totalCertifications: certifications.length,
      totalVerified: certifications.reduce((sum, c) => sum + c.verified_count, 0),
      totalPending: certifications.reduce((sum, c) => sum + c.pending_count, 0),
      adminOnlyCerts: certifications.filter(c => c.admin_only).length
    };

    res.render('admin/certifications-report', { certifications: certificationDetails, stats });
  } catch (error) {
    console.error('Certifications report error:', error);
    res.render('error', { message: 'Error generating certifications report' });
  }
});

// Background check report
router.get('/reports/background-checks', requireAdmin, async (req, res) => {
  try {
    const db = require('../database/config');
    
    // Get all members with background check information
    const members = await db.all(`
      SELECT 
        m.id,
        m.first_name,
        m.last_name,
        m.callsign,
        m.status,
        m.background_check,
        m.background_check_date,
        u.email
      FROM members m
      JOIN users u ON m.user_id = u.id
      ORDER BY 
        CASE m.background_check
          WHEN 'Not Started' THEN 1
          WHEN 'In Progress' THEN 2
          WHEN 'Pending Review' THEN 3
          WHEN 'Completed' THEN 4
          WHEN 'Failed' THEN 5
          ELSE 6
        END,
        m.background_check_date DESC,
        m.last_name,
        m.first_name
    `);

    // Calculate statistics
    const stats = {
      total: members.length,
      notStarted: members.filter(m => m.background_check === 'Not Started').length,
      inProgress: members.filter(m => m.background_check === 'In Progress').length,
      pendingReview: members.filter(m => m.background_check === 'Pending Review').length,
      completed: members.filter(m => m.background_check === 'Completed').length,
      failed: members.filter(m => m.background_check === 'Failed').length,
      activeMembers: members.filter(m => m.status === 'active').length,
      completedActive: members.filter(m => m.background_check === 'Completed' && m.status === 'active').length
    };

    // Group members by status
    const groupedMembers = {
      notStarted: members.filter(m => m.background_check === 'Not Started'),
      inProgress: members.filter(m => m.background_check === 'In Progress'),
      pendingReview: members.filter(m => m.background_check === 'Pending Review'),
      completed: members.filter(m => m.background_check === 'Completed'),
      failed: members.filter(m => m.background_check === 'Failed')
    };

    res.render('admin/background-check-report', { members, stats, groupedMembers });
  } catch (error) {
    console.error('Background check report error:', error);
    res.render('error', { message: 'Error generating background check report' });
  }
});

// Event attendance report
router.get('/reports/event-attendance', requireAdmin, async (req, res) => {
  try {
    const db = require('../database/config');
    const months = parseInt(req.query.months) || 3;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    
    // Get events within the date range
    const events = await db.all(`
      SELECT 
        e.id,
        e.name,
        e.description,
        e.location,
        e.event_date,
        e.minimum_tier_id,
        t.name as minimum_tier_name,
        COUNT(DISTINCT CASE WHEN r.status = 'attending' THEN r.member_id END) as attendee_count
      FROM events e
      LEFT JOIN tiers t ON e.minimum_tier_id = t.id
      LEFT JOIN event_rsvps r ON e.id = r.event_id
      WHERE e.event_date >= ? AND e.event_date <= ?
      GROUP BY e.id, e.name, e.description, e.location, e.event_date, e.minimum_tier_id, t.name
      ORDER BY e.event_date DESC
    `, [startDate.toISOString(), endDate.toISOString()]);

    // Get detailed attendance for each event
    const eventsWithAttendance = [];
    for (const event of events) {
      const attendees = await db.all(`
        SELECT 
          m.id,
          m.first_name,
          m.last_name,
          m.callsign,
          r.status,
          r.created_at as rsvp_date
        FROM event_rsvps r
        JOIN members m ON r.member_id = m.id
        WHERE r.event_id = ? AND r.status = 'attending'
        ORDER BY m.last_name, m.first_name
      `, [event.id]);

      eventsWithAttendance.push({
        ...event,
        attendees
      });
    }

    // Calculate statistics
    const stats = {
      totalEvents: events.length,
      totalAttendance: events.reduce((sum, e) => sum + e.attendee_count, 0),
      averageAttendance: events.length > 0 ? (events.reduce((sum, e) => sum + e.attendee_count, 0) / events.length).toFixed(1) : 0,
      upcomingEvents: events.filter(e => new Date(e.event_date) > new Date()).length,
      pastEvents: events.filter(e => new Date(e.event_date) <= new Date()).length
    };

    res.render('admin/event-attendance-report', { events: eventsWithAttendance, stats, months });
  } catch (error) {
    console.error('Event attendance report error:', error);
    res.render('error', { message: 'Error generating event attendance report' });
  }
});

// Settings page
router.get('/settings', requireAdmin, async (req, res) => {
  try {
    const smtpConfig = await Setting.getSmtpConfig();
    res.render('admin/settings', { smtpConfig, success: req.query.success, error: req.query.error });
  } catch (error) {
    console.error('Settings page error:', error);
    res.render('error', { message: 'Error loading settings' });
  }
});

// Update SMTP settings
router.post('/settings/smtp',
  requireAdmin,
  [
    body('smtp_host').trim().notEmpty().withMessage('SMTP host is required'),
    body('smtp_port').isInt({ min: 1, max: 65535 }).withMessage('Valid port number required'),
    body('smtp_user').trim().optional(),
    body('smtp_pass').optional(),
    body('smtp_from').trim().isEmail().withMessage('Valid from email address required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect('/admin/settings?error=' + encodeURIComponent(errors.array()[0].msg));
    }

    try {
      const config = {
        host: req.body.smtp_host,
        port: parseInt(req.body.smtp_port),
        secure: req.body.smtp_secure === 'true',
        user: req.body.smtp_user,
        pass: req.body.smtp_pass,
        from: req.body.smtp_from
      };

      await Setting.setSmtpConfig(config);
      res.redirect('/admin/settings?success=' + encodeURIComponent('SMTP settings saved successfully'));
    } catch (error) {
      console.error('Error saving SMTP settings:', error);
      res.redirect('/admin/settings?error=' + encodeURIComponent('Failed to save settings'));
    }
  }
);

// Test SMTP connection
router.post('/settings/smtp/test', requireAdmin, async (req, res) => {
  try {
    const result = await testSmtpConnection();
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;
