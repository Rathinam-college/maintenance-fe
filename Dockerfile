FROM node:20-slim

WORKDIR /app
COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8085

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8085"]
