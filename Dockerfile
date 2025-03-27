FROM node:18-alpine

WORKDIR /app

# Install netcat for database health check
RUN apk add --no-cache netcat-openbsd

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]