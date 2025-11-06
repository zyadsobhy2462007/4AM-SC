FROM node:20-alpine

WORKDIR /usr/src/app

# Copy package files from backend directory
COPY backend/package*.json ./

# Install dependencies
# Use npm ci if package-lock.json exists, otherwise use npm install
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Copy all backend files
COPY backend/ ./

# Expose port (Railway sets PORT automatically)
EXPOSE ${PORT:-4000}

# Start the application
CMD ["node", "src/index.js"]

