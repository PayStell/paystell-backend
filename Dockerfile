FROM node:18-alpine

WORKDIR /app

# Install netcat and dependencies required for bcrypt
RUN apk add --no-cache netcat-openbsd python3 make g++

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]