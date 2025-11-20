const db = require('./config');
const fs = require('fs');
const path = require('path');

const migrations = [
  // Migration 1: Create users table
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    reset_token TEXT,
    reset_token_expires DATETIME,
    calendar_token TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Migration 2: Create members table
  `CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    phone TEXT,
    callsign TEXT UNIQUE NOT NULL,
    county TEXT,
    latitude REAL,
    longitude REAL,
    fcc_license_path TEXT,
    profile_photo_path TEXT,
    license_class TEXT,
    title TEXT DEFAULT 'Member',
    status TEXT DEFAULT 'active',
    background_check TEXT DEFAULT 'Not Started',
    background_check_date DATETIME,
    emergency_contact_name TEXT,
    emergency_contact_relationship TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_email TEXT,
    emergency_power INTEGER DEFAULT 0,
    emergency_power_type TEXT,
    hf_capable INTEGER DEFAULT 0,
    hf_power INTEGER,
    vhf_uhf_capable INTEGER DEFAULT 0,
    vhf_uhf_power INTEGER,
    winlink_capable INTEGER DEFAULT 0,
    satellite_internet INTEGER DEFAULT 0,
    mobile_station INTEGER DEFAULT 0,
    portable_station INTEGER DEFAULT 0,
    aprs_capable INTEGER DEFAULT 0,
    dstar_capable INTEGER DEFAULT 0,
    dmr_capable INTEGER DEFAULT 0,
    fusion_capable INTEGER DEFAULT 0,
    packet_radio INTEGER DEFAULT 0,
    sstv_capable INTEGER DEFAULT 0,
    rtty_capable INTEGER DEFAULT 0,
    ft8_capable INTEGER DEFAULT 0,
    js8call_capable INTEGER DEFAULT 0,
    go_kit_ready INTEGER DEFAULT 0,
    tower_antenna_height INTEGER,
    backup_batteries INTEGER DEFAULT 0,
    solar_power INTEGER DEFAULT 0,
    mesh_network INTEGER DEFAULT 0,
    firstnet_device INTEGER DEFAULT 0,
    capabilities_notes TEXT,
    admin_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  // Migration 3: Create tiers table
  `CREATE TABLE IF NOT EXISTS tiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Migration 4: Create tasks table
  `CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tier_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tier_id) REFERENCES tiers(id) ON DELETE CASCADE
  )`,

  // Migration 5: Create member_tasks table (tracking completion)
  `CREATE TABLE IF NOT EXISTS member_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    completed INTEGER DEFAULT 0,
    verified INTEGER DEFAULT 0,
    verified_by INTEGER,
    verified_at DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id),
    UNIQUE(member_id, task_id)
  )`,

  // Migration 6: Create member_tiers table (tracking tier achievement)
  `CREATE TABLE IF NOT EXISTS member_tiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    tier_id INTEGER NOT NULL,
    achieved INTEGER DEFAULT 0,
    achieved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (tier_id) REFERENCES tiers(id) ON DELETE CASCADE,
    UNIQUE(member_id, tier_id)
  )`,

  // Migration 7: Create special_achievements table
  `CREATE TABLE IF NOT EXISTS special_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    requires_proof INTEGER DEFAULT 1,
    admin_only INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Migration 8: Create member_special_achievements table
  `CREATE TABLE IF NOT EXISTS member_special_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    achievement_id INTEGER NOT NULL,
    proof_file_path TEXT,
    verified INTEGER DEFAULT 0,
    verified_by INTEGER,
    verified_at DATETIME,
    granted_by INTEGER,
    granted_at DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES special_achievements(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id),
    FOREIGN KEY (granted_by) REFERENCES users(id),
    UNIQUE(member_id, achievement_id)
  )`,

  // Migration 9: Create events table
  `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    event_date DATETIME NOT NULL,
    minimum_tier_id INTEGER,
    max_attendees INTEGER,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (minimum_tier_id) REFERENCES tiers(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`,

  // Migration 10: Create event_rsvps table
  `CREATE TABLE IF NOT EXISTS event_rsvps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    status TEXT DEFAULT 'attending',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    UNIQUE(event_id, member_id)
  )`,

  // Migration 11: Create indexes
  `CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_members_callsign ON members(callsign)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_tier_id ON tasks(tier_id)`,
  `CREATE INDEX IF NOT EXISTS idx_member_tasks_member_id ON member_tasks(member_id)`,
  `CREATE INDEX IF NOT EXISTS idx_member_tasks_task_id ON member_tasks(task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id ON event_rsvps(event_id)`,
  `CREATE INDEX IF NOT EXISTS idx_event_rsvps_member_id ON event_rsvps(member_id)`,

  // Migration 12: Create settings table
  `CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Migration 13: Create passkeys table
  `CREATE TABLE IF NOT EXISTS passkeys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    credential_id TEXT UNIQUE NOT NULL,
    credential_public_key TEXT NOT NULL,
    counter INTEGER DEFAULT 0,
    device_name TEXT,
    transports TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  // Migration 14: Add challenge column to users table for WebAuthn
  `ALTER TABLE users ADD COLUMN current_challenge TEXT`,

  // Migration 15: Create documents table
  `CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    tier_id INTEGER,
    uploaded_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tier_id) REFERENCES tiers(id) ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
  )`,

  // Migration 16: Create document index
  `CREATE INDEX IF NOT EXISTS idx_documents_tier_id ON documents(tier_id)`,

  // Migration 17: Add ID card fields to members
  `ALTER TABLE members ADD COLUMN has_id_card INTEGER DEFAULT 0`,
  `ALTER TABLE members ADD COLUMN id_card_expiry_date DATE`,
  `ALTER TABLE members ADD COLUMN id_card_issued_by TEXT`,
  `ALTER TABLE members ADD COLUMN id_card_issued_date DATE`
];

async function runMigrations() {
  try {
    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      fs.mkdirSync(path.join(uploadsDir, 'licenses'), { recursive: true });
      fs.mkdirSync(path.join(uploadsDir, 'proofs'), { recursive: true });
      fs.mkdirSync(path.join(uploadsDir, 'documents'), { recursive: true });
    }

    console.log('🔄 Running database migrations...');
    
    for (let i = 0; i < migrations.length; i++) {
      await db.run(migrations[i]);
      console.log(`✅ Migration ${i + 1}/${migrations.length} completed`);
    }
    
    console.log('✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations().then(() => {
    console.log('Database setup complete!');
    process.exit(0);
  });
}

module.exports = runMigrations;
