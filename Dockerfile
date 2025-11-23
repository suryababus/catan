FROM node:20-alpine

WORKDIR /app

# Copy root package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy server package files and install dependencies
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci

# Copy all source code
COPY . .

# Build frontend (outputs to /app/dist)
RUN npm run build

# Build backend (outputs to /app/server/dist)
RUN cd server && npm run build

# Environment setup
ENV PORT=2567
ENV NODE_ENV=production

EXPOSE 2567

# Start the server
CMD ["node", "server/dist/server/src/index.js"]

