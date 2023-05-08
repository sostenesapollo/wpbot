FROM node:16-alpine as builder

ENV NODE_ENV build

WORKDIR /home/node

COPY package.json ./
COPY prisma/ ./
RUN pwd
RUN ls
# COPY .env.example .env

RUN apk update && apk upgrade && apk add --no-cache bash git openssh
RUN yarn
RUN yarn prisma generate
COPY --chown=node:node . .
RUN yarn build


FROM node:16-alpine

ENV NODE_ENV production

WORKDIR /home/node

COPY --from=builder --chown=node:node /home/node/package.json ./
COPY --from=builder --chown=node:node /home/node/node_modules/ ./node_modules/
COPY --from=builder --chown=node:node /home/node/dist/ ./dist/
# COPY --from=builder --chown=node:node /home/node/.env ./.env

EXPOSE 3000

CMD ["node", "dist/index.js"]