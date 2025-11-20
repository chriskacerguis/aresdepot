const db = require('../database/config');
const bcrypt = require('bcryptjs');

class User {
  static async create(email, password, isAdmin = false) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO users (email, password, is_admin) VALUES (?, ?, ?)',
      [email, hashedPassword, isAdmin ? 1 : 0]
    );
    return result.lastID;
  }

  static async findByEmail(email) {
    return await db.get('SELECT * FROM users WHERE email = ?', [email]);
  }

  static async findById(id) {
    return await db.get('SELECT * FROM users WHERE id = ?', [id]);
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.run(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, userId]
    );
  }

  static async setResetToken(userId, token, expiresAt) {
    await db.run(
      'UPDATE users SET reset_token = ?, reset_token_expires = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [token, expiresAt.toISOString(), userId]
    );
  }

  static async findByResetToken(token) {
    return await db.get('SELECT * FROM users WHERE reset_token = ?', [token]);
  }

  static async clearResetToken(userId) {
    await db.run(
      'UPDATE users SET reset_token = NULL, reset_token_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );
  }

  static async getAllMembers() {
    return await db.all(`
      SELECT u.*, m.first_name, m.last_name, m.callsign, m.county
      FROM users u
      LEFT JOIN members m ON u.id = m.user_id
      WHERE u.is_admin = 0
      ORDER BY m.last_name, m.first_name
    `);
  }

  static async toggleAdmin(userId) {
    const user = await db.get('SELECT is_admin FROM users WHERE id = ?', [userId]);
    const newAdminStatus = user.is_admin ? 0 : 1;
    await db.run(
      'UPDATE users SET is_admin = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newAdminStatus, userId]
    );
    return newAdminStatus;
  }
}

module.exports = User;
