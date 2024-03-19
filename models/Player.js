const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const transactionSchema = new Schema({
   
    type: {
        type: String,
        enum: ['buy', 'sell'],
        required: true
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    stockPrice: {
        type: Number,
        required: true
    },
    playerUsername: {
        type: String,
        required: true
    },
    stockName: {
        type: String,
        required: true
    },
    cost: {
        type: Number,
        required: true
    }
});

const playerSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    fullName: {
        type: String,
    },
    portfolio: {
        holdings: [{
            stockSymbol: {
                type: String,
                required: true
            },
            quantity: {
                type: Number,
                required: true
            },
            stockPrice: {
                type: Number,
                required: true
            }
        }],
        cash: {
            type: Number,
            default: 0
        }
    },
    portfolioHistory: [{
        holdings: [{
            stockSymbol: String,
            quantity: Number,
            stockPrice: Number
        }],
        cash: Number,
        timestamp: Date
    }],
    transactions: [transactionSchema],
    active: {
        type: Boolean,
        default: true
    },
    watchlist: [{
        type: String
    }],
    notifications: [{
        type: String
    }],
    gamesWon: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);