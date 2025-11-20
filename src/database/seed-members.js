const db = require('./config');
const bcrypt = require('bcryptjs');

async function seedMembers() {
  try {
    console.log('🌱 Starting member data seeding...');

    // Check if members already exist
    const existingMembers = await db.all('SELECT id FROM members LIMIT 1');
    if (existingMembers.length > 0) {
      console.log('⚠️  Members already exist. Skipping member seeding.');
      console.log('   To reseed, delete data/ares.db and run migrations again.');
      return;
    }

    // Get the admin user
    const adminUser = await db.get('SELECT id FROM users WHERE is_admin = 1');
    if (!adminUser) {
      console.error('❌ Admin user not found. Please run seed.js first.');
      return;
    }

    // Get all tiers
    const tiers = await db.all('SELECT id, name FROM tiers ORDER BY sort_order');
    if (tiers.length === 0) {
      console.error('❌ No tiers found. Please run seed.js first.');
      return;
    }

    // Sample member data
    const members = [
      {
        email: 'john.smith@example.com',
        password: 'Password123!',
        first_name: 'John',
        last_name: 'Smith',
        callsign: 'KA1ABC',
        phone: '555-0101',
        address: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        county: 'Sangamon',
        status: 'active',
        // Capabilities
        emergency_power: 1,
        emergency_power_type: 'Generator (5kW)',
        hf_capable: 1,
        hf_power: 100,
        vhf_uhf_capable: 1,
        vhf_uhf_power: 50,
        winlink_capable: 1,
        aprs_capable: 1,
        ft8_capable: 1,
        mobile_station: 1,
        portable_station: 1,
        ares_races_trained: 1,
        skywarn_trained: 1,
        go_kit_ready: 1,
        tower_antenna_height: 40,
        backup_batteries: 1,
        capabilities_notes: 'Fully equipped base station with backup power. Available for emergency deployment.'
      },
      {
        email: 'sarah.johnson@example.com',
        password: 'Password123!',
        first_name: 'Sarah',
        last_name: 'Johnson',
        callsign: 'KB2XYZ',
        phone: '555-0102',
        address: '456 Oak Ave',
        city: 'Peoria',
        state: 'IL',
        zip: '61602',
        county: 'Peoria',
        status: 'active',
        // Capabilities
        vhf_uhf_capable: 1,
        vhf_uhf_power: 25,
        aprs_capable: 1,
        dmr_capable: 1,
        mobile_station: 1,
        portable_station: 1,
        satellite_internet: 1,
        satellite_internet_type: 'Starlink',
        skywarn_trained: 1,
        cpr_first_aid_certified: 1,
        go_kit_ready: 1,
        capabilities_notes: 'Mobile operations specialist. Starlink internet backup.'
      },
      {
        email: 'michael.brown@example.com',
        password: 'Password123!',
        first_name: 'Michael',
        last_name: 'Brown',
        callsign: 'KC3DEF',
        phone: '555-0103',
        address: '789 Elm St',
        city: 'Rockford',
        state: 'IL',
        zip: '61101',
        county: 'Winnebago',
        status: 'active',
        // Capabilities
        hf_capable: 1,
        hf_power: 1500,
        vhf_uhf_capable: 1,
        vhf_uhf_power: 100,
        winlink_capable: 1,
        ft8_capable: 1,
        js8call_capable: 1,
        rtty_capable: 1,
        dstar_capable: 1,
        emergency_power: 1,
        emergency_power_type: 'Solar + Battery Bank',
        solar_power: 1,
        backup_batteries: 1,
        tower_antenna_height: 60,
        ares_races_trained: 1,
        incident_command_trained: 1,
        go_kit_ready: 1,
        capabilities_notes: 'HF digital modes expert. Large solar installation with battery backup.'
      },
      {
        email: 'lisa.davis@example.com',
        password: 'Password123!',
        first_name: 'Lisa',
        last_name: 'Davis',
        callsign: 'KD4GHI',
        phone: '555-0104',
        address: '321 Pine Rd',
        city: 'Champaign',
        state: 'IL',
        zip: '61820',
        county: 'Champaign',
        status: 'active',
        // Capabilities
        vhf_uhf_capable: 1,
        vhf_uhf_power: 50,
        dmr_capable: 1,
        fusion_capable: 1,
        aprs_capable: 1,
        packet_radio: 1,
        mobile_station: 1,
        portable_station: 1,
        mesh_network: 1,
        skywarn_trained: 1,
        cpr_first_aid_certified: 1,
        go_kit_ready: 1,
        capabilities_notes: 'Digital voice modes and mesh networking. Active SKYWARN spotter.'
      },
      {
        email: 'robert.wilson@example.com',
        password: 'Password123!',
        first_name: 'Robert',
        last_name: 'Wilson',
        callsign: 'KE5JKL',
        phone: '555-0105',
        address: '654 Maple Dr',
        city: 'Decatur',
        state: 'IL',
        zip: '62521',
        county: 'Macon',
        status: 'active',
        // Capabilities
        hf_capable: 1,
        hf_power: 100,
        vhf_uhf_capable: 1,
        vhf_uhf_power: 50,
        winlink_capable: 1,
        sstv_capable: 1,
        portable_station: 1,
        emergency_power: 1,
        emergency_power_type: 'Generator',
        go_kit_ready: 1,
        capabilities_notes: 'Portable operations focus. SSTV enthusiast.'
      },
      {
        email: 'jennifer.taylor@example.com',
        password: 'Password123!',
        first_name: 'Jennifer',
        last_name: 'Taylor',
        callsign: 'KF6MNO',
        phone: '555-0106',
        address: '987 Cedar Ln',
        city: 'Bloomington',
        state: 'IL',
        zip: '61701',
        county: 'McLean',
        status: 'inactive',
        // Capabilities
        vhf_uhf_capable: 1,
        vhf_uhf_power: 5,
        mobile_station: 1,
        capabilities_notes: 'Handheld radio only. Interested in getting more involved.'
      },
      {
        email: 'david.anderson@example.com',
        password: 'Password123!',
        first_name: 'David',
        last_name: 'Anderson',
        callsign: 'KG7PQR',
        phone: '555-0107',
        address: '147 Birch Way',
        city: 'Aurora',
        state: 'IL',
        zip: '60502',
        county: 'Kane',
        status: 'active',
        // Capabilities
        hf_capable: 1,
        hf_power: 200,
        vhf_uhf_capable: 1,
        vhf_uhf_power: 65,
        ft8_capable: 1,
        js8call_capable: 1,
        winlink_capable: 1,
        aprs_capable: 1,
        mobile_station: 1,
        portable_station: 1,
        emergency_power: 1,
        emergency_power_type: 'Battery Bank',
        backup_batteries: 1,
        tower_antenna_height: 35,
        ares_races_trained: 1,
        incident_command_trained: 1,
        cpr_first_aid_certified: 1,
        go_kit_ready: 1,
        capabilities_notes: 'ICS-100, ICS-200, ICS-700, ICS-800 certified. Active ARES member.'
      },
      {
        email: 'mary.thomas@example.com',
        password: 'Password123!',
        first_name: 'Mary',
        last_name: 'Thomas',
        callsign: 'KH8STU',
        phone: '555-0108',
        address: '258 Willow Ct',
        city: 'Joliet',
        state: 'IL',
        zip: '60431',
        county: 'Will',
        status: 'active',
        // Capabilities
        vhf_uhf_capable: 1,
        vhf_uhf_power: 50,
        dstar_capable: 1,
        dmr_capable: 1,
        fusion_capable: 1,
        aprs_capable: 1,
        mobile_station: 1,
        portable_station: 1,
        satellite_internet: 1,
        satellite_internet_type: 'HughesNet',
        skywarn_trained: 1,
        cpr_first_aid_certified: 1,
        go_kit_ready: 1,
        capabilities_notes: 'All digital voice modes. Red Cross volunteer.'
      }
    ];

    // Create users and members
    for (const memberData of members) {
      const hashedPassword = await bcrypt.hash(memberData.password, 10);
      
      // Create user account
      const userResult = await db.run(
        `INSERT INTO users (email, password, is_admin) VALUES (?, ?, 0)`,
        [memberData.email, hashedPassword]
      );

      // Create member profile
      const capabilityFields = [
        'status', 'emergency_power', 'emergency_power_type', 'hf_capable', 'hf_power',
        'vhf_uhf_capable', 'vhf_uhf_power', 'winlink_capable', 'satellite_internet',
        'satellite_internet_type', 'mobile_station', 'portable_station', 'aprs_capable',
        'dstar_capable', 'dmr_capable', 'fusion_capable', 'packet_radio', 'sstv_capable',
        'rtty_capable', 'ft8_capable', 'js8call_capable', 'ares_races_trained',
        'skywarn_trained', 'incident_command_trained', 'cpr_first_aid_certified',
        'go_kit_ready', 'tower_antenna_height', 'backup_batteries', 'solar_power',
        'mesh_network', 'capabilities_notes'
      ];

      const fields = [
        'user_id', 'first_name', 'last_name', 'callsign', 'phone',
        'address', 'city', 'state', 'zip', 'county'
      ];
      const values = [
        userResult.lastID,
        memberData.first_name,
        memberData.last_name,
        memberData.callsign,
        memberData.phone,
        memberData.address,
        memberData.city,
        memberData.state,
        memberData.zip,
        memberData.county
      ];

      // Add capability fields that are present
      for (const field of capabilityFields) {
        if (memberData[field] !== undefined) {
          fields.push(field);
          values.push(memberData[field]);
        }
      }

      const placeholders = fields.map(() => '?').join(', ');
      await db.run(
        `INSERT INTO members (${fields.join(', ')}) VALUES (${placeholders})`,
        values
      );

      console.log(`✅ Created member: ${memberData.first_name} ${memberData.last_name} (${memberData.callsign})`);
    }

    // Get all tasks for assigning
    const allTasks = await db.all('SELECT id, tier_id FROM tasks ORDER BY tier_id, sort_order');

    // Assign random progress to members
    const memberRecords = await db.all('SELECT id FROM members');
    
    for (const member of memberRecords) {
      // Random number of completed tasks (0-8 out of total tasks)
      const numTasksToComplete = Math.floor(Math.random() * 9);
      const tasksToComplete = allTasks
        .sort(() => Math.random() - 0.5)
        .slice(0, numTasksToComplete);

      for (const task of tasksToComplete) {
        const isVerified = Math.random() > 0.3; // 70% chance of being verified
        const daysAgo = Math.floor(Math.random() * 30);
        
        await db.run(
          `INSERT INTO member_tasks (member_id, task_id, completed, verified, verified_at)
           VALUES (?, ?, 1, ?, ?)`,
          [
            member.id,
            task.id,
            isVerified ? 1 : 0,
            isVerified ? new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString() : null
          ]
        );
      }

      // Check and assign tier achievements
      for (const tier of tiers) {
        const tierTasks = allTasks.filter(t => t.tier_id === tier.id);
        const completedTierTasks = tasksToComplete.filter(t => t.tier_id === tier.id);
        const verifiedTierTasks = await db.all(
          `SELECT COUNT(*) as count FROM member_tasks 
           WHERE member_id = ? AND task_id IN (
             SELECT id FROM tasks WHERE tier_id = ?
           ) AND verified = 1`,
          [member.id, tier.id]
        );

        // If all tasks for this tier are verified, mark tier as achieved
        if (verifiedTierTasks[0].count === tierTasks.length && tierTasks.length > 0) {
          const daysAgo = Math.floor(Math.random() * 15);
          await db.run(
            `INSERT INTO member_tiers (member_id, tier_id, achieved, achieved_at)
             VALUES (?, ?, 1, ?)`,
            [member.id, tier.id, new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()]
          );
        }
      }

      console.log(`✅ Assigned ${numTasksToComplete} tasks to member ID ${member.id}`);
    }

    console.log('✅ Member data seeding completed successfully!');
    console.log(`   Created ${members.length} members with random progress`);
    
  } catch (error) {
    console.error('❌ Error seeding member data:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedMembers()
    .then(() => {
      console.log('✨ Member seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to seed members:', error);
      process.exit(1);
    });
}

module.exports = seedMembers;
