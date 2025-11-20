const db = require('./config');

async function seedEvents() {
  try {
    console.log('🌱 Starting event data seeding...');

    // Check if events already exist
    const existingEvents = await db.all('SELECT id FROM events LIMIT 1');
    if (existingEvents.length > 0) {
      console.log('⚠️  Events already exist. Skipping event seeding.');
      console.log('   To reseed, delete existing events first.');
      return;
    }

    // Get admin user for created_by
    const adminUser = await db.get('SELECT id FROM users WHERE is_admin = 1');
    if (!adminUser) {
      console.error('❌ Admin user not found. Please run seed.js first.');
      return;
    }

    // Get tiers for requirements
    const tiers = await db.all('SELECT id, name FROM tiers ORDER BY sort_order');
    if (tiers.length === 0) {
      console.error('❌ No tiers found. Please run seed.js first.');
      return;
    }

    // Current date - November 20, 2025
    const now = new Date('2025-11-20');
    
    // Helper function to create a date
    const createDate = (month, day, hour, minute) => {
      return new Date(2025, month, day, hour, minute).toISOString();
    };

    const events = [
      // November 2025 events
      {
        name: 'Emergency Communications Training',
        description: 'Hands-on training for emergency radio communications protocols and procedures. Learn how to effectively communicate during disasters and emergencies.',
        location: 'County Emergency Operations Center',
        event_date: createDate(10, 23, 10, 0), // Nov 23, 2025 at 10:00 AM
        minimum_tier_id: null, // Open to all
        max_attendees: 30,
        created_by: adminUser.id
      },
      {
        name: 'Monthly ARES Net',
        description: 'Regular monthly check-in net for all ARES members. Practice your radio skills and stay connected with the team.',
        location: '145.230 MHz',
        event_date: createDate(10, 25, 19, 0), // Nov 25, 2025 at 7:00 PM
        minimum_tier_id: null,
        max_attendees: null,
        created_by: adminUser.id
      },
      {
        name: 'Thanksgiving Day Parade Support',
        description: 'Provide communications support for the annual Thanksgiving Day parade. Help coordinate with police, fire, and parade organizers.',
        location: 'Downtown Main Street',
        event_date: createDate(10, 28, 8, 0), // Nov 28, 2025 at 8:00 AM
        minimum_tier_id: tiers[1]?.id || null, // Requires 2nd tier
        max_attendees: 15,
        created_by: adminUser.id
      },
      {
        name: 'Equipment Check & Maintenance Workshop',
        description: 'Bring your gear for inspection and learn basic radio maintenance. Experienced members will help troubleshoot issues.',
        location: 'Fire Station #3 Training Room',
        event_date: createDate(10, 30, 14, 0), // Nov 30, 2025 at 2:00 PM
        minimum_tier_id: null,
        max_attendees: 20,
        created_by: adminUser.id
      },

      // December 2025 events
      {
        name: 'Winter Weather Preparedness Drill',
        description: 'Simulated winter storm exercise testing our emergency response capabilities. Practice shelter operations and emergency traffic handling.',
        location: 'Red Cross Shelter - Community Center',
        event_date: createDate(11, 7, 9, 0), // Dec 7, 2025 at 9:00 AM
        minimum_tier_id: tiers[1]?.id || null,
        max_attendees: 25,
        created_by: adminUser.id
      },
      {
        name: 'Holiday Lights Festival Communications',
        description: 'Support communications for the annual holiday lights festival. Coordinate parking, crowd control, and emergency services.',
        location: 'City Park',
        event_date: createDate(11, 14, 17, 0), // Dec 14, 2025 at 5:00 PM
        minimum_tier_id: tiers[0]?.id || null, // Requires 1st tier
        max_attendees: 12,
        created_by: adminUser.id
      },
      {
        name: 'Year-End Meeting & Awards',
        description: 'Annual year-end meeting with awards ceremony. Celebrate our achievements and plan for the upcoming year. Dinner provided.',
        location: 'County Government Center - Conference Room A',
        event_date: createDate(11, 18, 18, 0), // Dec 18, 2025 at 6:00 PM
        minimum_tier_id: null,
        max_attendees: 50,
        created_by: adminUser.id
      },
      {
        name: 'Monthly ARES Net',
        description: 'Regular monthly check-in net for all ARES members. Share holiday greetings and operational updates.',
        location: '145.230 MHz',
        event_date: createDate(11, 23, 19, 0), // Dec 23, 2025 at 7:00 PM
        minimum_tier_id: null,
        max_attendees: null,
        created_by: adminUser.id
      },

      // January 2026 events
      {
        name: 'New Year Kickoff Meeting',
        description: 'Start the new year right! Overview of 2026 plans, training schedule, and volunteer opportunities.',
        location: 'Public Library - Meeting Room B',
        event_date: createDate(0, 11, 14, 0), // Jan 11, 2026 at 2:00 PM (month 0 = January)
        minimum_tier_id: null,
        max_attendees: 40,
        created_by: adminUser.id
      },
      {
        name: 'Digital Modes Workshop',
        description: 'Introduction to digital amateur radio modes including FT8, PSK31, and Winlink. Bring your laptop!',
        location: 'EOC Training Center',
        event_date: createDate(0, 18, 10, 0), // Jan 18, 2026 at 10:00 AM
        minimum_tier_id: tiers[0]?.id || null,
        max_attendees: 20,
        created_by: adminUser.id
      },
      {
        name: 'Winter Marathon Communications Support',
        description: 'Provide communications support for the annual winter marathon. Multiple checkpoint positions available.',
        location: 'Various Locations - See Assignment Sheet',
        event_date: createDate(0, 25, 7, 0), // Jan 25, 2026 at 7:00 AM
        minimum_tier_id: tiers[1]?.id || null,
        max_attendees: 18,
        created_by: adminUser.id
      },
      {
        name: 'Monthly ARES Net',
        description: 'Regular monthly check-in net for all ARES members.',
        location: '145.230 MHz',
        event_date: createDate(0, 27, 19, 0), // Jan 27, 2026 at 7:00 PM
        minimum_tier_id: null,
        max_attendees: null,
        created_by: adminUser.id
      },

      // February 2026 events
      {
        name: 'Antenna Building Workshop',
        description: 'Build your own portable antenna for emergency use. Materials provided. Great hands-on learning experience!',
        location: 'Workshop at Fire Station #5',
        event_date: createDate(1, 8, 13, 0), // Feb 8, 2026 at 1:00 PM (month 1 = February)
        minimum_tier_id: null,
        max_attendees: 15,
        created_by: adminUser.id
      },
      {
        name: 'Valentine\'s Day 5K Run Support',
        description: 'Communications support for the Valentine\'s Day charity run. Fun event with great community involvement.',
        location: 'Riverside Park',
        event_date: createDate(1, 14, 8, 30), // Feb 14, 2026 at 8:30 AM
        minimum_tier_id: tiers[0]?.id || null,
        max_attendees: 10,
        created_by: adminUser.id
      },
      {
        name: 'SKYWARN Spotter Training',
        description: 'National Weather Service severe weather spotter certification training. Learn to identify and report dangerous weather conditions.',
        location: 'County Library Auditorium',
        event_date: createDate(1, 21, 18, 0), // Feb 21, 2026 at 6:00 PM
        minimum_tier_id: null,
        max_attendees: 60,
        created_by: adminUser.id
      },
      {
        name: 'Monthly ARES Net',
        description: 'Regular monthly check-in net for all ARES members.',
        location: '145.230 MHz',
        event_date: createDate(1, 24, 19, 0), // Feb 24, 2026 at 7:00 PM
        minimum_tier_id: null,
        max_attendees: null,
        created_by: adminUser.id
      }
    ];

    // Insert events
    for (const event of events) {
      await db.run(
        `INSERT INTO events (name, description, location, event_date, minimum_tier_id, max_attendees, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          event.name,
          event.description,
          event.location,
          event.event_date,
          event.minimum_tier_id,
          event.max_attendees,
          event.created_by
        ]
      );
      console.log(`  ✅ Created event: ${event.name}`);
    }

    console.log(`\n✅ Successfully seeded ${events.length} events`);
    console.log('   Events span from November 2025 through February 2026');

  } catch (error) {
    console.error('❌ Error seeding events:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedEvents()
    .then(() => {
      console.log('✅ Event seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Event seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedEvents;
