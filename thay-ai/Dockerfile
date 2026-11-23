FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY server.js ./
COPY public ./public
# teachers/ và data/ được gắn từ ngoài vào (volume) để bạn sửa không cần build lại
EXPOSE 3000
CMD ["node", "server.js"]
