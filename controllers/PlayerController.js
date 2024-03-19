const Player = require('../models/Player');
const Game = require('../models/Game');
const bcrypt = require('bcrypt');
const request = require('request');

const signUp = async (req, res) => {
    const { username, password, email } = req.body;

    try {
        const existingPlayer = await Player.findOne({ $or: [{ username }, { email }] });
        if (existingPlayer) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newPlayer = new Player({
            username,
            password: hashedPassword,
            email,
            fullName: '',
            portfolio: { holdings: [], cash: 1000 },
            portfolioHistory: { holdings: [], cash: 0 },
            transactions: [],
            active: false,
            watchlist: [],
            notifications: [],
            gamesWon: 0
        });

        await newPlayer.save();

        res.status(201).json({ message: 'Player registered successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        const player = await Player.findOne({ username });

        if (!player) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const passwordMatch = await bcrypt.compare(password, player.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        res.status(200).json({ message: 'Login successful', player });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const joinGame = async (req, res) => {
    const { playerId, gameId } = req.body;

    try {
        const player = await Player.findById(playerId);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        if (player.active) {
            return res.status(400).json({ error: 'Player is already in a game' });
        }

        const game = await Game.findById(gameId);
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        const currentTime = new Date();
        if (game.endTime <= currentTime) {
            return res.status(400).json({ error: 'Game has already ended' });
        }

        player.portfolio.holdings = [];
        player.transactions = [];
        player.portfolio.cash = game.startingAmount;
        player.portfolioHistory = [];

        game.players.push(playerId);
        await game.save();

        player.active = true;
        // Notify the player with the ending time of the game
        const notificationMessage = `You have joined a game ending on: ${game.endTime}`;
        player.notifications.push(notificationMessage);
        await player.save();

        res.status(200).json({ message: 'Player joined the game successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getStockData = (symbol, interval = '1min', queryFunction) => {
    let apiUrl;
    if (queryFunction === 'TIME_SERIES_INTRADAY') {
        apiUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&apikey=${'6M2WEAHATT4WGHXM'}`;
    } else if (queryFunction === 'GLOBAL_QUOTE') {
        apiUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${'6M2WEAHATT4WGHXM'}`;
    } else {
        return Promise.reject('Invalid query function');
    }

    return new Promise((resolve, reject) => {
        request.get({
            url: apiUrl,
            json: true,
            headers: { 'User-Agent': 'request' }
        }, (err, response, data) => {
            if (err) {
                console.error('Error:', err);
                reject('Internal Server Error');
            } else if (response.statusCode !== 200) {
                console.error('Status:', response.statusCode);
                reject('Failed to fetch data');
            } else {
                resolve(data);
            }
        });
    });
};

const viewPortfolio = async (req, res) => {
    const { player: playerName, game: gameId } = req.query;

    try {
        const player = await Player.findOne({ name: playerName, gameId: gameId });
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        const portfolio = player.portfolio;

        const updatedPortfolio = await Promise.all(portfolio.map(async (stock) => {
            const stockData = await getStockData(stock.symbol, 'GLOBAL_QUOTE');
            if (stockData && stockData['Global Quote']) {
                const latestPrice = parseFloat(stockData['Global Quote']['05. price']);
                const currentValue = latestPrice * stock.quantity;
                return {
                    symbol: stock.symbol,
                    quantity: stock.quantity,
                    latestPrice: latestPrice,
                    currentValue: currentValue
                };
            } else {
                return null;
            }
        }));

        const filteredPortfolio = updatedPortfolio.filter(stock => stock !== null);

        res.status(200).json({ portfolio: filteredPortfolio });
    } catch (error) {
        console.error(error); // Log the error
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const buyStock = async (playerId, stockSymbol, quantity) => {
    try {
        const stockPrice = await getStockPrice(stockSymbol);

        const player = await Player.findById(playerId);
        if (!player) {
            throw new Error('Player not found');
        }

        if (!player.active) {
            throw new Error('Player is not active');
        }

        const totalPrice = stockPrice * quantity;
        if (player.portfolio.cash < totalPrice + 1) {
            throw new Error('Insufficient funds');
        }
        player.portfolioHistory.push({ holdings: player.portfolio.holdings, cash: player.portfolio.cash });
        player.portfolio.cash -= 1;
        player.portfolio.cash -= totalPrice;

        const existingHoldingsIndex = player.portfolio.holdings.findIndex(holding => holding.stockSymbol === stockSymbol);

        if (existingHoldingsIndex !== -1) {
            player.portfolio.holdings[existingHoldingsIndex].quantity += quantity;
        } else {
            player.portfolio.holdings.push({ stockSymbol, quantity, stockPrice });
        }

        player.transactions.push({
            type: 'buy',
            date: new Date(),
            stockPrice,
            playerUsername: player.username,
            stockName: stockSymbol,
            cost: totalPrice
        });

        await player.save();
        return { success: true };
    } catch (error) {
        console.error('Buy stock error:', error);
        return { success: false, error: error.message };
    }
};

const sellStock = async (playerId, stockSymbol, quantity) => {
    try {
        const stockPrice = await getStockPrice(stockSymbol);

        const player = await Player.findById(playerId);
        if (!player) {
            throw new Error('Player not found');
        }

        if (!player.active) {
            throw new Error('Player is not active');
        }

        const holdingIndex = player.portfolio.holdings.findIndex(holding => holding.stockSymbol === stockSymbol);

        if (holdingIndex === -1 || player.portfolio.holdings[holdingIndex].quantity < quantity) {
            throw new Error('Insufficient holdings');
        }
        player.portfolioHistory.push({ holdings: player.portfolio.holdings, cash: player.portfolio.cash });

        player.portfolio.cash -= 1;

        const totalPrice = stockPrice * quantity;

        player.portfolio.cash += totalPrice;

        player.portfolio.holdings[holdingIndex].quantity -= quantity;

        if (player.portfolio.holdings[holdingIndex].quantity === 0) {
            player.portfolio.holdings.splice(holdingIndex, 1);
        }

        player.transactions.push({
            type: 'sell',
            date: new Date(),
            stockPrice,
            playerUsername: player.username,
            stockName: stockSymbol,
            cost: totalPrice
        });

        await player.save();
        return { success: true };
    } catch (error) {
        console.error('Sell stock error:', error);
        return { success: false, error: error.message };
    }
};

const getStockPrice = async (stockSymbol) => {
    return new Promise((resolve, reject) => {
        const apiUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${stockSymbol}&apikey=6M2WEAHATT4WGHXM`;
        request.get({
            url: apiUrl,
            json: true,
            headers: { 'User-Agent': 'request' }
        }, (err, response, data) => {
            if (err || response.statusCode !== 200) {
                reject(err || new Error(`Failed to fetch stock data for symbol ${stockSymbol}`));
            } else {
                const stockData = data['Global Quote'];
                if (!stockData || !stockData['05. price']) {
                    reject(new Error(`Stock data not available for symbol ${stockSymbol}`));
                } else {
                    resolve(parseFloat(stockData['05. price']));
                }
            }
        });
    });
};

const getLeaderboard = async (req, res) => {
    const gameId = req.params.gameId;

    try {
        const game = await Game.findById(gameId);
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        const playerDetails = await Promise.all(game.players.map(async playerId => {
            const player = await Player.findById(playerId);
            if (!player) {
                return { username: 'Unknown', portfolioValue: 0 };
            }
            const portfolioValue = calculatePortfolioValue(player.portfolio);
            return { username: player.username, portfolioValue };
        }));

        playerDetails.sort((a, b) => b.portfolioValue - a.portfolioValue);

        const leaderboard = playerDetails.map(player => ({ username: player.username }));

        res.status(200).json({ leaderboard });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const calculatePortfolioValue = (portfolio) => {
    let totalValue = portfolio.cash;
    portfolio.holdings.forEach(holding => {
        totalValue += holding.quantity * holding.stockPrice;
    });
    return totalValue;
};

const getPortfolio = async (req, res) => {
    const { player: playerName, game: gameId } = req.params;

    try {
        const player = await Player.findOne({ username: playerName });
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        const game = await Game.findById(gameId);
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        if (!game.players.includes(player._id)) {
            return res.status(404).json({ error: 'Player is not part of this game' });
        }

        const portfolioDetails = await Promise.all(player.portfolio.holdings.map(async holding => {
            const stockPrice = await getStockPrice(holding.stockSymbol);
            const currentValue = stockPrice * holding.quantity;
            return { stockSymbol: holding.stockSymbol, quantity: holding.quantity, currentValue };
        }));

        res.status(200).json({ player: playerName, portfolio: portfolioDetails });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    signUp,
    login,
    joinGame,
    viewPortfolio,
    sellStock, //TODO
    buyStock, //TODO
    getLeaderboard, //TODO
    getPortfolio,
    getStockPrice
};