# ARES Depot - Quick Start Guide

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup environment:**
   ```bash
   cp .env.example .env
   # Edit .env and change the SESSION_SECRET and admin credentials
   ```

3. **Initialize database:**
   ```bash
   npm run migrate
   ```

4. **Seed sample data (optional):**
   ```bash
   npm run seed
   ```

5. **Build CSS:**
   ```bash
   npm run build
   ```

## Running the Application

### Development Mode

Start the server with auto-reload:
```bash
npm run dev
```

In a separate terminal, watch CSS changes:
```bash
npm run watch:css
```

The application will be available at: http://localhost:3000

### Production Mode

1. Build CSS:
   ```bash
   npm run build
   ```

2. Start server:
   ```bash
   npm start
   ```

## Default Admin Access

After running migrations and seed:
- **Email:** admin@example.com (or your ADMIN_EMAIL from .env)
- **Password:** ChangeThisPassword123! (or your ADMIN_PASSWORD from .env)

**⚠️ IMPORTANT:** Change the admin password immediately after first login!

## Project Structure

```
aresdepot/
├── src/
│   ├── database/
│   │   ├── config.js          # Database connection wrapper
│   │   ├── migrate.js         # Database schema migrations
│   │   └── seed.js            # Seed initial data
│   ├── middleware/
│   │   ├── auth.js            # Authentication middleware
│   │   ├── upload.js          # File upload configuration
│   │   ├── validation.js      # Request validation
│   │   └── rateLimiter.js     # Rate limiting
│   ├── models/
│   │   ├── User.js            # User model
│   │   ├── Member.js          # Member model
│   │   ├── Tier.js            # Tier model
│   │   ├── Task.js            # Task model
│   │   ├── Event.js           # Event model
│   │   └── Achievement.js     # Achievement model
│   └── routes/
│       ├── auth.js            # Authentication routes
│       ├── members.js         # Member routes
│       ├── admin.js           # Admin routes
│       ├── events.js          # Event routes
│       └── achievements.js    # Achievement routes
├── views/
│   ├── layout.ejs             # Main layout template
│   ├── index.ejs              # Home page
│   ├── auth/                  # Authentication views
│   ├── members/               # Member views
│   ├── admin/                 # Admin views
│   ├── events/                # Event views
│   └── achievements/          # Achievement views
├── public/
│   └── css/
│       ├── input.css          # Tailwind source
│       └── output.css         # Compiled CSS (generated)
├── uploads/                   # User uploaded files
│   ├── licenses/              # FCC licenses
│   └── proofs/                # Achievement proofs
├── data/                      # Database files
├── server.js                  # Express server
├── package.json               # Dependencies
└── .env                       # Environment variables

```

## Key Features

### For Members:
- ✅ Register with callsign and contact info
- ✅ Upload FCC license (PDF)
- ✅ View and track tier progress
- ✅ Complete and track tasks
- ✅ Submit special achievements with proof
- ✅ RSVP to events (based on tier eligibility)
- ✅ Browse member directory

### For Admins:
- ✅ Manage tiers and tasks
- ✅ Verify member task completions
- ✅ Verify special achievements
- ✅ Create and manage events
- ✅ View member progress
- ✅ Generate reports:
  - Event attendance reports
  - Member progress reports
  - Member directory

## Database Migration to PostgreSQL

The application is designed for easy migration to PostgreSQL:

1. Install PostgreSQL driver:
   ```bash
   npm install pg
   ```

2. Update `src/database/config.js`:
   ```javascript
   const { Pool } = require('pg');
   
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL
   });
   
   // Update methods to use pool.query() instead of db.run/get/all
   ```

3. Run migrations against PostgreSQL database

## Security Notes

- Session secret should be a strong random string (min 32 characters)
- Change default admin credentials immediately
- Use HTTPS in production
- Keep dependencies updated
- Review and adjust rate limiting as needed
- Set secure cookies in production (SESSION_SECRET with secure: true)

## Troubleshooting

**Database issues:**
```bash
# Reset database
rm -rf data/
npm run migrate
npm run seed
```

**CSS not updating:**
```bash
# Rebuild CSS
npm run build
```

**Port already in use:**
```bash
# Change PORT in .env file
PORT=3001
```

## Support

For issues or questions, refer to the project documentation or contact your system administrator.
