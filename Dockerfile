FROM node:18-alpine
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --production || npm install --production

# Copy source
COPY . .

# Default auth mount dir (Railway: /mnt/auth)
ENV AUTH_DIR=/mnt/auth

EXPOSE 3000
CMD ["node", "bot.js"]
