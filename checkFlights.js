const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Flight = require('./models/Flight');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/flight-booking')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB:', err));

async function checkFlights() {
    try {
        // Count total flights
        const totalFlights = await Flight.countDocuments({});
        console.log(`Total flights in database: ${totalFlights}`);

        // Check if there are flights between Delhi and Mumbai
        const delhiToMumbai = await Flight.countDocuments({
            'from.code': 'DEL',
            'to.code': 'BOM'
        });
        console.log(`Flights from Delhi to Mumbai: ${delhiToMumbai}`);

        // Get sample flights
        const sampleFlights = await Flight.find().limit(3);
        console.log('Sample flights:');
        sampleFlights.forEach(flight => {
            console.log(`- ${flight.airline} ${flight.flightNumber}: ${flight.from.city} to ${flight.to.city}, Departure: ${flight.departureTime}`);
        });

        // Get all unique from-to pairs
        const routes = await Flight.aggregate([
            {
                $group: {
                    _id: { from: '$from.code', to: '$to.code' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);
        console.log('Available routes:');
        routes.forEach(route => {
            console.log(`- ${route._id.from} to ${route._id.to}: ${route.count} flights`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error checking flights:', error);
        process.exit(1);
    }
}

checkFlights(); 