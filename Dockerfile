# Build a docker image for this repository
# 1. make sure docker is installed
# 2. make sure you have a clean copy of this repository
# 3. go to the directory where this file exists (the root of your repo)
# 4. $ docker build -t webgme-hfsm .
# 5. export image: $ docker save -o webgme-hfsm.tar webgme-hfsm

# After successful startup, you should be able to connect to your dockerized webgme on the 8888 port of the host.
#
# Useful commands
# checking the status of your docker containers:    docker ps -a
# restart your docker container:                    docker restart webgme-hfsm
# stop your container:                              docker stop webgme-hfsm
# removing your container:                          docker rm webgme-hfsm
# removing your image:                              docker rmi webgme-hfsm
# list available images:                            docker images
# exporting the image:                              docker save -o webgme-hfsm.tar webgme-hfsm
# import an image:                                  docker load -i webgme-hfsm.tar


# Before running the webgme container you need a running mongo docker container.
# Since the persisted files from mongo, the webgme logs and auth keys live outside of the containers in this setup,
# we need to map a directory to the containters. For this particular example we will use the preset file structure as defined
# in /dockershare and map it to both containers.
# Copy the dockershare to ~/dockershare.
#
# Get the latest image from https://hub.docker.com/_/mongo/. At the point of testing this the latest was 3.4.2
# $ docker pull mongo
#
# Start a container from the mongo image. (If the name and/or port is edited the config.mongo.js must be changed.)
# $ docker run -d -p 27017:27017 -v ~/dockershare/db:/data/db --name mongo mongo
#
# Finally start the webgme app container from the image built here.
# $ docker run -d -p 8888:8888 -v ~/dockershare:/dockershare --link mongo:mongo --name=webgme-hfsm webgme-hfsm
#
# After successful startup, you should be able to connect to your dockerized webgme on the 8888 port of the host.

# Node 20
FROM node:20
MAINTAINER William Emfinger <waemfinger@gmail.com>

# Install git
RUN apt update
RUN apt install -y git

RUN mkdir /usr/app

WORKDIR /usr/app

# copy app source
ADD . /usr/app/

# webgme is a peer dependency and needs to be installed explicitly
# RUN npm install webgme

# Install node-modules
RUN npm install -g bower

# Install node-modules
RUN npm install

# Set environment variable in order to use ./config/config.docker.js
ENV NODE_ENV docker

EXPOSE 8081

CMD ["npm", "start"]
