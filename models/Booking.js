const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    flightId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Flight',
        required: false
    },
    flightDetails: {
        airline: String,
        flightNumber: String,
        from: {
            code: String,
            name: String,
            city: String
        },
        to: {
            code: String,
            name: String,
            city: String
        },
        departureTime: Date,
        arrivalTime: Date,
        price: Number
    },
    passengerDetails: {
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        }
    },
    bookingDate: {
        type: Date,
        default: Date.now
    },
    ticketNumber: {
        type: String,
        unique: true
    },
    price: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['CONFIRMED', 'CANCELLED'],
        default: 'CONFIRMED'
    }
}, {
    timestamps: true
});

// Generate ticket number before saving
bookingSchema.pre('save', function (next) {
    if (!this.ticketNumber) {
        const prefix = 'FLT';
        const timestamp = Date.now().toString().substring(7);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        this.ticketNumber = `${prefix}${timestamp}${random}`;
    }
    next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking; 