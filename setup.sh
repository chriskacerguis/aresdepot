#!/bin/bash

echo "🚀 ARES Depot - Setup Script"
echo "============================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Setup environment file
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created"
    echo "⚠️  Please edit .env and update SESSION_SECRET and admin credentials"
else
    echo "ℹ️  .env file already exists"
fi
echo ""

# Run migrations
echo "🗄️  Running database migrations..."
npm run migrate

if [ $? -ne 0 ]; then
    echo "❌ Failed to run migrations"
    exit 1
fi

echo "✅ Database migrations completed"
echo ""

# Seed database
read -p "Would you like to seed the database with sample data? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Seeding database..."
    npm run seed
    echo "✅ Database seeded"
fi
echo ""

# Build CSS
echo "🎨 Building CSS..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build CSS"
    exit 1
fi

echo "✅ CSS built"
echo ""

echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "  Development: npm run dev"
echo "  Production:  npm start"
echo ""
echo "The application will be available at: http://localhost:3000"
echo ""
echo "⚠️  Remember to:"
echo "  1. Edit .env and change SESSION_SECRET"
echo "  2. Update admin credentials in .env"
echo "  3. Change admin password after first login"
echo ""
