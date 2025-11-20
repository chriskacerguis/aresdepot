const db = require('../database/config');

class Tier {
  static async create(name, description, sortOrder) {
    const result = await db.run(
      'INSERT INTO tiers (name, description, sort_order) VALUES (?, ?, ?)',
      [name, description, sortOrder]
    );
    return result.lastID;
  }

  static async findById(id) {
    return await db.get('SELECT * FROM tiers WHERE id = ?', [id]);
  }

  static async getAll() {
    return await db.all('SELECT * FROM tiers ORDER BY sort_order');
  }

  static async update(id, name, description, sortOrder) {
    await db.run(
      'UPDATE tiers SET name = ?, description = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, description, sortOrder, id]
    );
  }

  static async delete(id) {
    await db.run('DELETE FROM tiers WHERE id = ?', [id]);
  }

  static async getWithTasks(tierId) {
    const tier = await this.findById(tierId);
    if (!tier) return null;

    const tasks = await db.all(
      'SELECT * FROM tasks WHERE tier_id = ? ORDER BY sort_order',
      [tierId]
    );

    return { ...tier, tasks };
  }

  static async checkMemberAchievement(memberId, tierId) {
    // Get all tasks for this tier
    const tasks = await db.all('SELECT id FROM tasks WHERE tier_id = ?', [tierId]);
    
    if (tasks.length === 0) return false;

    // Check if all tasks are verified
    const verified = await db.all(
      `SELECT task_id FROM member_tasks 
       WHERE member_id = ? AND task_id IN (${tasks.map(() => '?').join(',')}) AND verified = 1`,
      [memberId, ...tasks.map(t => t.id)]
    );

    const allComplete = verified.length === tasks.length;

    // Update achievement status
    if (allComplete) {
      const existing = await db.get(
        'SELECT id, achieved FROM member_tiers WHERE member_id = ? AND tier_id = ?',
        [memberId, tierId]
      );

      if (existing && !existing.achieved) {
        await db.run(
          'UPDATE member_tiers SET achieved = 1, achieved_at = CURRENT_TIMESTAMP WHERE id = ?',
          [existing.id]
        );
      } else if (!existing) {
        await db.run(
          'INSERT INTO member_tiers (member_id, tier_id, achieved, achieved_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP)',
          [memberId, tierId]
        );
      }
    }

    return allComplete;
  }
}

module.exports = Tier;
