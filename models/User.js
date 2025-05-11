const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    walletBalance: {
        type: Number,
        default: 50000 // Initial balance of Rs 50,000
    },
    transactions: [{
        type: {
            type: String,
            enum: ['CREDIT', 'DEBIT'],
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        description: String,
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking'
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Method to add money to wallet
userSchema.methods.addMoney = async function (amount, description) {
    this.walletBalance += amount;
    this.transactions.push({
        type: 'CREDIT',
        amount,
        description
    });
    return this.save();
};

// Method to deduct money from wallet
userSchema.methods.deductMoney = async function (amount, description, bookingId) {
    if (this.walletBalance < amount) {
        throw new Error('Insufficient balance');
    }

    this.walletBalance -= amount;
    this.transactions.push({
        type: 'DEBIT',
        amount,
        description,
        bookingId
    });

    return this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User; 