#!/usr/bin/env node

/**
 * Quick Development Helper
 * Displays common commands and checks project status
 */

const fs = require('fs');
const path = require('path');

console.log('\n📻 ARES Depot - Development Helper\n');
console.log('=====================================\n');

// Check if .env exists
const envExists = fs.existsSync('.env');
console.log(`${envExists ? '✅' : '❌'} .env file ${envExists ? 'exists' : 'missing'}`);

// Check if node_modules exists
const modulesExist = fs.existsSync('node_modules');
console.log(`${modulesExist ? '✅' : '❌'} Dependencies ${modulesExist ? 'installed' : 'not installed'}`);

// Check if database exists
const dbExists = fs.existsSync('data/ares.db');
console.log(`${dbExists ? '✅' : '❌'} Database ${dbExists ? 'initialized' : 'not initialized'}`);

// Check if database is seeded (check for admin user)
let isSeeded = false;
if (dbExists) {
  try {
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database('data/ares.db');
    db.get('SELECT COUNT(*) as count FROM users WHERE is_admin = 1', (err, row) => {
      if (!err && row && row.count > 0) {
        isSeeded = true;
      }
      db.close();
      
      console.log(`${isSeeded ? '✅' : '❌'} Database ${isSeeded ? 'seeded' : 'not seeded'}`);
      
      // Check if CSS is built
      const cssExists = fs.existsSync('public/css/output.css');
      console.log(`${cssExists ? '✅' : '❌'} CSS ${cssExists ? 'built' : 'not built'}`);

      printCommands(envExists, modulesExist, dbExists, isSeeded, cssExists);
    });
    return;
  } catch (e) {
    // sqlite3 not installed yet
  }
}

// Check if CSS is built
const cssExists = fs.existsSync('public/css/output.css');
console.log(`${cssExists ? '✅' : '❌'} CSS ${cssExists ? 'built' : 'not built'}`);

printCommands(envExists, modulesExist, dbExists, false, cssExists);

function printCommands(envExists, modulesExist, dbExists, isSeeded, cssExists) {
console.log('\n📝 Common Commands:\n');
console.log('Setup:');
console.log('  ./setup.sh              - Automated setup');
console.log('  npm install             - Install dependencies');
console.log('  npm run migrate         - Setup database');
console.log('  npm run seed            - Add sample data');
console.log('');
console.log('Development:');
console.log('  npm run dev             - Start dev server');
console.log('  npm run watch:css       - Watch CSS changes');
console.log('');
console.log('Production:');
console.log('  npm run build           - Build CSS');
console.log('  npm start               - Start server');
console.log('');
console.log('Database:');
console.log('  npm run migrate         - Run migrations');
console.log('  npm run seed            - Seed database');
console.log('  rm -rf data/ && npm run migrate  - Reset database');
console.log('');

if (!envExists) {
  console.log('⚠️  Next step: Copy .env.example to .env\n');
} else if (!modulesExist) {
  console.log('⚠️  Next step: Run npm install\n');
} else if (!dbExists) {
  console.log('⚠️  Next step: Run npm run migrate\n');
} else if (!isSeeded) {
  console.log('⚠️  Next step: Run npm run seed\n');
} else if (!cssExists) {
  console.log('⚠️  Next step: Run npm run build\n');
} else {
  console.log('✅ Ready to run! Use: npm run dev\n');
  console.log('   http://localhost:3000\n');
  console.log('   Default admin: admin@example.com / ChangeThisPassword123!\n');
}
}
