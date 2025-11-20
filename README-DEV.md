# ARES Depot - Development Guide

## Development Database Seeding

This project includes database seeding tools for development purposes. **Do not use these in production.**

### Initial Setup

1. Run migrations to create the database schema:
```bash
npm run migrate
```

2. Seed initial data (tiers, tasks, achievements, admin user):
```bash
npm run seed
```

3. Seed sample members (optional, for development only):
```bash
npm run seed:members
```

### Seed Files

- **`seed.js`**: Creates base data structure
  - Default tiers (Bronze, Silver, Gold, Platinum, Diamond)
  - Sample tasks for each tier
  - Sample achievements
  - Admin user (admin@example.com / Admin123!)

- **`seed-members.js`**: Creates sample member accounts
  - 8 member accounts with random callsigns
  - Random task completion and verification status
  - Random tier achievements
  - **Development only** - includes test passwords

### Member Seed Data

The member seeder creates 8 sample accounts:

| Email | Password | Callsign |
|-------|----------|----------|
| john.smith@example.com | Password123! | KA1ABC |
| sarah.johnson@example.com | Password123! | KB2XYZ |
| michael.brown@example.com | Password123! | KC3DEF |
| lisa.davis@example.com | Password123! | KD4GHI |
| robert.wilson@example.com | Password123! | KE5JKL |
| jennifer.taylor@example.com | Password123! | KF6MNO |
| david.anderson@example.com | Password123! | KG7PQR |
| mary.thomas@example.com | Password123! | KH8STU |

Each member will have:
- Random number of completed tasks (0-8)
- Mix of verified and unverified task completions
- Automatic tier achievements based on completed tasks

### Resetting Development Data

To completely reset your development database:

```bash
# Delete the database
rm data/ares.db

# Recreate schema
npm run migrate

# Reseed base data
npm run seed

# Reseed members (optional)
npm run seed:members
```

### Security Notes

⚠️ **Important**: The `seed-members.js` file contains hardcoded test passwords and should **never** be used in production. The seed scripts check for existing data to prevent accidental reseeding.

For production deployments:
- Do not run `npm run seed` or `npm run seed:members`
- Create admin accounts manually with strong passwords
- Members should register through the application interface
