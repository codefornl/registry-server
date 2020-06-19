From node:14

MAINTAINER Peter Dave Hello <hsu@peterdavehello.org>
ENV DEBIAN_FRONTEND noninteractive

COPY . /registry-server
WORKDIR /registry-server

RUN git submodule update --init --recursive --depth 1
RUN npm install --prefix "/registry-server"

EXPOSE 3000 5000

ENTRYPOINT ["npm", "start"]
