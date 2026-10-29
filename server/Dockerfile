# Stage 1: Development
FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Copy the rest of the code
COPY . .

# Build to ensure everything is fine
RUN npm run build

EXPOSE 3000

# Default command for development (overridden in Compose)
CMD ["npm", "run", "start:debug"]

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
# Install only production dependencies
RUN npm ci --omit=dev

COPY --from=development /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
