# GitHub Copilot Instructions for ARES Depot

## Project Overview
ARES Depot is a comprehensive member management system for Amateur Radio Emergency Service (ARES) coordinators. It manages members, tier progression, task verification, special achievements, events, and administrative reporting.

## Tech Stack & Architecture

### Backend
- **Framework**: Node.js + Express.js
- **Database**: SQLite (designed for easy PostgreSQL migration)
- **Authentication**: Session-based with bcrypt password hashing
- **Security**: Helmet.js CSP, rate limiting, session management
- **File Uploads**: Multer (licenses, photos, proofs, documents)

### Frontend
- **Template Engine**: EJS with express-ejs-layouts
- **CSS Framework**: TailwindCSS
- **JavaScript**: Alpine.js for reactive components
- **UI Components**: Custom components following TailwindUI patterns

### Project Structure
```
├── server.js                 # Main application entry point
├── src/
│   ├── database/
│   │   ├── config.js        # SQLite database configuration
│   │   ├── migrate.js       # Database migrations (20 migrations)
│   │   ├── seed.js          # Seed admin user and tiers
│   │   ├── seed-members.js  # Seed member data with geocoding
│   │   └── seed-events.js   # Seed event data
│   ├── middleware/
│   │   ├── auth.js          # Authentication middleware
│   │   ├── rateLimiter.js   # Rate limiting for login
│   │   ├── upload.js        # File upload configurations
│   │   └── validation.js    # Input validation helpers
│   ├── models/
│   │   ├── User.js          # User account management
│   │   ├── Member.js        # Member profiles & data
│   │   ├── Tier.js          # Achievement tier management
│   │   ├── Task.js          # Task management
│   │   ├── Achievement.js   # Special achievements
│   │   ├── Event.js         # Event management
│   │   ├── Document.js      # Document management
│   │   ├── Setting.js       # System settings
│   │   └── Passkey.js       # WebAuthn passkey support
│   ├── routes/
│   │   ├── auth.js          # Login, logout, registration
│   │   ├── members.js       # Member area routes
│   │   ├── admin.js         # Admin panel routes
│   │   ├── events.js        # Event & calendar routes
│   │   └── certifications.js # Achievement/certification routes
│   └── utils/
│       ├── email.js         # Email sending utilities
│       └── geocode.js       # Address geocoding (OpenStreetMap)
├── views/
│   ├── layout.ejs           # Main layout template
│   ├── admin/               # Admin panel views
│   ├── members/             # Member area views
│   ├── events/              # Event views
│   └── certifications/      # Achievement views
├── public/
│   ├── css/                 # Compiled TailwindCSS
│   └── js/                  # Frontend JavaScript
└── uploads/                 # User-uploaded files
    ├── licenses/            # FCC license PDFs
    ├── photos/              # Profile photos
    ├── proofs/              # Achievement proof files
    └── documents/           # Tier-based documents
```

## Database Schema

### Core Tables
- **users**: Authentication (email, password, is_admin, calendar_token, reset_token)
- **members**: Complete member profiles with:
  - Personal info (name, callsign, contact info, address)
  - Geocoded location (latitude, longitude)
  - Radio capabilities (40+ fields for equipment/capabilities)
  - Emergency contact information
  - Background check tracking
  - ID card tracking (has_id_card, expiry_date, issued_by, issued_date)
- **tiers**: Achievement tiers (name, description, sort_order)
- **tasks**: Tier-specific tasks (tier_id, name, description, sort_order)
- **member_tasks**: Task completion tracking with verification
- **member_tiers**: Tier achievement tracking
- **special_achievements**: Standalone achievements (name, description, requires_proof)
- **member_special_achievements**: Achievement completion with proof
- **events**: ARES events (name, location, date, min_tier_id)
- **event_rsvps**: Event attendance tracking
- **documents**: Tier-based document library
- **settings**: Key-value system settings
- **passkeys**: WebAuthn passkey credentials

### Recent Schema Changes (Migrations 17-20)
- Added ID card management fields to members table:
  - `has_id_card` (INTEGER 0/1)
  - `id_card_expiry_date` (DATE)
  - `id_card_issued_by` (TEXT - callsign of issuing admin)
  - `id_card_issued_date` (DATE)

## Code Style & Conventions

### JavaScript/Node.js
- Use async/await for asynchronous operations
- Modular design: separate routes, models, middleware
- Error handling: try/catch with appropriate error messages
- Consistent naming:
  - camelCase for variables/functions
  - PascalCase for classes/models
  - snake_case for database columns
- Models handle database interactions, routes handle HTTP logic
- Use prepared statements for all database queries (SQL injection prevention)

