const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const gameSchema = new Schema({
    startingTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    players: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player'
    }],
    startingAmount: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model('Game', gameSchema);