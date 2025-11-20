# ARES Depot - Docker Deployment

## Quick Start

### Using Docker Compose (Recommended)

1. **Build and run the container:**
   ```bash
   docker-compose up -d
   ```

2. **Access the application:**
   - Open http://localhost:3000
   - Default admin login:
     - Email: `admin@aresdepot.local`
     - Password: `admin123`
   - **⚠️ Change the default password immediately after first login**

3. **View logs:**
   ```bash
   docker-compose logs -f
   ```

4. **Stop the container:**
   ```bash
   docker-compose down
   ```

### Using Docker CLI

1. **Build the image:**
   ```bash
   docker build -t aresdepot .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     --name aresdepot \
     -p 3000:3000 \
     -v $(pwd)/data:/app/data \
     -v $(pwd)/uploads:/app/uploads \
     -e SESSION_SECRET=your-secure-secret-key \
     aresdepot
   ```

3. **View logs:**
   ```bash
   docker logs -f aresdepot
   ```

4. **Stop the container:**
   ```bash
   docker stop aresdepot
   docker rm aresdepot
   ```

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Required
SESSION_SECRET=your-very-secure-random-string-here

# Optional - Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password

# Application Settings
NODE_ENV=production
PORT=3000
```

## Data Persistence

The Docker setup uses volumes to persist data:

- **`./data`** - SQLite database and session data
- **`./uploads`** - User-uploaded files (licenses, photos, proofs, documents)

These directories are automatically created and mounted when you run the container.

## Initial Setup

On first run, the container will:

1. Run database migrations automatically
2. Create an admin user (if database is new):
   - Email: `admin@aresdepot.local`
   - Password: `admin123`

To seed sample data (optional):

```bash
# Seed tiers and admin user
docker-compose exec aresdepot npm run seed

# Seed sample members with geocoding
docker-compose exec aresdepot npm run seed:members

# Seed sample events
docker-compose exec aresdepot npm run seed:events
```

## Production Deployment

### Security Checklist

1. **Change default admin password** immediately after first login
2. **Set a strong `SESSION_SECRET`** in your `.env` file
3. **Configure SMTP settings** for email functionality
4. **Use HTTPS** with a reverse proxy (nginx, Traefik, Caddy)
5. **Regular backups** of the `./data` and `./uploads` directories
6. **Keep Docker image updated** with `docker-compose pull && docker-compose up -d`

### Example nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name aresdepot.example.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Updating the Application

```bash
# Pull latest code
git pull

# Rebuild and restart container
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Run any new migrations (automatic on startup)
```

## Troubleshooting

### Container won't start

Check logs:
```bash
docker-compose logs aresdepot
```

### Database issues

Reset database (⚠️ destroys all data):
```bash
docker-compose down
rm -rf data/*.db
docker-compose up -d
```

### Permission issues

Ensure volumes have correct permissions:
```bash
chmod -R 755 data uploads
```

## Backup & Restore

### Backup

```bash
# Create backup directory
mkdir -p backups/$(date +%Y%m%d)

# Backup database and uploads
cp -r data uploads backups/$(date +%Y%m%d)/
```

### Restore

```bash
# Stop container
docker-compose down

# Restore from backup
cp -r backups/20241120/data ./
cp -r backups/20241120/uploads ./

# Start container
docker-compose up -d
```

## Development with Docker

For development with live reload:

```bash
# Use docker-compose with override
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Create `docker-compose.dev.yml`:
```yaml
version: '3.8'

services:
  aresdepot:
    command: npm run dev
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
```

## Support

For issues and questions, please refer to the main project documentation.
