const express = require('express')

const {
    signUp,
    login,
    joinGame,
    viewPortfolio,
    sellStock,
    buyStock,
    getLeaderboard,
    getPortfolio
} = require('../controllers/PlayerController')

const router = express.Router();

// Register as a player
router.post('/register', signUp);

// Login as a player
router.post('/login', login)

// Route to allow a player to join a game
router.post('/joinGame', joinGame);

router.get('/viewPortfolio', viewPortfolio);

// Buy a stock
router.post('/transaction/buy', async (req, res) => {
    const { playerId, stockSymbol, quantity } = req.body;

    if (!playerId || !stockSymbol || !quantity) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await buyStock(playerId, stockSymbol, quantity);

    if (result.success) {
        res.status(200).json({ message: 'Stock bought successfully' });
    } else {
        res.status(400).json({ error: result.error });
    }
});

// Sell a stock
router.post('/transaction/sell', async (req, res) => {
    const { playerId, stockSymbol, quantity } = req.body;

    if (!playerId || !stockSymbol || !quantity) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await sellStock(playerId, stockSymbol, quantity);

    if (result.success) {
        res.status(200).json({ message: 'Stock sold successfully' });
    } else {
        res.status(400).json({ error: result.error });
    }
});

// Get leaderboard for a specific game
router.get('/getLeaderboard/:gameId', getLeaderboard);

// Get portfolio
router.get('/portfolio/:player/:game', getPortfolio);

module.exports = router