const db = require('../database/config');

class Achievement {
  static async create(name, description, requiresProof = true, adminOnly = false) {
    const result = await db.run(
      'INSERT INTO special_achievements (name, description, requires_proof, admin_only) VALUES (?, ?, ?, ?)',
      [name, description, requiresProof ? 1 : 0, adminOnly ? 1 : 0]
    );
    return result.lastID;
  }

  static async findById(id) {
    return await db.get('SELECT * FROM special_achievements WHERE id = ?', [id]);
  }

  static async getAll() {
    return await db.all('SELECT * FROM special_achievements ORDER BY name');
  }

  static async update(id, name, description, requiresProof, adminOnly) {
    await db.run(
      'UPDATE special_achievements SET name = ?, description = ?, requires_proof = ?, admin_only = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, description, requiresProof ? 1 : 0, adminOnly ? 1 : 0, id]
    );
  }

  static async delete(id) {
    await db.run('DELETE FROM special_achievements WHERE id = ?', [id]);
  }

  static async submitForMember(memberId, achievementId, proofFilePath = null, notes = '') {
    const existing = await db.get(
      'SELECT id FROM member_special_achievements WHERE member_id = ? AND achievement_id = ?',
      [memberId, achievementId]
    );

    if (existing) {
      await db.run(
        `UPDATE member_special_achievements SET 
          proof_file_path = COALESCE(?, proof_file_path),
          notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [proofFilePath, notes, existing.id]
      );
    } else {
      await db.run(
        'INSERT INTO member_special_achievements (member_id, achievement_id, proof_file_path, notes) VALUES (?, ?, ?, ?)',
        [memberId, achievementId, proofFilePath, notes]
      );
    }
  }

  static async verify(memberId, achievementId, verifiedBy, notes = '') {
    const existing = await db.get(
      'SELECT id FROM member_special_achievements WHERE member_id = ? AND achievement_id = ?',
      [parseInt(memberId), parseInt(achievementId)]
    );

    console.log('Verify called:', { memberId, achievementId, verifiedBy, existing });

    if (existing) {
      await db.run(
        `UPDATE member_special_achievements SET 
          verified = 1,
          verified_by = ?,
          verified_at = CURRENT_TIMESTAMP,
          granted_by = ?,
          granted_at = CURRENT_TIMESTAMP,
          notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [verifiedBy, verifiedBy, notes, existing.id]
      );
      console.log('Updated certification:', existing.id);
    } else {
      console.log('No existing certification found to verify');
    }
  }

  static async grantAdminAchievement(memberId, achievementId, grantedBy, notes = '') {
    const existing = await db.get(
      'SELECT id FROM member_special_achievements WHERE member_id = ? AND achievement_id = ?',
      [memberId, achievementId]
    );

    if (existing) {
      await db.run(
        `UPDATE member_special_achievements SET 
          verified = 1,
          verified_by = ?,
          verified_at = CURRENT_TIMESTAMP,
          granted_by = ?,
          granted_at = CURRENT_TIMESTAMP,
          notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [grantedBy, grantedBy, notes, existing.id]
      );
    } else {
      await db.run(
        `INSERT INTO member_special_achievements 
        (member_id, achievement_id, verified, verified_by, verified_at, granted_by, granted_at, notes) 
        VALUES (?, ?, 1, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, ?)`,
        [memberId, achievementId, grantedBy, grantedBy, notes]
      );
    }
  }

  static async revokeAdminAchievement(memberId, achievementId) {
    await db.run(
      'DELETE FROM member_special_achievements WHERE member_id = ? AND achievement_id = ?',
      [memberId, achievementId]
    );
  }

  static async getMemberAchievements(memberId) {
    return await db.all(`
      SELECT 
        sa.id, sa.name, sa.description, sa.requires_proof, sa.admin_only,
        msa.verified, msa.verified_at, msa.proof_file_path, msa.notes,
        msa.granted_by, msa.granted_at,
        u.email as verified_by_email,
        u2.email as granted_by_email
      FROM special_achievements sa
      LEFT JOIN member_special_achievements msa 
        ON sa.id = msa.achievement_id AND msa.member_id = ?
      LEFT JOIN users u ON msa.verified_by = u.id
      LEFT JOIN users u2 ON msa.granted_by = u2.id
      ORDER BY sa.name
    `, [memberId]);
  }

  static async getPendingVerifications() {
    return await db.all(`
      SELECT 
        msa.id, msa.proof_file_path, msa.notes, msa.created_at,
        sa.name as achievement_name, sa.description as achievement_description,
        m.first_name, m.last_name, m.callsign, m.id as member_id
      FROM member_special_achievements msa
      JOIN special_achievements sa ON msa.achievement_id = sa.id
      JOIN members m ON msa.member_id = m.id
      WHERE msa.verified = 0
      ORDER BY msa.created_at ASC
    `);
  }
}

module.exports = Achievement;
