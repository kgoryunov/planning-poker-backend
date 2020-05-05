FROM node:lts-alpine3.9
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn install --ignore-scripts --frozen-lockfile
COPY . .
CMD ["node", "dist/main.js"]
