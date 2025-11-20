const db = require('./config');
const bcrypt = require('bcryptjs');
const { geocodeAddress } = require('../utils/geocode');
require('dotenv').config();

async function seed() {
  try {
    console.log('🌱 Seeding database...');

    // Create admin user
    const adminCallsign = process.env.ADMIN_CALLSIGN || 'ADMIN001';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const existingAdmin = await db.get('SELECT id FROM users WHERE email = ?', [adminCallsign + '@admin.local']);
    
    if (!existingAdmin) {
      const userId = await db.run(
        'INSERT INTO users (email, password, is_admin) VALUES (?, ?, 1)',
        [adminCallsign + '@admin.local', hashedPassword]
      );
      
      // Geocode admin address
      const coords = await geocodeAddress('301 W 2nd St', 'Austin', 'TX', '78701');
      const latitude = coords ? coords.lat : null;
      const longitude = coords ? coords.lon : null;
      
      // Create member record for admin
      await db.run(
        'INSERT INTO members (user_id, first_name, last_name, callsign, phone, address, city, state, zip, county, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [userId.lastID, 'Admin', 'User', adminCallsign, '512-555-0000', '301 W 2nd St', 'Austin', 'TX', '78701', 'Travis', latitude, longitude]
      );
      console.log('✅ Admin user created');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // Create sample tiers
    const tiers = [
      { name: 'Level 1 - Basic', description: 'Entry level ARES member', sort_order: 1 },
      { name: 'Level 2 - Intermediate', description: 'Intermediate ARES member with additional training', sort_order: 2 },
      { name: 'Level 3 - Advanced', description: 'Advanced ARES member with leadership capabilities', sort_order: 3 }
    ];

    for (const tier of tiers) {
      const existing = await db.get('SELECT id FROM tiers WHERE name = ?', [tier.name]);
      if (!existing) {
        await db.run(
          'INSERT INTO tiers (name, description, sort_order) VALUES (?, ?, ?)',
          [tier.name, tier.description, tier.sort_order]
        );
      }
    }
    console.log('✅ Sample tiers created');

    // Create sample tasks
    const tier1 = await db.get('SELECT id FROM tiers WHERE sort_order = 1');
    const tier2 = await db.get('SELECT id FROM tiers WHERE sort_order = 2');
    const tier3 = await db.get('SELECT id FROM tiers WHERE sort_order = 3');

    const tasks = [
      // Level 1 tasks
      { tier_id: tier1.id, name: 'Complete IS-100', description: 'Introduction to Incident Command System', sort_order: 1 },
      { tier_id: tier1.id, name: 'Complete IS-200', description: 'ICS for Single Resources', sort_order: 2 },
      { tier_id: tier1.id, name: 'Complete IS-700', description: 'National Incident Management System', sort_order: 3 },
      { tier_id: tier1.id, name: 'Complete IS-800', description: 'National Response Framework', sort_order: 4 },
      { tier_id: tier1.id, name: 'Attend Local Net', description: 'Participate in local ARES net check-in', sort_order: 5 },
      
      // Level 2 tasks
      { tier_id: tier2.id, name: 'Complete EC-001', description: 'Emergency Communications Course', sort_order: 1 },
      { tier_id: tier2.id, name: 'Complete EC-016', description: 'Public Service Communications', sort_order: 2 },
      { tier_id: tier2.id, name: 'Serve in Event', description: 'Participate in public service event', sort_order: 3 },
      { tier_id: tier2.id, name: 'Digital Mode Training', description: 'Complete training on digital communications', sort_order: 4 },
      
      // Level 3 tasks
      { tier_id: tier3.id, name: 'Complete IS-300', description: 'Intermediate ICS', sort_order: 1 },
      { tier_id: tier3.id, name: 'Complete IS-400', description: 'Advanced ICS', sort_order: 2 },
      { tier_id: tier3.id, name: 'Leadership Role', description: 'Serve in leadership role during event', sort_order: 3 },
      { tier_id: tier3.id, name: 'Mentor Member', description: 'Mentor a newer ARES member', sort_order: 4 }
    ];

    for (const task of tasks) {
      const existing = await db.get(
        'SELECT id FROM tasks WHERE tier_id = ? AND name = ?',
        [task.tier_id, task.name]
      );
      if (!existing) {
        await db.run(
          'INSERT INTO tasks (tier_id, name, description, sort_order) VALUES (?, ?, ?, ?)',
          [task.tier_id, task.name, task.description, task.sort_order]
        );
      }
    }
    console.log('✅ Sample tasks created');

    // Create sample special achievements
    const certifications = [
      { name: 'Skywarn Spotter', description: 'Completed NWS Skywarn Spotter training', requires_proof: 1, admin_only: 0 },
      { name: 'RACES', description: 'Is a RACES member', requires_proof: 1, admin_only: 0 },
      { name: 'Official Emergency Station', description: 'ARRL Official Emergency Station designation', requires_proof: 1, admin_only: 0 },
      { name: 'AUXCOMM', description: 'Completed AUXCOMM training', requires_proof: 1, admin_only: 0 },
      { name: 'COM/L', description: 'Completed COM/L training', requires_proof: 1, admin_only: 0 },
      { name: 'COM/T', description: 'Completed COM/T training', requires_proof: 1, admin_only: 0 },
      { name: 'NetControl Certified', description: 'Member can serve as netcontrol', requires_proof: 0, admin_only: 1 },
      { name: 'Field Deployable', description: 'Member is certified to be field deployable', requires_proof: 0, admin_only: 1 },
    ];

    for (const certification of certifications) {
      const existing = await db.get('SELECT id FROM special_achievements WHERE name = ?', [certification.name]);
      if (!existing) {
        await db.run(
          'INSERT INTO special_achievements (name, description, requires_proof, admin_only) VALUES (?, ?, ?, ?)',
          [certification.name, certification.description, certification.requires_proof, certification.admin_only]
        );
      }
    }
    console.log('✅ Sample special certifications created');

    console.log('✅ Seeding completed successfully!');
    console.log(`\n📻 Admin Callsign: ${adminCallsign}`);
    console.log(`🔑 Admin Password: ${adminPassword}`);
    console.log('\n⚠️  Please change the admin password after first login!\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seed().then(() => {
    console.log('Seeding complete!');
    process.exit(0);
  });
}

module.exports = seed;
