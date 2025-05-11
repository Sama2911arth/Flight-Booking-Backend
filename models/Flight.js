const mongoose = require('mongoose');

const flightSchema = new mongoose.Schema({
    airline: {
        type: String,
        required: true,
        enum: ['Indigo', 'SpiceJet', 'Air India', 'Vistara']
    },
    flightNumber: {
        type: String,
        required: true,
        unique: true
    },
    from: {
        code: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        city: String
    },
    to: {
        code: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        city: String
    },
    departureTime: {
        type: Date,
        required: true
    },
    arrivalTime: {
        type: Date,
        required: true
    },
    basePrice: {
        type: Number,
        required: true,
        min: 2000,
        max: 3000
    },
    currentPrice: {
        type: Number,
        required: true
    },
    bookingAttempts: [{
        timestamp: {
            type: Date,
            default: Date.now
        },
        sessionId: String
    }],
    availableSeats: {
        type: Number,
        default: 60
    }
}, {
    timestamps: true
});

// Method to update price based on booking attempts
flightSchema.methods.updatePrice = function () {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    // Get attempts in last 5 minutes
    const recentAttempts = this.bookingAttempts.filter(
        attempt => attempt.timestamp > fiveMinutesAgo
    );

    // Remove attempts older than 10 minutes
    this.bookingAttempts = this.bookingAttempts.filter(
        attempt => attempt.timestamp > tenMinutesAgo
    );

    // Increase price by 10% if 3 or more attempts
    if (recentAttempts.length >= 3) {
        this.currentPrice = Math.round(this.basePrice * 1.1);
    } else {
        this.currentPrice = this.basePrice;
    }

    return this.save();
};

const Flight = mongoose.model('Flight', flightSchema);

module.exports = Flight; 