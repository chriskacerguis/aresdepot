const db = require('../database/config');

class Passkey {
  static async create(userId, credentialId, publicKey, counter = 0, deviceName = null, transports = null) {
    const result = await db.run(
      `INSERT INTO passkeys (user_id, credential_id, credential_public_key, counter, device_name, transports) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, credentialId, publicKey, counter, deviceName, transports ? JSON.stringify(transports) : null]
    );
    return result.lastID;
  }

  static async findByCredentialId(credentialId) {
    const passkey = await db.get(
      'SELECT * FROM passkeys WHERE credential_id = ?',
      [credentialId]
    );
    if (passkey && passkey.transports) {
      passkey.transports = JSON.parse(passkey.transports);
    }
    return passkey;
  }

  static async findByUserId(userId) {
    const passkeys = await db.all(
      'SELECT * FROM passkeys WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return passkeys.map(pk => {
      if (pk.transports) {
        pk.transports = JSON.parse(pk.transports);
      }
      return pk;
    });
  }

  static async updateCounter(credentialId, newCounter) {
    await db.run(
      'UPDATE passkeys SET counter = ?, last_used_at = CURRENT_TIMESTAMP WHERE credential_id = ?',
      [newCounter, credentialId]
    );
  }

  static async delete(id, userId) {
    await db.run(
      'DELETE FROM passkeys WHERE id = ? AND user_id = ?',
      [id, userId]
    );
  }

  static async setChallenge(userId, challenge) {
    await db.run(
      'UPDATE users SET current_challenge = ? WHERE id = ?',
      [challenge, userId]
    );
  }

  static async getChallenge(userId) {
    const user = await db.get(
      'SELECT current_challenge FROM users WHERE id = ?',
      [userId]
    );
    return user ? user.current_challenge : null;
  }

  static async clearChallenge(userId) {
    await db.run(
      'UPDATE users SET current_challenge = NULL WHERE id = ?',
      [userId]
    );
  }
}

module.exports = Passkey;
