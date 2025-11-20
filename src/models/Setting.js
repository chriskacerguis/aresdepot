const db = require('../database/config');

class Setting {
  static async get(key, defaultValue = null) {
    const setting = await db.get('SELECT value FROM settings WHERE key = ?', [key]);
    return setting ? setting.value : defaultValue;
  }

  static async set(key, value) {
    const existing = await db.get('SELECT id FROM settings WHERE key = ?', [key]);
    
    if (existing) {
      await db.run(
        'UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
        [value, key]
      );
    } else {
      await db.run(
        'INSERT INTO settings (key, value) VALUES (?, ?)',
        [key, value]
      );
    }
  }

  static async getAll() {
    const settings = await db.all('SELECT key, value FROM settings');
    const result = {};
    settings.forEach(setting => {
      result[setting.key] = setting.value;
    });
    return result;
  }

  static async getSmtpConfig() {
    return {
      host: await this.get('smtp_host', process.env.SMTP_HOST || 'smtp.gmail.com'),
      port: parseInt(await this.get('smtp_port', process.env.SMTP_PORT || '587')),
      secure: (await this.get('smtp_secure', process.env.SMTP_SECURE || 'false')) === 'true',
      user: await this.get('smtp_user', process.env.SMTP_USER || ''),
      pass: await this.get('smtp_pass', process.env.SMTP_PASS || ''),
      from: await this.get('smtp_from', process.env.SMTP_FROM || 'noreply@aresdepot.org')
    };
  }

  static async setSmtpConfig(config) {
    await this.set('smtp_host', config.host);
    await this.set('smtp_port', config.port.toString());
    await this.set('smtp_secure', config.secure ? 'true' : 'false');
    await this.set('smtp_user', config.user);
    if (config.pass) {
      await this.set('smtp_pass', config.pass);
    }
    await this.set('smtp_from', config.from);
  }
}

module.exports = Setting;
