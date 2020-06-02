import { Room, serializeRoomState, State } from './main';

describe('Main', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('State', () => {
    describe('Top level state', () => {
      let state: State;

      beforeEach(() => {
        state = new State();
      });

      it('it should create a new room', () => {
        jest.spyOn(Date, 'now').mockImplementation(() => 1590254186705);

        state.createRoom('test-room');

        expect(state.hasRoom('test-room')).toBe(true);
        expect(state.getRoom('test-room')).toEqual({
          createdAt: 1590254186705,
          updatedAt: 1590254186705,
          areVotesVisible: false,
          playersById: expect.any(Object),
        });
      });

      it('should throw when accessing a nonexistent room', async () => {
        expect(() => state.getRoom('test-room')).toThrow();
      });
    });

    describe('Room', () => {
      let room: Room;

      beforeEach(() => {
        room = new Room();
      });

      it('should add a player', () => {
        room.addPlayer('test-player-id', 'Tester');

        expect(room.playersById.get('test-player-id')).toEqual({
          id: expect.any(String),
          name: 'Tester',
          vote: undefined,
          votedAt: undefined,
        });
      });

      describe('when there is a player', () => {
        beforeEach(() => {
          room.addPlayer('test-player-id', 'Tester');
        });

        it('should remove a player', () => {
          room.removePlayer('test-player-id');

          expect(room.playersById.has('test-player-id')).toBe(false);
        });

        it('should rename a player', () => {
          room.renamePlayer('test-player-id', 'Cool Guy');

          expect(room.playersById.get('test-player-id')).toEqual(expect.objectContaining({
            name: 'Cool Guy',
          }));
        });

        it('should update vote', () => {
          jest.spyOn(Date, 'now').mockImplementation(() => 1590254186705);

          room.updateVote('test-player-id', 2.5);

          expect(room.playersById.get('test-player-id')).toEqual(expect.objectContaining({
            vote: 2.5,
            votedAt: 1590254186705,
          }));
        });

        it('should throw if player is not exist', () => {
          expect(() => room.updateVote('no-one', 2.5)).toThrow();
        });
      });

      describe('when there are multiple players', () => {
        beforeEach(() => {
          room.addPlayer('foo', 'Foo');
          room.addPlayer('bar', 'Bar');
          room.addPlayer('zoo', 'Zoo');
        });

        it('should show votes if everyone voted', () => {
          room.updateVote('foo', 1.5);
          room.updateVote('bar', 2.5);
          room.updateVote('zoo', 3.0);
          room.showVotesIfEveryoneVoted();

          expect(room.areVotesVisible).toBe(true);
        });

        it('should not show votes someone not voted yet', () => {
          room.updateVote('foo', 1.5);
          room.updateVote('zoo', 3.0);
          room.showVotesIfEveryoneVoted();

          expect(room.areVotesVisible).toBe(false);
        });

        it('should show votes', () => {
          room.updateVote('foo', 1.5);
          room.showVotes();

          expect(room.areVotesVisible).toBe(true);
        });

        it('should clear votes', () => {
          room.updateVote('foo', 1.5);
          room.updateVote('bar', 2.5);
          room.updateVote('zoo', 3.0);
          room.showVotesIfEveryoneVoted();
          room.clearVotes();

          expect(room.areVotesVisible).toBe(false);
          expect(room.playersById.get('foo')).toEqual(expect.objectContaining({
            vote: undefined,
            votedAt: undefined,
          }));
          expect(room.playersById.get('bar')).toEqual(expect.objectContaining({
            vote: undefined,
            votedAt: undefined,
          }));
          expect(room.playersById.get('zoo')).toEqual(expect.objectContaining({
            vote: undefined,
            votedAt: undefined,
          }));
        });

        describe('Serializer', () => {
          it('should transform state correctly', () => {
            jest.spyOn(Date, 'now').mockImplementation(() => 1590254186705);
            room.updateVote('foo', 1.5);
            room.updateVote('bar', 2.5);
            room.updateVote('zoo', 3.0);
            room.showVotesIfEveryoneVoted();

            // Suppress mobx warning about running transformer outside reactive context
            jest.spyOn(console, 'warn').mockImplementationOnce(() => {});

            expect(serializeRoomState(room)).toEqual({
              areVotesVisible: true,
              players: [
                {
                  id: expect.any(String),
                  name: 'Foo',
                  vote: 1.5,
                  votedAt: 1590254186705,
                },
                {
                  id: expect.any(String),
                  name: 'Bar',
                  vote: 2.5,
                  votedAt: 1590254186705,
                },
                {
                  id: expect.any(String),
                  name: 'Zoo',
                  vote: 3,
                  votedAt: 1590254186705,
                },
              ],
              updatedAt: 1590254186705,
            });
          });

          it('should not expose votes until they are shown', () => {
            jest.spyOn(Date, 'now').mockImplementation(() => 1590254186705);
            room.updateVote('foo', 1.5);
            room.updateVote('zoo', 3.0);
            room.showVotesIfEveryoneVoted();

            // Suppress mobx warning about running transformer outside reactive context
            jest.spyOn(console, 'warn').mockImplementationOnce(() => {});

            expect(serializeRoomState(room)).toEqual({
              areVotesVisible: false,
              players: [
                {
                  id: expect.any(String),
                  name: 'Foo',
                  vote: undefined,
                  votedAt: 1590254186705,
                },
                {
                  id: expect.any(String),
                  name: 'Bar',
                  vote: undefined,
                  votedAt: undefined,
                },
                {
                  id: expect.any(String),
                  name: 'Zoo',
                  vote: undefined,
                  votedAt: 1590254186705,
                },
              ],
              updatedAt: 1590254186705,
            });
          });
        });
      });
    });
  });


  it('durr', () => {
    expect(1).toBe(1);
  });
});
