const db = require('../database/config');

class Task {
  static async create(tierId, name, description, sortOrder) {
    const result = await db.run(
      'INSERT INTO tasks (tier_id, name, description, sort_order) VALUES (?, ?, ?, ?)',
      [tierId, name, description, sortOrder]
    );
    return result.lastID;
  }

  static async findById(id) {
    return await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
  }

  static async getByTier(tierId) {
    return await db.all(
      'SELECT * FROM tasks WHERE tier_id = ? ORDER BY sort_order',
      [tierId]
    );
  }

  static async update(id, name, description, sortOrder) {
    await db.run(
      'UPDATE tasks SET name = ?, description = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, description, sortOrder, id]
    );
  }

  static async delete(id) {
    await db.run('DELETE FROM tasks WHERE id = ?', [id]);
  }

  static async getMemberTaskStatus(memberId, taskId) {
    return await db.get(
      'SELECT * FROM member_tasks WHERE member_id = ? AND task_id = ?',
      [memberId, taskId]
    );
  }

  static async markCompleted(memberId, taskId, notes = '') {
    const existing = await this.getMemberTaskStatus(memberId, taskId);

    if (existing) {
      await db.run(
        'UPDATE member_tasks SET completed = 1, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [notes, existing.id]
      );
    } else {
      await db.run(
        'INSERT INTO member_tasks (member_id, task_id, completed, notes) VALUES (?, ?, 1, ?)',
        [memberId, taskId, notes]
      );
    }
  }

  static async verifyTask(memberId, taskId, verifiedBy, notes = '') {
    const existing = await this.getMemberTaskStatus(memberId, taskId);

    if (existing) {
      await db.run(
        `UPDATE member_tasks SET 
          verified = 1, 
          verified_by = ?, 
          verified_at = CURRENT_TIMESTAMP,
          notes = ?,
          updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?`,
        [verifiedBy, notes, existing.id]
      );
    } else {
      await db.run(
        `INSERT INTO member_tasks (member_id, task_id, completed, verified, verified_by, verified_at, notes) 
         VALUES (?, ?, 1, 1, ?, CURRENT_TIMESTAMP, ?)`,
        [memberId, taskId, verifiedBy, notes]
      );
    }

    // Check if tier is now achieved
    const task = await this.findById(taskId);
    if (task) {
      const Tier = require('./Tier');
      await Tier.checkMemberAchievement(memberId, task.tier_id);
    }
  }

  static async getMemberTasks(memberId) {
    return await db.all(`
      SELECT 
        t.id, t.tier_id, t.name, t.description, t.sort_order,
        tier.name as tier_name,
        mt.completed, mt.verified, mt.verified_at, mt.notes,
        u.email as verified_by_email
      FROM tasks t
      JOIN tiers tier ON t.tier_id = tier.id
      LEFT JOIN member_tasks mt ON t.id = mt.task_id AND mt.member_id = ?
      LEFT JOIN users u ON mt.verified_by = u.id
      ORDER BY tier.sort_order, t.sort_order
    `, [memberId]);
  }
}

module.exports = Task;
