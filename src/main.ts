/* eslint-disable max-classes-per-file */
import express from 'express';
import { createServer } from 'http';
import { action, autorun, observable } from 'mobx';
import { createTransformer } from 'mobx-utils';
import path from 'path';
import socketIo from 'socket.io';

const app = express();
const server = createServer(app);
const io = socketIo(server);

// Serve content of public dir
const publicPath = path.join(__dirname, '../public');
app.use(
  express.static(publicPath, {
    setHeaders: (res, filePath) => {
      const relativeToPublicPath = path.relative(publicPath, filePath);
      if (relativeToPublicPath.startsWith('static/')) {
        // Cache files in static dir for one year
        // See https://create-react-app.dev/docs/production-build/#static-file-caching
        res.setHeader('Cache-Control', 'max-age=31536000');
      }
    },
  }),
);

const port = process.env.PORT || 3000;
server.listen(port);

class Player {
  readonly id = String(Math.random());
  @observable name: string;
  @observable vote?: number;
  @observable votedAt?: number;

  constructor(name: string) {
    this.name = name;
  }
}

class Room {
  @observable.shallow playersById: Map<string, Player> = new Map();
  @observable createdAt = Date.now();
  @observable updatedAt = Date.now();
  @observable areVotesVisible = false;

  @action
  addPlayer = (userId: string, playerName: string): void => {
    this.updatedAt = Date.now();
    this.playersById.set(userId, new Player(playerName));
  };

  @action
  removePlayer = (userId: string): void => {
    this.updatedAt = Date.now();
    this.playersById.delete(userId);
  };

  @action
  renamePlayer = (userId: string, playerName: string): void => {
    this.updatedAt = Date.now();
    const player = this.#getPlayer(userId);
    player.name = playerName;
  };

  @action
  updateVote = (userId: string, vote: number): void => {
    this.updatedAt = Date.now();
    const player = this.#getPlayer(userId);
    player.vote = vote;
    player.votedAt = Date.now();
  };

  @action
  showVotes = (): void => {
    this.updatedAt = Date.now();
    this.areVotesVisible = true;
  };

  @action
  showVotesIfEveryoneVoted = (): void => {
    const isEveryoneVoted = Array.from(this.playersById.values()).every(
      (player) => player.vote != null,
    );
    if (isEveryoneVoted && this.playersById.size > 0) {
      this.showVotes();
    }
  };

  @action
  clearVotes = (): void => {
    this.updatedAt = Date.now();
    this.areVotesVisible = false;
    this.playersById.forEach((player) => {
      /* eslint-disable no-param-reassign */
      player.vote = undefined;
      player.votedAt = undefined;
      /* eslint-enable no-param-reassign */
    });
  };

  #getPlayer = (userId: string): Player => {
    const player = this.playersById.get(userId);

    if (!player) {
      throw new Error(`Player with id ${userId} doesn't exist in a room`);
    }

    return player;
  };
}

class State {
  @observable.shallow rooms: Map<string, Room> = new Map();

  getRoom = (roomName: string): Room => {
    const room = this.rooms.get(roomName);

    if (!room) {
      throw new Error(`Room ${roomName} doesn't exist`);
    }

    return room;
  };

  hasRoom = (roomName: string): boolean => this.rooms.has(roomName);

  createRoom = (roomName: string): Room => {
    const room = new Room();

    this.rooms.set(roomName, room);

    return room;
  };
}

const state = new State();

const serializeRoomState = createTransformer((room: Room) => ({
  players: Array.from(room.playersById.values()).map((player) => ({
    id: player.id,
    name: player.name,
    vote: room.areVotesVisible ? player.vote : undefined,
    votedAt: player.votedAt,
  })),
  areVotesVisible: room.areVotesVisible,
  updatedAt: room.updatedAt,
}));

interface HandshakeQuery {
  roomName: string;
}

io.on('connection', (socket) => {
  const { roomName } = socket.handshake.query as HandshakeQuery;

  socket.on('join', ({ playerName }) => {
    socket.join(roomName);

    if (!state.hasRoom(roomName)) {
      state.createRoom(roomName);

      // Automatically send updates when room's state changes
      autorun(() => {
        const roomState = state.getRoom(roomName);
        const serializedRoomState = serializeRoomState(roomState);

        io.to(roomName).emit('state', serializedRoomState);
      });
    }

    state.getRoom(roomName).addPlayer(socket.id, playerName);
  });

  socket.on('vote', ({ vote }) => {
    const room = state.getRoom(roomName);
    room.updateVote(socket.id, vote);
    room.showVotesIfEveryoneVoted();
  });

  socket.on('showVotes', () => {
    state.getRoom(roomName).showVotes();
  });

  socket.on('clearVotes', () => {
    state.getRoom(roomName).clearVotes();
  });

  socket.on('renameSelf', ({ playerName }) => {
    state.getRoom(roomName).renamePlayer(socket.id, playerName);
  });

  socket.on('disconnect', () => {
    if (state.hasRoom(roomName)) {
      state.getRoom(roomName).removePlayer(socket.id);
    }
  });
});
