FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache tzdata curl
ENV TZ=Asia/Taipei

COPY package*.json ./
RUN npm install --production

COPY dist/ ./dist/

EXPOSE 3001

CMD ["node", "dist/server.js"]
