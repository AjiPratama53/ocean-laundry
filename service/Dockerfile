# syntax=docker/dockerfile:1
# Multi-stage build for the Ocean Laundry API.
# Railway auto-detects this Dockerfile because it is named Dockerfile at the
# root of the service directory.

# ---------- build stage: compile TypeScript ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- runtime stage ----------
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --chown=node:node --from=build /app/dist ./dist
EXPOSE 3000
USER node
CMD ["npm", "start"]
