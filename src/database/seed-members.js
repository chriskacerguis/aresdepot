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
        license_class: 'Extra',
        status: 'active',
        background_check: 'Passed',
        background_check_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
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
        go_kit_ready: 1,
        tower_antenna_height: 40,
        backup_batteries: 1,
        firstnet_device: 1,
        capabilities_notes: 'Fully equipped base station with backup power. Available for emergency deployment.',
        admin_notes: 'Excellent operator with strong leadership skills. Recommended for EC position. Has completed all ICS training and has 10+ years of ARES experience.'
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
        license_class: 'General',
        status: 'active',
        background_check: 'Pending',
        background_check_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        // Capabilities
        vhf_uhf_capable: 1,
        vhf_uhf_power: 25,
        aprs_capable: 1,
        dmr_capable: 1,
        mobile_station: 1,
        portable_station: 1,
        satellite_internet: 1,
        skywarn_trained: 1,
        cpr_first_aid_certified: 1,
        go_kit_ready: 1,
        firstnet_device: 1,
        capabilities_notes: 'Mobile operations specialist. Starlink internet backup.',
        admin_notes: 'Background check pending - submitted 7 days ago. Follow up with county office next week.'
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
        license_class: 'Extra',
        status: 'active',
        background_check: 'Passed',
        background_check_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
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
        go_kit_ready: 1,
        capabilities_notes: 'HF digital modes expert. Large solar installation with battery backup.',
        admin_notes: 'Top digital modes operator in the county. Frequently assists with EmComm training. Consider for technical committee.'
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
        license_class: 'General',
        status: 'active',
        background_check: 'Not Started',
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
        license_class: 'General',
        status: 'active',
        background_check: 'Passed',
        background_check_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
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
        license_class: 'Technician',
        status: 'inactive',
        background_check: 'Failed',
        background_check_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
        // Capabilities
        vhf_uhf_capable: 1,
        vhf_uhf_power: 5,
        mobile_station: 1,
        capabilities_notes: 'Handheld radio only. Interested in getting more involved.',
        admin_notes: 'Background check failed - DUI on record. Status changed to inactive per policy. Eligible for reapplication in 2 years.'
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
        license_class: 'Extra',
        status: 'active',
        background_check: 'Passed',
        background_check_date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(), // 120 days ago
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
        emergency_power_type: 'Generator',
        backup_batteries: 1,
        tower_antenna_height: 35,
        go_kit_ready: 1,
        capabilities_notes: 'ICS-100, ICS-200, ICS-700, ICS-800 certified. Active ARES member.',
        admin_notes: 'Very reliable during activations. Served as IC during last 3 events. Has medical background (paramedic).'
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
        license_class: 'Technician',
        status: 'active',
        background_check: 'Pending',
        background_check_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
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
        skywarn_trained: 1,
        cpr_first_aid_certified: 1,
        go_kit_ready: 1,
        capabilities_notes: 'All digital voice modes. Red Cross volunteer.'
      },
      {
        email: 'ryan.mitchell@example.com',
        password: 'Password123!',
        first_name: 'Ryan',
        last_name: 'Mitchell',
        callsign: 'KI9VWX',
        phone: '555-0109',
        address: '369 Cedar Ln',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        county: 'Sangamon',
        license_class: 'Technician',
        status: 'active',
        background_check: 'Passed',
        background_check_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        vhf_uhf_capable: 1,
        vhf_uhf_power: 25,
        mobile_station: 1,
        aprs_capable: 1
      },
      {
        email: 'jennifer.martinez@example.com',
        password: 'Password123!',
        first_name: 'Jennifer',
        last_name: 'Martinez',
        callsign: 'KJ0YZA',
        phone: '555-0110',
        address: '741 Birch Ave',
        city: 'Rockford',
        state: 'IL',
        zip: '61101',
        county: 'Winnebago',
        license_class: 'General',
        status: 'active',
        background_check: 'Passed',
        background_check_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        hf_capable: 1,
        hf_power: 100,
        vhf_uhf_capable: 1,
        vhf_uhf_power: 50,
        winlink_capable: 1,
        portable_station: 1,
        emergency_power: 1,
        emergency_power_type: 'Portable'
      },
      {
        email: 'william.garcia@example.com',
        password: 'Password123!',
        first_name: 'William',
        last_name: 'Garcia',
        callsign: 'KL1BCD',
        phone: '555-0111',
        address: '852 Spruce St',
        city: 'Decatur',
        state: 'IL',
        zip: '62521',
        county: 'Macon',
        license_class: 'Extra',
        status: 'active',
        background_check: 'Pending',
        background_check_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        hf_capable: 1,
        hf_power: 200,
        vhf_uhf_capable: 1,
        vhf_uhf_power: 100,
        ft8_capable: 1,
        js8call_capable: 1,
        mobile_station: 1,
        portable_station: 1,
        tower_antenna_height: 80
      },
      {
        email: 'patricia.rodriguez@example.com',
        password: 'Password123!',
        first_name: 'Patricia',
        last_name: 'Rodriguez',
        callsign: 'KM2EFG',
        phone: '555-0112',
        address: '963 Walnut Dr',
        city: 'Aurora',
        state: 'IL',
        zip: '60505',
        county: 'Kane',
        license_class: 'Technician',
        status: 'active',
        background_check: 'Not Started',
        vhf_uhf_capable: 1,
        vhf_uhf_power: 35,
        dmr_capable: 1,
        mobile_station: 1
      },
      {
        email: 'charles.lee@example.com',
        password: 'Password123!',
        first_name: 'Charles',
        last_name: 'Lee',
        callsign: 'KN3HIJ',
        phone: '555-0113',
        address: '147 Chestnut Blvd',
        city: 'Naperville',
        state: 'IL',
        zip: '60540',
        county: 'DuPage',
        license_class: 'General',
        status: 'active',
        background_check: 'Passed',
        background_check_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        hf_capable: 1,
        hf_power: 100,
        vhf_uhf_capable: 1,
        vhf_uhf_power: 50,
        winlink_capable: 1,
        aprs_capable: 1,
        fusion_capable: 1,
        satellite_internet: 1,
        emergency_power: 1,
        emergency_power_type: 'Whole Home',
        backup_batteries: 1,
        go_kit_ready: 1
      },
      {
        email: 'barbara.walker@example.com',
        password: 'Password123!',
        first_name: 'Barbara',
        last_name: 'Walker',
        callsign: 'KO4KLM',
        phone: '555-0114',
        address: '258 Poplar Ct',
        city: 'Joliet',
        state: 'IL',
        zip: '60435',
        county: 'Will',
        license_class: 'Technician',
        status: 'inactive',
        background_check: 'Passed',
        background_check_date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        vhf_uhf_capable: 1,
        vhf_uhf_power: 25
      },
      {
        email: 'thomas.hall@example.com',
        password: 'Password123!',
        first_name: 'Thomas',
        last_name: 'Hall',
        callsign: 'KP5NOP',
        phone: '555-0115',
        address: '369 Hickory Rd',
        city: 'Elgin',
        state: 'IL',
        zip: '60120',
        county: 'Kane',
        license_class: 'Extra',
        status: 'active',
        background_check: 'Passed',
        background_check_date: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
        hf_capable: 1,
        hf_power: 150,
        vhf_uhf_capable: 1,
        vhf_uhf_power: 75,
        winlink_capable: 1,
        ft8_capable: 1,
        rtty_capable: 1,
        dstar_capable: 1,
        mobile_station: 1,
        portable_station: 1,
        tower_antenna_height: 65,
        solar_power: 1,
        backup_batteries: 1
      },
      {
        email: 'susan.allen@example.com',
        password: 'Password123!',
        first_name: 'Susan',
        last_name: 'Allen',
        callsign: 'KQ6RST',
        phone: '555-0116',
        address: '741 Ash St',
        city: 'Waukegan',
        state: 'IL',
        zip: '60085',
        county: 'Lake',
        license_class: 'General',
        status: 'active',
        background_check: 'Pending',
        background_check_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        hf_capable: 1,
        hf_power: 100,
        vhf_uhf_capable: 1,
        vhf_uhf_power: 50,
        aprs_capable: 1,
        packet_radio: 1,
        mobile_station: 1
      },
      {
        email: 'daniel.young@example.com',
        password: 'Password123!',
        first_name: 'Daniel',
        last_name: 'Young',
        callsign: 'KR7UVW',
        phone: '555-0117',
        address: '852 Beech Ln',
        city: 'Cicero',
        state: 'IL',
        zip: '60804',
        county: 'Cook',
        license_class: 'Technician',
        status: 'active',
        background_check: 'Not Started',
        vhf_uhf_capable: 1,
        vhf_uhf_power: 30,
        dmr_capable: 1,
        fusion_capable: 1,
        portable_station: 1
      },
      {
        email: 'karen.king@example.com',
        password: 'Password123!',
        first_name: 'Karen',
        last_name: 'King',
        callsign: 'KS8XYZ',
        phone: '555-0118',
        address: '963 Sycamore Ave',
        city: 'Schaumburg',
        state: 'IL',
        zip: '60193',
        county: 'Cook',
        license_class: 'General',
        status: 'active',
        background_check: 'Passed',
        background_check_date: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
        hf_capable: 1,
        hf_power: 100,
        vhf_uhf_capable: 1,
        vhf_uhf_power: 50,
        winlink_capable: 1,
        ft8_capable: 1,
        mobile_station: 1,
        portable_station: 1,
        emergency_power: 1,
        emergency_power_type: 'Portable',
        go_kit_ready: 1
      },
      {
        email: 'paul.wright@example.com',
        password: 'Password123!',
        first_name: 'Paul',
        last_name: 'Wright',
        callsign: 'KT9ABC',
        phone: '555-0119',
        address: '147 Dogwood Dr',
        city: 'Evanston',
        state: 'IL',
        zip: '60201',
        county: 'Cook',
        license_class: 'Extra',
        status: 'active',
        background_check: 'Passed',
        background_check_date: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
        hf_capable: 1,
        hf_power: 200,
        vhf_uhf_capable: 1,
        vhf_uhf_power: 100,
        winlink_capable: 1,
        ft8_capable: 1,
        js8call_capable: 1,
        rtty_capable: 1,
        sstv_capable: 1,
        dstar_capable: 1,
        dmr_capable: 1,
        mobile_station: 1,
        portable_station: 1,
        tower_antenna_height: 90,
        emergency_power: 1,
        emergency_power_type: 'Whole Home',
        solar_power: 1,
        backup_batteries: 1,
        mesh_network: 1,
        go_kit_ready: 1,
        capabilities_notes: 'Advanced HF and digital modes operator. Emergency communications coordinator.'
      },
      {
        email: 'nancy.lopez@example.com',
        password: 'Password123!',
        first_name: 'Nancy',
        last_name: 'Lopez',
        callsign: 'KU0DEF',
        phone: '555-0120',
        address: '258 Redwood Blvd',
        city: 'Oak Park',
        state: 'IL',
        zip: '60302',
        county: 'Cook',
        license_class: 'Technician',
        status: 'active',
        background_check: 'Passed',
        background_check_date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        vhf_uhf_capable: 1,
        vhf_uhf_power: 25,
        aprs_capable: 1,
        mobile_station: 1
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
        'license_class', 'status', 'background_check', 'background_check_date', 'emergency_power', 'emergency_power_type', 'hf_capable', 'hf_power',
        'vhf_uhf_capable', 'vhf_uhf_power', 'winlink_capable', 'satellite_internet',
        'mobile_station', 'portable_station', 'aprs_capable',
        'dstar_capable', 'dmr_capable', 'fusion_capable', 'packet_radio', 'sstv_capable',
        'rtty_capable', 'ft8_capable', 'js8call_capable',
        'go_kit_ready', 'tower_antenna_height', 'backup_batteries', 'solar_power',
        'mesh_network', 'firstnet_device', 'capabilities_notes'
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
    
    for (const [index, member] of memberRecords.entries()) {
      let numTasksToComplete;
      let tasksToComplete;
      
      // Ensure first 5 members have tier achievements
      if (index < 5) {
        // Member 0: Complete all Level 1 tasks (achieve Level 1)
        // Member 1: Complete all Level 1 and Level 2 tasks (achieve Level 2)
        // Member 2: Complete all tasks (achieve Level 3)
        // Member 3: Complete all Level 1 tasks
        // Member 4: Complete some Level 1 tasks (no tier yet)
        const tier1Tasks = allTasks.filter(t => t.tier_id === tiers[0].id);
        const tier2Tasks = allTasks.filter(t => t.tier_id === tiers[1].id);
        const tier3Tasks = allTasks.filter(t => t.tier_id === tiers[2].id);
        
        if (index === 0) {
          tasksToComplete = [...tier1Tasks];
        } else if (index === 1) {
          tasksToComplete = [...tier1Tasks, ...tier2Tasks];
        } else if (index === 2) {
          tasksToComplete = [...tier1Tasks, ...tier2Tasks, ...tier3Tasks];
        } else if (index === 3) {
          tasksToComplete = [...tier1Tasks];
        } else {
          tasksToComplete = tier1Tasks.slice(0, Math.floor(tier1Tasks.length / 2));
        }
      } else {
        // Random number of completed tasks for remaining members (0-8 out of total tasks)
        numTasksToComplete = Math.floor(Math.random() * 9);
        tasksToComplete = allTasks
          .sort(() => Math.random() - 0.5)
          .slice(0, numTasksToComplete);
      }

      for (const task of tasksToComplete) {
        // Ensure first 4 members have all tasks verified for guaranteed tier achievements
        const isVerified = (index < 4) ? true : (Math.random() > 0.3); // First 4 members: 100% verified, others: 70% chance
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

      console.log(`✅ Assigned ${tasksToComplete.length} tasks to member ID ${member.id}`);
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
