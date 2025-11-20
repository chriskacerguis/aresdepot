const db = require('../database/config');

class Member {
  static async create(memberData) {
    const { 
      userId, firstName, lastName, address, city, state, zip,
      phone, callsign, county, fccLicensePath 
    } = memberData;

    const result = await db.run(
      `INSERT INTO members (
        user_id, first_name, last_name, address, city, state, zip,
        phone, callsign, county, fcc_license_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, firstName, lastName, address, city, state, zip, phone, callsign, county, fccLicensePath]
    );
    return result.lastID;
  }

  static async findByUserId(userId) {
    return await db.get('SELECT * FROM members WHERE user_id = ?', [userId]);
  }

  static async findById(id) {
    return await db.get(`
      SELECT m.*, u.email 
      FROM members m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `, [id]);
  }

  static async findByCallsign(callsign) {
    return await db.get('SELECT * FROM members WHERE callsign = ?', [callsign]);
  }

  static async update(memberId, memberData) {
    const { 
      firstName, lastName, address, city, state, zip,
      phone, callsign, county, fccLicensePath, status
    } = memberData;

    const fields = [];
    const values = [];

    if (firstName !== undefined) {
      fields.push('first_name = ?');
      values.push(firstName);
    }
    if (lastName !== undefined) {
      fields.push('last_name = ?');
      values.push(lastName);
    }
    if (address !== undefined) {
      fields.push('address = ?');
      values.push(address);
    }
    if (city !== undefined) {
      fields.push('city = ?');
      values.push(city);
    }
    if (state !== undefined) {
      fields.push('state = ?');
      values.push(state);
    }
    if (zip !== undefined) {
      fields.push('zip = ?');
      values.push(zip);
    }
    if (phone !== undefined) {
      fields.push('phone = ?');
      values.push(phone);
    }
    if (callsign !== undefined) {
      fields.push('callsign = ?');
      values.push(callsign);
    }
    if (county !== undefined) {
      fields.push('county = ?');
      values.push(county);
    }
    if (fccLicensePath !== undefined) {
      fields.push('fcc_license_path = ?');
      values.push(fccLicensePath);
    }
    if (status !== undefined) {
      fields.push('status = ?');
      values.push(status);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(memberId);

    await db.run(
      `UPDATE members SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  static async getAll() {
    return await db.all(`
      SELECT m.*, u.email
      FROM members m
      JOIN users u ON m.user_id = u.id
      ORDER BY m.last_name, m.first_name
    `);
  }

  static async getDirectory() {
    return await db.all(`
      SELECT 
        m.id, m.first_name, m.last_name, m.callsign, m.county, 
        m.phone, m.city, m.state
      FROM members m
      ORDER BY m.last_name, m.first_name
    `);
  }

  static async getWithProgress(memberId) {
    const member = await this.findById(memberId);
    if (!member) return null;

    // Get tier progress
    const tiers = await db.all(`
      SELECT 
        t.id, t.name, t.description, t.sort_order,
        mt.achieved, mt.achieved_at,
        COUNT(tasks.id) as total_tasks,
        COUNT(CASE WHEN member_tasks.verified = 1 THEN 1 END) as completed_tasks
      FROM tiers t
      LEFT JOIN tasks ON t.id = tasks.tier_id
      LEFT JOIN member_tasks ON tasks.id = member_tasks.task_id AND member_tasks.member_id = ?
      LEFT JOIN member_tiers mt ON t.id = mt.tier_id AND mt.member_id = ?
      GROUP BY t.id
      ORDER BY t.sort_order
    `, [memberId, memberId]);

    // Get special achievements
    const achievements = await db.all(`
      SELECT 
        sa.id, sa.name, sa.description,
        msa.verified, msa.verified_at, msa.proof_file_path
      FROM special_achievements sa
      LEFT JOIN member_special_achievements msa 
        ON sa.id = msa.achievement_id AND msa.member_id = ?
    `, [memberId]);

    return {
      ...member,
      tiers,
      achievements
    };
  }

  static async getCurrentTier(memberId) {
    return await db.get(`
      SELECT t.*
      FROM tiers t
      JOIN member_tiers mt ON t.id = mt.tier_id
      WHERE mt.member_id = ? AND mt.achieved = 1
      ORDER BY t.sort_order DESC
      LIMIT 1
    `, [memberId]);
  }
}

module.exports = Member;
