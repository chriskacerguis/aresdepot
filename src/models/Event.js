const db = require('../database/config');

class Event {
  static async create(eventData) {
    const { name, description, location, eventDate, minimumTierId, maxAttendees, createdBy } = eventData;

    const result = await db.run(
      `INSERT INTO events (name, description, location, event_date, minimum_tier_id, max_attendees, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description, location, eventDate, minimumTierId, maxAttendees, createdBy]
    );
    return result.lastID;
  }

  static async findById(id) {
    return await db.get(`
      SELECT e.*, t.name as minimum_tier_name, t.sort_order as tier_order, u.email as created_by_email
      FROM events e
      LEFT JOIN tiers t ON e.minimum_tier_id = t.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = ?
    `, [id]);
  }

  static async getAll() {
    return await db.all(`
      SELECT e.*, t.name as minimum_tier_name,
        (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id AND status = 'attending') as attendee_count
      FROM events e
      LEFT JOIN tiers t ON e.minimum_tier_id = t.id
      ORDER BY e.event_date DESC
    `);
  }

  static async getUpcoming() {
    return await db.all(`
      SELECT e.*, t.name as minimum_tier_name, t.sort_order as tier_order,
        (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id AND status = 'attending') as attendee_count
      FROM events e
      LEFT JOIN tiers t ON e.minimum_tier_id = t.id
      WHERE e.event_date >= datetime('now')
      ORDER BY e.event_date ASC
    `);
  }

  static async update(id, eventData) {
    const { name, description, location, eventDate, minimumTierId, maxAttendees } = eventData;

    await db.run(
      `UPDATE events SET 
        name = ?, description = ?, location = ?, event_date = ?, 
        minimum_tier_id = ?, max_attendees = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [name, description, location, eventDate, minimumTierId, maxAttendees, id]
    );
  }

  static async delete(id) {
    await db.run('DELETE FROM events WHERE id = ?', [id]);
  }

  static async addRSVP(eventId, memberId, notes = '') {
    const existing = await db.get(
      'SELECT id FROM event_rsvps WHERE event_id = ? AND member_id = ?',
      [eventId, memberId]
    );

    if (existing) {
      await db.run(
        'UPDATE event_rsvps SET status = \'attending\', notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [notes, existing.id]
      );
    } else {
      await db.run(
        'INSERT INTO event_rsvps (event_id, member_id, status, notes) VALUES (?, ?, \'attending\', ?)',
        [eventId, memberId, notes]
      );
    }
  }

  static async removeRSVP(eventId, memberId) {
    await db.run(
      'UPDATE event_rsvps SET status = \'cancelled\', updated_at = CURRENT_TIMESTAMP WHERE event_id = ? AND member_id = ?',
      [eventId, memberId]
    );
  }

  static async getAttendees(eventId) {
    return await db.all(`
      SELECT 
        m.id, m.first_name, m.last_name, m.callsign, m.phone, u.email as member_email,
        m.address, m.city, m.state, m.zip, m.county,
        r.notes, r.created_at as rsvp_date
      FROM event_rsvps r
      JOIN members m ON r.member_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE r.event_id = ? AND r.status = 'attending'
      ORDER BY m.last_name, m.first_name
    `, [eventId]);
  }

  static async canMemberAttend(memberId, eventId) {
    const event = await this.findById(eventId);
    if (!event || !event.minimum_tier_id) return true;

    const Member = require('./Member');
    const currentTier = await Member.getCurrentTier(memberId);
    
    if (!currentTier) return false;
    
    return currentTier.sort_order >= event.tier_order;
  }

  static async getMemberRSVPStatus(eventId, memberId) {
    return await db.get(
      'SELECT * FROM event_rsvps WHERE event_id = ? AND member_id = ?',
      [eventId, memberId]
    );
  }

  static async getByMonth(year, month) {
    // month is 1-12
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = month === 12 
      ? `${year + 1}-01-01` 
      : `${year}-${String(month + 1).padStart(2, '0')}-01`;

    return await db.all(`
      SELECT e.*, t.name as minimum_tier_name, t.sort_order as tier_order,
        (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id AND status = 'attending') as attendee_count
      FROM events e
      LEFT JOIN tiers t ON e.minimum_tier_id = t.id
      WHERE date(e.event_date) >= date(?) AND date(e.event_date) < date(?)
      ORDER BY e.event_date ASC
    `, [startDate, endDate]);
  }
}

module.exports = Event;
