const express = require('express');

const {createMessage, getChatMessages, sendMessage} = require('../controllers/MessagesController');

const router = express.Router();

// Creste a message
router.post('/createMessage', createMessage);

// Send a message
router.post('/sendMessage', sendMessage);

// View messages
router.get('/viewMessages', getChatMessages);

module.exports = router;