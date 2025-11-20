const db = require('../database/config');

class Document {
  static async create(data) {
    const result = await db.run(
      `INSERT INTO documents (title, description, file_path, file_name, file_size, mime_type, tier_id, uploaded_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.title, data.description, data.filePath, data.fileName, data.fileSize, data.mimeType, data.tierId || null, data.uploadedBy]
    );
    return result.lastID;
  }

  static async findById(id) {
    return await db.get(
      `SELECT d.*, 
              t.name as tier_name,
              u.email as uploaded_by_email,
              m.callsign as uploaded_by_callsign,
              m.first_name || ' ' || m.last_name as uploaded_by_name
       FROM documents d
       LEFT JOIN tiers t ON d.tier_id = t.id
       LEFT JOIN users u ON d.uploaded_by = u.id
       LEFT JOIN members m ON u.id = m.user_id
       WHERE d.id = ?`,
      [id]
    );
  }

  static async getAll() {
    return await db.all(
      `SELECT d.*, 
              t.name as tier_name,
              u.email as uploaded_by_email,
              m.callsign as uploaded_by_callsign,
              m.first_name || ' ' || m.last_name as uploaded_by_name
       FROM documents d
       LEFT JOIN tiers t ON d.tier_id = t.id
       LEFT JOIN users u ON d.uploaded_by = u.id
       LEFT JOIN members m ON u.id = m.user_id
       ORDER BY d.created_at DESC`
    );
  }

  static async getAccessibleByMember(memberId) {
    // Get member's achieved tiers
    const achievedTiers = await db.all(
      `SELECT t.tier_id 
       FROM member_tasks mt
       JOIN tasks t ON mt.task_id = t.id
       WHERE mt.member_id = ? AND mt.completed = 1
       GROUP BY t.tier_id 
       HAVING COUNT(*) = (SELECT COUNT(*) FROM tasks WHERE tier_id = t.tier_id)`,
      [memberId]
    );
    
    const tierIds = achievedTiers.map(t => t.tier_id);
    
    // Get documents with no tier requirement OR matching achieved tiers
    if (tierIds.length === 0) {
      return await db.all(
        `SELECT d.*, 
                t.name as tier_name,
                m.callsign as uploaded_by_callsign,
                m.first_name || ' ' || m.last_name as uploaded_by_name
         FROM documents d
         LEFT JOIN tiers t ON d.tier_id = t.id
         LEFT JOIN users u ON d.uploaded_by = u.id
         LEFT JOIN members m ON u.id = m.user_id
         WHERE d.tier_id IS NULL
         ORDER BY d.created_at DESC`
      );
    }
    
    return await db.all(
      `SELECT d.*, 
              t.name as tier_name,
              m.callsign as uploaded_by_callsign,
              m.first_name || ' ' || m.last_name as uploaded_by_name
       FROM documents d
       LEFT JOIN tiers t ON d.tier_id = t.id
       LEFT JOIN users u ON d.uploaded_by = u.id
       LEFT JOIN members m ON u.id = m.user_id
       WHERE d.tier_id IS NULL OR d.tier_id IN (${tierIds.map(() => '?').join(',')})
       ORDER BY d.created_at DESC`,
      tierIds
    );
  }

  static async update(id, data) {
    await db.run(
      `UPDATE documents 
       SET title = ?, description = ?, tier_id = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [data.title, data.description, data.tierId || null, id]
    );
  }

  static async delete(id) {
    await db.run('DELETE FROM documents WHERE id = ?', [id]);
  }

  static async canMemberAccess(memberId, documentId) {
    const document = await this.findById(documentId);
    if (!document) return false;
    
    // No tier requirement - accessible to all
    if (!document.tier_id) return true;
    
    // Check if member has achieved the required tier
    const tierAchieved = await db.get(
      `SELECT COUNT(*) as total, 
              (SELECT COUNT(*) FROM tasks WHERE tier_id = ?) as required
       FROM member_tasks mt
       JOIN tasks t ON mt.task_id = t.id
       WHERE mt.member_id = ? AND t.tier_id = ? AND mt.completed = 1`,
      [document.tier_id, memberId, document.tier_id]
    );
    
    return tierAchieved && tierAchieved.total === tierAchieved.required;
  }
}

module.exports = Document;
