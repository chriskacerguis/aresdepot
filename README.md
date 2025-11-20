# ARES Depot - Member Management System

A comprehensive member management system for Amateur Radio Emergency Service (ARES) coordinators.

## Features

- **Member Management**: Registration, profiles, and directory
- **Tier System**: Track member progression through achievement tiers
- **Task Tracking**: Standardized tasks with verification workflow
- **Special Achievements**: Additional accomplishments with proof uploads
- **Event Management**: Create events with tier requirements and RSVP tracking
- **Reporting**: Generate event reports and member lists
- **File Uploads**: Support for FCC licenses and achievement proofs

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: SQLite (easily migrates to PostgreSQL)
- **Frontend**: EJS templates + TailwindCSS
- **Authentication**: Session-based with bcrypt

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

4. Run database migrations:
   ```bash
   npm run migrate
   ```

5. (Optional) Seed initial admin and sample data:
   ```bash
   npm run seed
   ```

## Development

Start the development server with auto-reload:
```bash
npm run dev
```

In a separate terminal, watch CSS changes:
```bash
npm run watch:css
```

## Production

Build CSS:
```bash
npm run build
```

Start the server:
```bash
npm start
```

## Database Migration to PostgreSQL

The application uses a database abstraction layer that makes switching from SQLite to PostgreSQL straightforward:

1. Install pg driver: `npm install pg`
2. Update `src/database/config.js` to use PostgreSQL connection
3. Run migrations: `npm run migrate`

## Default Admin Credentials

- Email: Set in `.env` (ADMIN_EMAIL)
- Password: Set in `.env` (ADMIN_PASSWORD)

**⚠️ Change these immediately after first login!**

## Project Structure

```
├── src/
│   ├── config/          # Application configuration
│   ├── controllers/     # Route controllers
│   ├── database/        # Database setup and migrations
│   ├── middleware/      # Express middleware
│   ├── models/          # Data models
│   ├── routes/          # API and view routes
│   ├── services/        # Business logic
│   └── utils/           # Helper functions
├── views/               # EJS templates
├── public/              # Static assets
└── uploads/             # User uploaded files
```

## License

ISC
