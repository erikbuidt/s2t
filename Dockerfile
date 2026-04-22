# --- BUILD STAGE ---
FROM node:20-bookworm AS build

WORKDIR /app

# Install python3 in build stage because yt-dlp-exec's postinstall script 
# needs to check the python version.
RUN apt-get update && apt-get install -y python3 python-is-python3 && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build the project
COPY . .
RUN npm run build

# --- RUNTIME STAGE ---
FROM node:20-bookworm-slim AS runtime

WORKDIR /app

# Install system dependencies: python3 for yt-dlp and ffmpeg for audio processing
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python-is-python3 \
    ffmpeg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp via pip
RUN python3 -m pip install --no-cache-dir --break-system-packages yt-dlp

# Copy production dependencies only
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy built assets from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/views ./views

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose the API port
EXPOSE 3001

# Start the application
CMD ["node", "dist/main"]
