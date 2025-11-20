require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const authRoutes = require('./src/routes/auth');
const memberRoutes = require('./src/routes/members');
const adminRoutes = require('./src/routes/admin');
const eventRoutes = require('./src/routes/events');
const certificationRoutes = require('./src/routes/certifications');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.tile.openstreetmap.org"],
      connectSrc: ["'self'", "https://nominatim.openstreetmap.org", "https://unpkg.com"]
    }
  }
}));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// EJS layout support (simple approach)
const expressEjsLayouts = require('express-ejs-layouts');
app.use(expressEjsLayouts);
app.set('layout', 'layout');

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session configuration
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: './data'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Make user available to all templates
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isAdmin = req.session.user?.is_admin || false;
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/members', memberRoutes);
app.use('/admin', adminRoutes);
app.use('/events', eventRoutes);
app.use('/certifications', certificationRoutes);

// Home route
app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect(req.session.user.is_admin ? '/admin/dashboard' : '/members/dashboard');
  } else {
    res.render('index');
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 ARES Depot server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});
