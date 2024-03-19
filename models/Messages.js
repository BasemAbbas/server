const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  player1: {
    type: String,
    ref: 'Player',
  },
  player2: {
    type: String,
    ref: 'Player',
  },
  messages: [
    {
      sender: String, 
      content: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;