FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm install --save-dev @types/node@20 @types/express @types/cors @types/pg @types/ws typescript ts-node-dev
RUN npx tsc --skipLibCheck

EXPOSE 3001

CMD ["node", "dist/server.js"]
