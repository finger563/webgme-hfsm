#!/bin/bash

docker build --network=host -t webgme-hfsm .
docker run --name webgme-hfsm -d -p 8081:8081 --link mongo:mongo webgme-hfsm:latest
