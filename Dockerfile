FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

COPY .env.example ./

EXPOSE 3000

CMD ["npm", "run", "dev"]