### EJS Templates
- Use `layout.ejs` as the base layout
- Set page-specific variables: `title`, `currentPage` (for nav highlighting)
- Inline event handlers are allowed (CSP configured with `scriptSrcAttr: unsafe-inline`)
- Use Alpine.js for reactive UI components (tabs, modals, dynamic forms)
- TailwindCSS utility classes for all styling

### Form Patterns
- POST requests for data modification
- GET requests for data retrieval
- CSRF protection via session management
- Server-side validation for all inputs
- Success/error flash messages via session
- Redirect after POST (PRG pattern)

### File Uploads
- Multer configurations in `src/middleware/upload.js`:
  - `uploadLicense`: FCC licenses (PDF, 5MB max)
  - `uploadPhoto`: Profile photos (JPG/PNG, 5MB max)
  - `uploadProof`: Achievement proofs (PDF/images, 10MB max)
  - `uploadDocument`: Admin documents (PDF/images, 10MB max)
- File naming: `{timestamp}-{originalname}`
- Store paths in database, files in `uploads/` subdirectories

## Key Features & Workflows

### Member Registration
1. User creates account (email/password)
2. Complete member profile (name, callsign, address, license upload)
3. Address geocoded automatically via OpenStreetMap Nominatim
4. Admin can approve/verify member

### Tier Progression
1. Admin creates tiers and tasks
2. Members complete tasks and mark them done
3. Admin verifies task completion
4. When all tasks in a tier are verified, tier is auto-achieved
5. Member can download tier certificate (if document uploaded)

### Special Achievements
1. Admin creates achievement (with optional proof requirement)
2. Member submits achievement with proof file
3. Admin reviews and verifies
4. Verified achievements appear on member profile

### Event Management
1. Admin creates event with minimum tier requirement
2. Members RSVP if they meet tier requirement
3. Admin can export event roster with contact info
4. Members can un-RSVP before event date

### ID Card Management (Recent Addition)
1. Admin can mark member as having ID card (status dropdown)
2. Set expiry date for the card
3. Auto-tracking: When status changes to "Active", system records:
   - Issuing admin's callsign
   - Date of issuance
4. "Order Card" button (only enabled if member has profile photo)
5. View mode shows: Active/Not Issued badge, expiry date, "Issued by CALLSIGN on DATE"

### Admin Settings Page
- Tabbed interface using Alpine.js
- Tabs: Email (SMTP), General, Notifications, Security, InstaCard
- Grid layout: `grid-cols-1 lg:grid-cols-[256px_1fr]`
- InstaCard tab fields:
  - Base URL, Email, Password, Organization ID, Card ID
  - Backend route `/admin/settings/instacard` (pending implementation)

## Security Considerations

### Content Security Policy
- Configured in `server.js` via Helmet
- `scriptSrcAttr` allows inline event handlers (`onclick`, `onsubmit`)
- External sources: unpkg.com, cdn.jsdelivr.net, OpenStreetMap tiles
- Image sources include data URIs and blob URLs for profile photos

### Authentication
- Session-based auth with SQLite session store
- Passwords hashed with bcrypt (10 rounds)
- Rate limiting on login endpoint (5 attempts per 15 minutes)
- Admin check middleware: `requireAdmin` in routes/admin.js
- Member check middleware: `requireAuth` in middleware/auth.js

### File Upload Security
- File type restrictions by extension
- File size limits enforced
- Unique filenames (timestamp prefix)
- Serve files from separate `/uploads` route
- Validate file extensions and MIME types

## Common Patterns

### Database Queries in Models
```javascript
// Single record
static async findById(id) {
  return await db.get('SELECT * FROM table WHERE id = ?', [id]);
}

// Multiple records
static async findAll() {
  return await db.all('SELECT * FROM table ORDER BY sort_order');
}

// Insert
static async create(data) {
  const result = await db.run(
    'INSERT INTO table (col1, col2) VALUES (?, ?)',
    [data.col1, data.col2]
  );
  return result.lastID;
}

// Update with dynamic fields
static async update(id, data) {
  const fields = [];
  const values = [];
  
  const fieldMapping = { camelCase: 'snake_case' };
  
  Object.keys(data).forEach(key => {
    if (fieldMapping[key]) {
      fields.push(`${fieldMapping[key]} = ?`);
      values.push(data[key]);
    }
  });
  
  values.push(id);
  await db.run(
    `UPDATE table SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}
