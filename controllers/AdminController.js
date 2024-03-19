const Admin = require('../models/Admin');
const Game = require('../models/Game');
const Player = require('../models/Player');
const bcrypt = require('bcrypt');

const registerAdmin = async (req, res) => {
    const { username, email, password, fullName } = req.body;

    try {
        const existingAdmin = await Admin.findOne({ $or: [{ username }, { email }] });
        if (existingAdmin) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = new Admin({
            username,
            email,
            password: hashedPassword,
            fullName
        });

        await newAdmin.save();

        res.status(201).json({ message: 'Admin registered successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const loginAdmin = async (req, res) => {
    const { username, password } = req.body;

    try {
        const admin = await Admin.findOne({ username });

        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, admin.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        res.status(200).json({ message: 'Admin logged in successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const createGame = async (req, res) => {
    const { startingTime, endTime, startingAmount } = req.body;

    try {
        const newGame = new Game({
            startingTime,
            endTime,
            startingAmount,
            players: []
        });

        await newGame.save();
        const players = await Player.find({});
        const notificationMessage = `A new game has been created with starting time: ${startingTime}`;
        players.forEach(async (player) => {
            player.notifications.push(notificationMessage);
            await player.save();
        });

        res.status(201).json({ message: 'Game created successfully', game: newGame });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const editStartingTime = async (req, res) => {
    const { gameId } = req.params;
    const { startingTime } = req.body;

    try {
        const game = await Game.findById(gameId);

        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        const currentTime = new Date();
        if (currentTime >= game.startingTime) {
            return res.status(400).json({ error: 'Cannot edit starting time because the game has already started' });
        }

        const newStartingTime = new Date(startingTime);
        if (newStartingTime <= currentTime) {
            return res.status(400).json({ error: 'New starting time cannot be in the past' });
        }

        game.startingTime = newStartingTime;
        await game.save();

        return res.status(200).json({ message: 'Starting time updated successfully', game });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};


const editStartingAmount = async (req, res) => {
    const { gameId } = req.params;
    const { startingAmount } = req.body;

    try {
        const game = await Game.findById(gameId);

        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        const currentTime = new Date();
        if (currentTime >= game.startingTime) {
            return res.status(400).json({ error: 'Cannot edit starting amount because the game has already started' });
        }

        game.startingAmount = startingAmount;
        await game.save();

        res.status(200).json({ message: 'Starting amount updated successfully', game });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const viewActiveGames = async (req, res) => {
    try {
        const currentDate = new Date();

        const activeGames = await Game.find({
            startingTime: { $lte: currentDate },
            endTime: { $gte: currentDate }
        });

        res.status(200).json(activeGames);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const declareWinner = async (req, res) => {
    try {
        const gameId = req.params.gameId;

        const game = await Game.findById(gameId).populate('players', 'username portfolio');

        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        const currentTime = new Date();
        if (currentTime < game.endTime) {
            return res.status(400).json({ error: 'Game has not ended yet' });
        }

        const playerPortfolioValues = await Promise.all(game.players.map(async player => {
            const portfolioValue = calculatePortfolioValue(player.portfolio);
            return { playerId: player._id, username: player.username, portfolioValue };
        }));

        let winner = null;
        let maxPortfolioValue = -Infinity;
        playerPortfolioValues.forEach(({ playerId, username, portfolioValue }) => {
            if (portfolioValue > maxPortfolioValue) {
                winner = { playerId, username };
                maxPortfolioValue = portfolioValue;
            }
        });

        game.winner = winner.playerId;
        await game.save();

        return res.status(200).json({ message: 'Winner declared successfully', winner: winner.username });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const calculatePortfolioValue = (portfolio) => {
    let totalValue = portfolio.cash;
    portfolio.holdings.forEach(holding => {
        totalValue += holding.quantity * holding.stockPrice;
    });
    return totalValue;
};

module.exports = {
    registerAdmin,
    loginAdmin,
    createGame,
    viewActiveGames,
    editStartingTime,
    editStartingAmount,
    declareWinner //TODO
};