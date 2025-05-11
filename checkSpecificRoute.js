const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Flight = require('./models/Flight');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/flight-booking')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB:', err));

async function checkSpecificRoute() {
    try {
        // Define the route
        const fromCode = 'DEL';
        const toCode = 'BOM';

        // Define the date - using a date we know has flights (2025-05-11)
        const searchDate = new Date('2025-05-11T00:00:00Z');
        const startOfDay = new Date(new Date(searchDate).setHours(0, 0, 0, 0));
        const endOfDay = new Date(new Date(searchDate).setHours(23, 59, 59, 999));

        console.log(`Checking flights from ${fromCode} to ${toCode} on ${searchDate.toISOString().split('T')[0]}`);

        // Build the query
        const query = {
            'from.code': fromCode,
            'to.code': toCode,
            departureTime: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        };

        console.log('Query:', JSON.stringify(query, null, 2));

        // Execute the query
        const flights = await Flight.find(query);

        console.log(`Found ${flights.length} flights`);

        if (flights.length > 0) {
            flights.forEach(flight => {
                console.log(`- ${flight.airline} ${flight.flightNumber}: Departure: ${flight.departureTime}, Price: ₹${flight.currentPrice}`);
            });
        }

        // If no flights found on this route for this date, check if there are flights on this route for any date
        if (flights.length === 0) {
            const allRouteFlights = await Flight.find({
                'from.code': fromCode,
                'to.code': toCode
            });

            console.log(`\nFlights from ${fromCode} to ${toCode} on any date: ${allRouteFlights.length}`);

            if (allRouteFlights.length > 0) {
                allRouteFlights.forEach(flight => {
                    console.log(`- ${flight.airline} ${flight.flightNumber}: Departure: ${flight.departureTime}, Price: ₹${flight.currentPrice}`);
                });
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error checking specific route:', error);
        process.exit(1);
    }
}

checkSpecificRoute(); 