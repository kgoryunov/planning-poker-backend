# Planning Poker Backend

A simple backend that holds current state of a game and broadcast it to players.

## Build instructions

```bash
# Build frontend
$ cd /planning-poker-frontend
$ yarn build

# Update content of public directory with the build results
$ rm -Rf /planning-poker-backend/public/
$ cp /planning-poker-frontend/buld/* /planning-poker-backend/public/

# Build backend
$ cd /planning-poker-backend
$ yarn buld

# Build Docker image and deploy it somewhere
$ docker buld . -t planning-poker
```
