# Use Node.js LTS version
FROM node:22-slim

# Update system packages
RUN apt-get update && apt-get upgrade -y && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Install build dependencies for TailwindCSS
RUN npm install --save-dev tailwindcss @tailwindcss/forms

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p data uploads/licenses uploads/photos uploads/proofs uploads/documents

# Build TailwindCSS
RUN npm run build:css

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Create volume for persistent data
VOLUME ["/app/data", "/app/uploads"]

# Run migrations and start server
CMD ["sh", "-c", "node src/database/migrate.js && node server.js"]
