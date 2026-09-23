FROM node:lts-alpine
ENV \
    NODE_ENV=production \
    DATABASE_URL=postgresql://postgres.vukifxwvuvvdevhhxpxy:oceanganteng6769@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
COPY . .
EXPOSE 3000
RUN chown -R node /usr/src/app
USER node
CMD ["npm", "start"]
