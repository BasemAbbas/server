const sinon = require('sinon');
const { expect } = import('chai');
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');
const Game = require('../models/Game');
const Player = require('../models/Player');
const {
    registerAdmin,
    loginAdmin,
    createGame,
    viewActiveGames,
    editStartingTime,
    editStartingAmount,
    declareWinner
} = require('../controllers/AdminController');

describe('AdminController', () => {
    describe('registerAdmin', () => {
        afterEach(() => {
            sinon.restore();
        });

        it('should register a new admin', async () => {
            const req = {
                body: {
                    username: 'testAdmin',
                    email: 'testAdmin@gmail.com',
                    password: 'testAdmin',
                    fullName: 'Full Name'
                }
            };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };
            sinon.stub(Admin, 'findOne').resolves(null);
            sinon.stub(bcrypt, 'hash').resolves('hashedPassword');
            sinon.stub(Admin.prototype, 'save').resolves();

            await registerAdmin(req, res);

            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 201);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { message: 'Admin registered successfully' });

            sinon.restore();
        });

        it('should return an error if username or email already exists', async () => {
            const req = {
                body: {
                    username: 'testAdmin',
                    email: 'testAdmin@gmail.com',
                    password: 'testAdmin',
                    fullName: 'Full Name'
                }
            };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };
            sinon.stub(Admin, 'findOne').resolves({ username: 'testAdmin', email: 'testAdmin@gmail.com' });

            await registerAdmin(req, res);

            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 400);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { error: 'Username or email already exists' });

            sinon.restore();
        });
    });

    describe('loginAdmin', () => {
        afterEach(() => {
            sinon.restore();
        });

        it('should log in an existing admin', async () => {
            const req = {
                body: {
                    username: 'testAdmin',
                    password: 'testAdmin'
                }
            };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };
            sinon.stub(Admin, 'findOne').resolves({ username: 'testAdmin', password: 'hashedPassword' });
            sinon.stub(bcrypt, 'compare').resolves(true);

            await loginAdmin(req, res);

            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 200);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { message: 'Admin logged in successfully' });

            sinon.restore();
        });

        it('should return an error if admin not found', async () => {
            const req = {
                body: {
                    username: 'testAdmin',
                    password: 'testAdmin'
                }
            };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };
            sinon.stub(Admin, 'findOne').resolves(null);

            await loginAdmin(req, res);

            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 404);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { error: 'Admin not found' });

            sinon.restore();
        });

        it('should return an error if password is invalid', async () => {
            const req = {
                body: {
                    username: 'testAdmin',
                    password: 'testAdmin'
                }
            };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };
            sinon.stub(Admin, 'findOne').resolves({ username: 'testAdmin', password: 'hashedPassword' });
            sinon.stub(bcrypt, 'compare').resolves(false);

            await loginAdmin(req, res);

            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 401);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { error: 'Invalid password' });

            sinon.restore();
        });
    });

    describe('createGame', () => {
        afterEach(() => {
            sinon.restore();
        });

        it('should create a new game successfully', async () => {
            const req = {
                body: {
                    startingTime: new Date(),
                    endTime: new Date(),
                    startingAmount: 1000
                }
            };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };

            const saveStub = sinon.stub(Game.prototype, 'save').resolves();
            const findStub = sinon.stub(Player, 'find').resolves([]);

            await createGame(req, res);

            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 201);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { message: 'Game created successfully', game: sinon.match.object });

            sinon.assert.calledOnce(saveStub);
            sinon.assert.calledOnce(findStub);

            saveStub.restore();
            findStub.restore();
        });
    });

    describe('viewActiveGames', () => {
        afterEach(() => {
            sinon.restore();
        });

        it('should return active games when there are active games', async () => {
            const currentDate = new Date();
            const activeGames = [
                { startingTime: currentDate, endTime: new Date(currentDate.getTime() + 3600 * 1000) },
                { startingTime: new Date(currentDate.getTime() - 3600 * 1000), endTime: currentDate }
            ];

            sinon.stub(Game, 'find').resolves(activeGames);

            const req = {};
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };

            await viewActiveGames(req, res);

            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 200);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, sinon.match.array);

            Game.find.restore();
        });

        it('should return an empty array when there are no active games', async () => {
            sinon.stub(Game, 'find').resolves([]);

            const req = {};
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };

            await viewActiveGames(req, res);

            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 200);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, []);

            Game.find.restore();
        });
    });

    describe('editStartingTime', () => {
        afterEach(() => {
            sinon.restore();
        });

        it('should update the starting time of a game successfully', async () => {
            const gameId = 'gameId123';
            const startingTime = new Date('2025-06-15');
            const req = {
                params: { gameId },
                body: { startingTime: startingTime.toISOString() }
            };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };
            const game = { _id: gameId, startingTime, save: sinon.stub().resolves() };

            sinon.stub(Game, 'findById').resolves(game);

            await editStartingTime(req, res);

            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 200);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { message: 'Starting time updated successfully', game });

            sinon.restore();
        });

        it('should return 404 if the game is not found', async () => {
            const gameId = 'gameId123';
            const req = {
                params: { gameId },
                body: { startingTime: new Date().toISOString() }
            };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };

            sinon.stub(Game, 'findById').resolves(null);

            await editStartingTime(req, res);

            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 404);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { error: 'Game not found' });

            sinon.restore();
        });

        it('should return 400 if the new starting time is in the past', async () => {
            const gameId = 'gameId123';
            const pastStartingTime = new Date('2022-01-01').toISOString();
            const req = {
                params: { gameId },
                body: { startingTime: pastStartingTime }
            };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };
            const game = { _id: gameId, startingTime: new Date('2025-01-01') };

            sinon.stub(Game, 'findById').resolves(game);

            await editStartingTime(req, res);

            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 400);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { error: 'New starting time cannot be in the past' });

            sinon.restore();
        });

        it('should return 400 if the game has already started', async () => {
            const gameId = 'gameId123';
            const req = {
                params: { gameId },
                body: { startingTime: new Date().toISOString() }
            };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };
            const game = { _id: gameId, startingTime: new Date('2020-01-01') };

            sinon.stub(Game, 'findById').resolves(game);

            await editStartingTime(req, res);

            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 400);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { error: 'Cannot edit starting time because the game has already started' });

            sinon.restore();
        });
    });

    describe('editStartingAmount', () => {
        afterEach(() => {
            sinon.restore();
        });

        it('should update the starting amount of a game successfully', async () => {
            const gameId = 'gameId123';
            const newStartingAmount = 1500;
            const req = {
                params: { gameId },
                body: { startingAmount: newStartingAmount }
            };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };
            const game = { _id: gameId, startingAmount: 1000, save: sinon.stub().resolves() };

            sinon.stub(Game, 'findById').resolves(game);

            await editStartingAmount(req, res);

            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 200);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { message: 'Starting amount updated successfully', game });

            sinon.restore();
        });

        it('should return 404 if the game is not found', async () => {
            const gameId = 'gameId123';
            const req = {
                params: { gameId },
                body: { startingAmount: 1500 }
            };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };

            sinon.stub(Game, 'findById').resolves(null);

            await editStartingAmount(req, res);

            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 404);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(res.json, { error: 'Game not found' });

            sinon.restore();
        });
    });
});