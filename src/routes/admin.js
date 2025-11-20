const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Member = require('../models/Member');
const Tier = require('../models/Tier');
const Task = require('../models/Task');
const Event = require('../models/Event');
const Achievement = require('../models/Achievement');

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
    const members = await Member.getAll();
    res.render('admin/members', { members });
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
    res.render('admin/member-details', { member, tasks });
  } catch (error) {
    console.error('Member details error:', error);
    res.render('error', { message: 'Error loading member details' });
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
router.get('/achievements', requireAdmin, async (req, res) => {
  try {
    const achievements = await Achievement.getAll();
    const pending = await Achievement.getPendingVerifications();
    res.render('admin/achievements', { achievements, pending, errors: [], formData: {} });
  } catch (error) {
    console.error('Achievements error:', error);
    res.render('error', { message: 'Error loading achievements' });
  }
});

// Create special achievement
router.post('/achievements/create',
  requireAdmin,
  [body('name').trim().notEmpty()],
  async (req, res) => {
    const errors = require('express-validator').validationResult(req);
    
    if (!errors.isEmpty()) {
      const achievements = await Achievement.getAll();
      const pending = await Achievement.getPendingVerifications();
      return res.render('admin/achievements', {
        achievements,
        pending,
        errors: errors.array(),
        formData: req.body
      });
    }

    try {
      await Achievement.create(
        req.body.name,
        req.body.description || '',
        req.body.requiresProof === 'true'
      );
      res.redirect('/admin/achievements');
    } catch (error) {
      console.error('Create achievement error:', error);
      const achievements = await Achievement.getAll();
      const pending = await Achievement.getPendingVerifications();
      res.render('admin/achievements', {
        achievements,
        pending,
        errors: [{ msg: 'Error creating achievement' }],
        formData: req.body
      });
    }
  }
);

// Verify achievement
router.post('/achievements/:memberId/:achievementId/verify', requireAdmin, async (req, res) => {
  try {
    await Achievement.verify(req.params.memberId, req.params.achievementId, req.session.user.id, req.body.notes || '');
    res.redirect('/admin/achievements');
  } catch (error) {
    console.error('Verify achievement error:', error);
    res.redirect('/admin/achievements');
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

module.exports = router;
