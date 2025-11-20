const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Event = require('../models/Event');
const Member = require('../models/Member');
const User = require('../models/User');

// Calendar view
router.get('/calendar', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();
    const month = req.query.month ? parseInt(req.query.month) : now.getMonth() + 1;

    const events = await Event.getByMonth(year, month);
    const member = await Member.findByUserId(req.session.user.id);

    // Get or create calendar token
    const calendarToken = await User.getOrCreateCalendarToken(req.session.user.id);

    // Get RSVP status for each event
    const eventsWithRSVP = await Promise.all(events.map(async (event) => {
      let canAttend = false;
      let rsvpStatus = null;
      
      if (member) {
        canAttend = await Event.canMemberAttend(member.id, event.id);
        rsvpStatus = await Event.getMemberRSVPStatus(event.id, member.id);
      }
      
      return {
        ...event,
        canAttend,
        rsvpStatus
      };
    }));

    res.render('events/calendar', { 
      events: eventsWithRSVP,
      currentYear: year,
      currentMonth: month,
      today: now,
      calendarToken,
      req
    });
  } catch (error) {
    console.error('Calendar error:', error);
    res.render('error', { message: 'Error loading calendar' });
  }
});

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

// ICS Calendar Feed (no auth required, token-based)
router.get('/feed/:token.ics', async (req, res) => {
  try {
    const user = await User.findByCalendarToken(req.params.token);
    
    // Validate token and user status
    if (!user || !user.member_id || user.member_status !== 'active') {
      return res.status(404).send('Calendar feed not found');
    }

    // Get all future events that the member can attend
    const db = require('../database/config');
    const events = await db.all(`
      SELECT e.*
      FROM events e
      LEFT JOIN tiers t ON e.minimum_tier_id = t.id
      WHERE e.event_date >= datetime('now')
      AND (
        e.minimum_tier_id IS NULL
        OR e.minimum_tier_id IN (
          SELECT mt.tier_id
          FROM member_tiers mt
          WHERE mt.member_id = ? AND mt.achieved = 1
        )
      )
      ORDER BY e.event_date ASC
    `, [user.member_id]);

    // Generate ICS content
    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ARES Depot//Event Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:ARES Events',
      'X-WR-TIMEZONE:America/Chicago',
      'X-WR-CALDESC:ARES Depot Event Calendar'
    ];

    events.forEach(event => {
      const eventDate = new Date(event.event_date);
      const dtstart = formatICSDate(eventDate);
      const dtend = formatICSDate(new Date(eventDate.getTime() + 2 * 60 * 60 * 1000)); // +2 hours
      const dtstamp = formatICSDate(new Date());
      const uid = `event-${event.id}@aresdepot.local`;
      
      icsLines.push('BEGIN:VEVENT');
      icsLines.push(`UID:${uid}`);
      icsLines.push(`DTSTAMP:${dtstamp}`);
      icsLines.push(`DTSTART:${dtstart}`);
      icsLines.push(`DTEND:${dtend}`);
      icsLines.push(`SUMMARY:${escapeICSText(event.name)}`);
      
      if (event.description) {
        icsLines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
      }
      
      if (event.location) {
        icsLines.push(`LOCATION:${escapeICSText(event.location)}`);
      }
      
      icsLines.push('STATUS:CONFIRMED');
      icsLines.push('END:VEVENT');
    });

    icsLines.push('END:VCALENDAR');

    // Set appropriate headers for ICS file
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="ares-events.ics"');
    res.send(icsLines.join('\r\n'));

  } catch (error) {
    console.error('ICS feed error:', error);
    res.status(500).send('Error generating calendar feed');
  }
});

// Helper function to format date for ICS (YYYYMMDDTHHmmssZ)
function formatICSDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

// Helper function to escape special characters in ICS text
function escapeICSText(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

module.exports = router;