```

### Route with Admin Auth
```javascript
router.get('/admin/route', requireAdmin, async (req, res) => {
  try {
    const data = await Model.findAll();
    res.render('admin/view', { 
      title: 'Page Title',
      currentPage: 'page-id',
      data 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Server error');
  }
});
```

### Alpine.js Tab Component
```html
<div x-data="{ activeTab: window.location.hash.slice(1) || 'default' }">
  <nav>
    <a @click.prevent="activeTab = 'tab1'; window.location.hash = 'tab1'"
       :class="activeTab === 'tab1' ? 'active-classes' : 'inactive-classes'">
      Tab 1
    </a>
  </nav>
  
  <div x-show="activeTab === 'tab1'" x-cloak>
    <!-- Tab 1 content -->
  </div>
</div>

<style>
  [x-cloak] { display: none !important; }
</style>
```

## Geocoding Integration
- Uses OpenStreetMap Nominatim API
- Utility: `src/utils/geocode.js`
- Auto-geocodes member addresses on registration/update
- Stores latitude/longitude in members table
- Used for member map visualization
- Rate limited to respect Nominatim usage policy

## Email System
- Configured in `src/utils/email.js`
- Uses Nodemailer with SMTP
- Settings stored in database (settings table)
- Common use cases:
  - Password reset emails
  - Event notifications
  - Task verification notifications

## Migration System
- Sequential migrations in `src/database/migrate.js`
- Run with: `npm run migrate` or `node src/database/migrate.js`
- 20 migrations total (as of latest version)
- Migration tracking prevents duplicate execution
- Add new migrations to end of array
- Each migration should be idempotent when possible (CREATE IF NOT EXISTS, etc.)

## Testing & Development

### Development Mode
```bash
npm run dev  # Uses nodemon for auto-reload
```

### Seeding Data
```bash
npm run seed          # Create admin + tier structure
npm run seed:members  # Generate sample members with geocoding
npm run seed:events   # Generate sample events
```

### Default Admin Credentials
- Email: admin@aresdepot.local
- Password: admin123
- Change immediately after first login

## Pending Features / TODOs

### InstaCard Integration
- Backend route: `POST /admin/settings/instacard` (save credentials)
- Backend route: `POST /admin/members/:id/order-card` (API integration)
- InstaCard API service class needed
- Settings retrieval and form pre-population
- Order Card functionality to submit to InstaCard API

### Future Enhancements
- Email notifications for expiring ID cards (30-day warning)
- Bulk ID card ordering
- Photo upload reminder when ordering without photo
- ID card order history/status tracking
- Test Connection button for InstaCard settings
- WebAuthn passkey login flow (tables exist, UI pending)

## Important Notes for AI Assistants

1. **Database Field Naming**: Database uses `snake_case`, JavaScript uses `camelCase`. Always map properly in models.

2. **File Paths**: Use absolute paths in routes. Uploaded files stored with timestamp prefix.

3. **Admin vs Member Routes**: Admin routes in `/admin/*`, require `requireAdmin` middleware. Member routes use `requireAuth`.

4. **Session Data**: `req.session.user` contains user object. `res.locals.user` makes it available to all templates.

5. **EJS Layouts**: Always set `title` and `currentPage` variables for proper rendering.

6. **Form Submissions**: Follow PRG pattern (Post-Redirect-Get). Set flash messages in session.

7. **CSP Configuration**: Inline event handlers are allowed. External scripts need explicit allowance in `server.js`.

8. **Geocoding**: Automatic on address changes. Can fail gracefully (lat/lon remain null).

9. **ID Card Fields**: New feature. Four fields track complete lifecycle: status, expiry, who issued, when issued.

10. **Settings Page Layout**: Uses CSS Grid (`grid-cols-1 lg:grid-cols-[256px_1fr]`), not flexbox.

## Common Commands

```bash
npm install                    # Install dependencies
npm run dev                    # Start development server
npm run migrate                # Run database migrations
npm run seed                   # Seed admin + tiers
npm run seed:members           # Generate sample members
npm run seed:events            # Generate sample events
node dev-helper.js             # Development helper utilities
```

## Environment Variables

Required in `.env`:
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `SESSION_SECRET` - Session encryption key
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email config (optional)

## Recent Changes & Context

### Latest Updates
1. **ID Card Management** (Migrations 17-20): Complete lifecycle tracking for member ID cards
2. **Settings Page Refactor**: Grid-based sidebar with 5 tabs including InstaCard integration
3. **CSP Updates**: Added `scriptSrcAttr` directive for inline event handlers
4. **Documents Feature**: List-only view (removed grid view toggle)
5. **Member Capabilities**: 40+ radio equipment/capability tracking fields
6. **Geocoding**: Automatic address geocoding with OpenStreetMap

### Known Issues
- Migration 20 may fail on duplicate `current_challenge` column (pre-existing from Migration 14)
- InstaCard backend routes not yet implemented (frontend complete)
- WebAuthn passkey flow incomplete (database tables exist)

---

**When generating code for this project:**
- Follow existing patterns in models, routes, and views
- Use TailwindCSS utility classes, not custom CSS
- Maintain security best practices (prepared statements, input validation, auth checks)
- Keep code modular and readable
- Add comments for complex logic
- Update migrations for schema changes
- Test with existing seed data
