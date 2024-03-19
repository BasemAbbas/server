const express = require('express');
const router = express.Router();
const {
    registerAdmin,
    loginAdmin,
    createGame,
    viewActiveGames,
    editStartingTime,
    editStartingAmount,
    declareWinner
} = require('../controllers/AdminController');

// Register as an admin
router.post('/register', registerAdmin);

// Login as an admin
router.post('/login', loginAdmin);

// Create a game
router.post('/createGame', createGame);

// View all active games
router.get('/viewActiveGames', viewActiveGames);

// Edit starting time for a game
router.put('/editStartingTime/:gameId', editStartingTime);

// Edit starting amount for a game
router.put('/editStartingAmount/:gameId', editStartingAmount);

// Declare winner for a game by ID
router.put('/declareWinner/:gameId', declareWinner);

module.exports = router;