# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install npm dependencies
COPY package*.json ./
RUN npm install

# Build the React production bundle
COPY . .
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Production serve stage using Nginx
FROM nginx:alpine

# Copy compiled assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx proxy config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

