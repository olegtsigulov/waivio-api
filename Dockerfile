FROM node:13

RUN mkdir -p /usr/src/waivio-api/
WORKDIR /usr/src/waivio-api/

COPY . /usr/src/waivio-api/package.json
RUN npm install

COPY . /usr/src/waivio-api/

CMD ["node", "bin/www"]
