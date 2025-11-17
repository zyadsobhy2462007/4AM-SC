FROM node:20-alpine

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy application files
COPY . .

# Expose port (Railway sets PORT automatically)
EXPOSE ${PORT:-4000}

# Start the application
CMD ["node", "src/index.js"]
