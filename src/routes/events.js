const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Event = require('../models/Event');
const Member = require('../models/Member');

// View event details
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.render('error', { message: 'Event not found' });
    }

    const member = await Member.findByUserId(req.session.user.id);
    let canAttend = false;
    let rsvpStatus = null;

    if (member) {
      canAttend = await Event.canMemberAttend(member.id, event.id);
      rsvpStatus = await Event.getMemberRSVPStatus(event.id, member.id);
    }

    const attendees = await Event.getAttendees(event.id);

    res.render('events/details', { 
      event, 
      canAttend,
      rsvpStatus,
      attendees: req.session.user.is_admin ? attendees : [],
      isAdmin: req.session.user.is_admin
    });
  } catch (error) {
    console.error('Event details error:', error);
    res.render('error', { message: 'Error loading event' });
  }
});

// RSVP to event
router.post('/:id/rsvp', requireAuth, async (req, res) => {
  try {
    const member = await Member.findByUserId(req.session.user.id);
    if (!member) {
      return res.redirect('/members/profile/edit');
    }

    const canAttend = await Event.canMemberAttend(member.id, req.params.id);
    if (!canAttend) {
      return res.render('error', { message: 'You do not meet the tier requirements for this event' });
    }

    await Event.addRSVP(req.params.id, member.id, req.body.notes || '');
    res.redirect(`/events/${req.params.id}`);
  } catch (error) {
    console.error('RSVP error:', error);
    res.redirect(`/events/${req.params.id}`);
  }
});

// Cancel RSVP
router.post('/:id/cancel-rsvp', requireAuth, async (req, res) => {
  try {
    const member = await Member.findByUserId(req.session.user.id);
    if (!member) {
      return res.redirect('/members/profile/edit');
    }

    await Event.removeRSVP(req.params.id, member.id);
    res.redirect(`/events/${req.params.id}`);
  } catch (error) {
    console.error('Cancel RSVP error:', error);
    res.redirect(`/events/${req.params.id}`);
  }
});

module.exports = router;
