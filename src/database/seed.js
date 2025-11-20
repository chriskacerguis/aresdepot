const db = require('./config');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
  try {
    console.log('🌱 Seeding database...');

    // Create admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const existingAdmin = await db.get('SELECT id FROM users WHERE email = ?', [adminEmail]);
    
    if (!existingAdmin) {
      await db.run(
        'INSERT INTO users (email, password, is_admin) VALUES (?, ?, 1)',
        [adminEmail, hashedPassword]
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
    const achievements = [
      { name: 'Skywarn Spotter', description: 'Completed NWS Skywarn Spotter training', requires_proof: 1 },
      { name: 'RACES', description: 'Is a RACES member', requires_proof: 1 },
      { name: 'Official Emergency Station', description: 'ARRL Official Emergency Station designation', requires_proof: 1 },
      { name: 'AUXCOMM', description: 'Completed AUXCOMM training', requires_proof: 1 },
      { name: 'COM/L', description: 'Completed COM/L training', requires_proof: 1 },
      { name: 'COM/T', description: 'Completed COM/T training', requires_proof: 1 },
    ];

    for (const achievement of achievements) {
      const existing = await db.get('SELECT id FROM special_achievements WHERE name = ?', [achievement.name]);
      if (!existing) {
        await db.run(
          'INSERT INTO special_achievements (name, description, requires_proof) VALUES (?, ?, ?)',
          [achievement.name, achievement.description, achievement.requires_proof]
        );
      }
    }
    console.log('✅ Sample special achievements created');

    console.log('✅ Seeding completed successfully!');
    console.log(`\n📧 Admin Email: ${adminEmail}`);
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
