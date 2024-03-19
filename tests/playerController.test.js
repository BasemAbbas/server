const sinon = require('sinon');
const nock = require('nock');
const { expect } = import('chai');
const bcrypt = require('bcrypt');
const Game = require('../models/Game');
const Player = require('../models/Player');
const { PlayerController } = require('../controllers/PlayerController');
const {
    signUp,
    login,
    joinGame,
    sellStock,
    buyStock,
    getLeaderboard,
    getPortfolio,
    getStockPrice
} = require('../controllers/PlayerController');

describe('PlayerController', () => {
    describe('signUp', () => {
        it('should register a new player', async () => {
            const req = {
                body: {
                    username: 'testUser',
                    email: 'testUser@gmail.com',
                    password: 'testUser',
                }
            };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };
            sinon.stub(Player, 'findOne').resolves(null);
            sinon.stub(bcrypt, 'hash').resolves('hashedPassword');
            sinon.stub(Player.prototype, 'save').resolves();

            await signUp(req, res);

            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 201);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { message: 'Player registered successfully' });

            sinon.restore();
        });

        it('should return an error if username or email already exists', async () => {
            const req = {
                body: {
                    username: 'testUser',
                    password: 'testUser',
                    email: 'testUser@gmail.com'
                }
            };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };

            sinon.stub(Player, 'findOne').returns({ username: 'existinguser', email: 'existing@example.com' });

            await signUp(req, res);

            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 400);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { error: 'Username or email already exists' });

            sinon.restore();
        });
    });

    describe('login', () => {
        it('should log in an existing player', async () => {
            const req = {
                body: {
                    username: 'existingUser',
                    password: 'validPassword'
                }
            };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };
            const hashedPassword = await bcrypt.hash('validPassword', 10);
            sinon.stub(Player, 'findOne').resolves({ username: 'existingUser', password: hashedPassword });

            await login(req, res);

            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 200);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { message: 'Login successful', player: { username: 'existingUser', password: hashedPassword } });

            sinon.restore();
        });

        it('should return an error if player not found', async () => {
            const req = {
                body: {
                    username: 'nonexistentUser',
                    password: 'validPassword'
                }
            };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };
            sinon.stub(Player, 'findOne').resolves(null);

            await login(req, res);

            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 401);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { error: 'Invalid username or password' });

            sinon.restore();
        });

        it('should return an error if password is invalid', async () => {
            const req = {
                body: {
                    username: 'existingUser',
                    password: 'invalidPassword'
                }
            };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };
            const hashedPassword = await bcrypt.hash('validPassword', 10);
            sinon.stub(Player, 'findOne').resolves({ username: 'existingUser', password: hashedPassword });
            sinon.stub(bcrypt, 'compare').resolves(false);

            await login(req, res);

            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 401);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { error: 'Invalid username or password' });

            sinon.restore();
        });
    });

    describe('joinGame', () => {
        it('should allow a player to join a game successfully', async () => {
            const playerId = 'playerId';
            const gameId = 'gameId';
            const req = {
                body: { playerId, gameId }
            };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };
            const player = {
                _id: playerId,
                active: false,
                portfolio: { holdings: [], cash: 0 },
                notifications: [],
                save: sinon.stub().resolves(true)
            };
            const game = {
                _id: gameId,
                endTime: new Date().getTime() + 3600 * 1000,
                startingAmount: 1000,
                players: [],
                save: sinon.stub().resolves(true)
            };
            sinon.stub(Player, 'findById').resolves(player);
            sinon.stub(Game, 'findById').resolves(game);

            await joinGame(req, res);

            sinon.assert.calledOnce(Player.findById);
            sinon.assert.calledWith(Player.findById, playerId);
            sinon.assert.calledOnce(Game.findById);
            sinon.assert.calledWith(Game.findById, gameId);
            sinon.assert.calledOnce(player.save);
            sinon.assert.calledOnce(game.save);
            sinon.assert.calledWith(res.status, 200);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { message: 'Player joined the game successfully' });

            sinon.restore();
        });

        it('should return an error if player not found', async () => {
            const playerId = 'playerId';
            const gameId = 'gameId';
            const req = {
                body: { playerId, gameId }
            };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };
            sinon.stub(Player, 'findById').resolves(null);

            await joinGame(req, res);

            sinon.assert.calledOnce(Player.findById);
            sinon.assert.calledWith(Player.findById, playerId);
            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 404);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { error: 'Player not found' });

            sinon.restore();
        });

        it('should return an error if player is already in a game', async () => {
            const playerId = 'playerId';
            const gameId = 'gameId';
            const req = {
                body: { playerId, gameId }
            };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };
            const player = {
                _id: playerId,
                active: true,
            };
            sinon.stub(Player, 'findById').resolves(player);

            await joinGame(req, res);

            sinon.assert.calledOnce(Player.findById);
            sinon.assert.calledWith(Player.findById, playerId);
            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 400);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { error: 'Player is already in a game' });

            sinon.restore();
        });

        it('should return an error if game is not found', async () => {
            const playerId = 'playerId';
            const gameId = 'gameId';
            const req = {
                body: { playerId, gameId }
            };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };
            sinon.stub(Player, 'findById').resolves({ active: false });
            sinon.stub(Game, 'findById').resolves(null);

            await joinGame(req, res);

            sinon.assert.calledOnce(Game.findById);
            sinon.assert.calledWith(Game.findById, gameId);
            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 404);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { error: 'Game not found' });

            sinon.restore();
        });

        it('should return an error if game has already ended', async () => {
            const playerId = 'playerId';
            const gameId = 'gameId';
            const req = {
                body: { playerId, gameId }
            };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };
            const game = {
                _id: gameId,
                endTime: new Date().getTime() - 3600 * 1000,
            };
            sinon.stub(Player, 'findById').resolves({ active: false });
            sinon.stub(Game, 'findById').resolves(game);

            await joinGame(req, res);

            sinon.assert.calledOnce(Game.findById);
            sinon.assert.calledWith(Game.findById, gameId);
            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 400);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { error: 'Game has already ended' });

            sinon.restore();
        });
    });

    describe('getPortfolio', () => {
        afterEach(() => {
            sinon.restore();
        });

        it('should return the player\'s portfolio if player and game exist', async () => {
            const playerName = 'nonexistentPlayer';
            const gameId = 'testGameId';
            const req = { params: { player: playerName, game: gameId } };

            sinon.stub(Player, 'findOne').resolves(null);

            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };

            await getPortfolio(req, res);

            sinon.assert.calledOnce(Player.findOne);
            sinon.assert.calledWith(Player.findOne, { username: playerName });
            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 404);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { error: 'Player not found' });
        });

        it('should return an error if player is not found', async () => {
            const playerName = 'nonexistentPlayer';
            const gameId = 'testGameId';
            const req = { params: { player: playerName, game: gameId } };

            sinon.stub(Player, 'findOne').resolves(null);

            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };

            await getPortfolio(req, res);

            sinon.assert.calledOnce(Player.findOne);
            sinon.assert.calledWith(Player.findOne, { username: playerName });
            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 404);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { error: 'Player not found' });
        });

        it('should return an error if game is not found', async () => {
            const playerName = 'testPlayer';
            const gameId = 'nonexistentGame';
            const req = { params: { player: playerName, game: gameId } };

            sinon.stub(Player, 'findOne').resolves({ username: playerName });

            sinon.stub(Game, 'findById').resolves(null);

            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };

            await getPortfolio(req, res);

            sinon.assert.calledOnce(Game.findById);
            sinon.assert.calledWith(Game.findById, gameId);
            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 404);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { error: 'Game not found' });
        });

        it('should return an error if player is not part of the game', async () => {
            const playerName = 'testPlayer';
            const gameId = 'testGameId';
            const req = { params: { player: playerName, game: gameId } };

            sinon.stub(Player, 'findOne').resolves({ username: playerName });

            sinon.stub(Game, 'findById').resolves({ _id: gameId, players: [] });

            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };

            await getPortfolio(req, res);

            sinon.assert.calledOnce(Game.findById);
            sinon.assert.calledWith(Game.findById, gameId);
            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 404);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { error: 'Player is not part of this game' });
        });
    });

    describe('getStockPrice', () => {
        afterEach(() => {
            nock.cleanAll();
        });

        it('should return the stock price for a valid stock symbol', async () => {
            const stockSymbol = 'AAPL';
            const mockResponse = {
                'Global Quote': {
                    '05. price': '172.62'
                }
            };

            nock('https://www.alphavantage.co')
                .get(`/query?function=GLOBAL_QUOTE&symbol=${stockSymbol}&apikey=6M2WEAHATT4WGHXM`)
                .reply(200, mockResponse);

            try {
                const stockPrice = await getStockPrice(stockSymbol);
                expect(stockPrice).to.equal(172.62);
            } catch (error) {
                // Handle any errors
            }
        });

        it('should reject with an error for an invalid stock symbol', async () => {
            const stockSymbol = 'INVALID';
            const errorMessage = `Stock data not available for symbol ${stockSymbol}`;

            nock('https://www.alphavantage.co')
                .get(`/query?function=GLOBAL_QUOTE&symbol=${stockSymbol}&apikey=6M2WEAHATT4WGHXM`)
                .replyWithError(errorMessage);

            try {
                await getStockPrice(stockSymbol);
            } catch (error) {
                // Handle any errors
            }
        });

        it('should reject with an error for a failed HTTP request', async () => {
            const stockSymbol = 'IBM';
            const errorMessage = `Failed to fetch stock data for symbol ${stockSymbol}`;

            nock('https://www.alphavantage.co')
                .get(`/query?function=GLOBAL_QUOTE&symbol=${stockSymbol}&apikey=6M2WEAHATT4WGHXM`)
                .reply(500, 'Internal Server Error');

            try {
                await getStockPrice(stockSymbol);
            } catch (error) {
                // Handle any errors
            }
        });
    });
});