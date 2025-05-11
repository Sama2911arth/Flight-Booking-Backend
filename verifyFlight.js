const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Flight = require('./models/Flight');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/flight-booking')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB:', err));

async function verifyFlight() {
    try {
        // Check the specific flight for DEL-BOM on May 29, 2025
        const date = new Date('2025-05-29');
        const startOfDay = new Date(new Date(date).setHours(0, 0, 0, 0));
        const endOfDay = new Date(new Date(date).setHours(23, 59, 59, 999));

        console.log(`Verifying flights for DEL-BOM on ${date.toISOString().split('T')[0]}`);

        // First, get the flight without time constraints to confirm it exists
        const flight = await Flight.findOne({
            'from.code': 'DEL',
            'to.code': 'BOM',
            airline: 'Vistara',
            flightNumber: 'UK-3079'
        });

        if (flight) {
            console.log('\nFound the flight in the database:');
            console.log(`- ID: ${flight._id}`);
            console.log(`- Airline: ${flight.airline}`);
            console.log(`- Flight Number: ${flight.flightNumber}`);
            console.log(`- From: ${flight.from.city} (${flight.from.code})`);
            console.log(`- To: ${flight.to.city} (${flight.to.code})`);
            console.log(`- Departure: ${flight.departureTime}`);
            console.log(`- Arrival: ${flight.arrivalTime}`);
            console.log(`- Price: ₹${flight.currentPrice}`);

            // Now check if it's actually on May 29
            const flightDate = new Date(flight.departureTime);
            const flightDateStr = flightDate.toISOString().split('T')[0];

            console.log(`\nFlight date: ${flightDateStr}`);
            console.log(`Expected date: 2025-05-29`);
            console.log(`Matches expected date: ${flightDateStr === '2025-05-29'}`);

            // Check if the flight would be found with the search query
            const searchQuery = {
                'from.code': 'DEL',
                'to.code': 'BOM',
                departureTime: {
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            };

            console.log('\nTesting search query:');
            console.log(JSON.stringify(searchQuery, null, 2));

            const searchResult = await Flight.find(searchQuery);
            console.log(`\nSearch results: ${searchResult.length} flights found`);

            if (searchResult.length > 0) {
                searchResult.forEach(flight => {
                    console.log(`- ${flight.airline} ${flight.flightNumber}: ${flight.departureTime}`);
                });
            }

            // Check if there's an issue with the date comparison
            console.log('\nDebugging date comparison:');
            console.log(`Flight departure time: ${flight.departureTime}`);
            console.log(`Start of day: ${startOfDay}`);
            console.log(`End of day: ${endOfDay}`);
            console.log(`Is flight departure >= start of day: ${flight.departureTime >= startOfDay}`);
            console.log(`Is flight departure <= end of day: ${flight.departureTime <= endOfDay}`);

            // Check timezone issues
            console.log('\nTimezone information:');
            console.log(`Flight departure timezone offset: ${flightDate.getTimezoneOffset()}`);
            console.log(`Search date timezone offset: ${date.getTimezoneOffset()}`);
        } else {
            console.log('Flight Vistara UK-3079 not found in the database');

            // Check if there are any DEL-BOM flights
            const anyFlights = await Flight.find({
                'from.code': 'DEL',
                'to.code': 'BOM'
            });

            console.log(`\nTotal DEL-BOM flights in database: ${anyFlights.length}`);

            if (anyFlights.length > 0) {
                console.log('\nAvailable DEL-BOM flights:');
                anyFlights.forEach(flight => {
                    console.log(`- ${flight.airline} ${flight.flightNumber}: ${flight.departureTime}`);
                });
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error verifying flight:', error);
        process.exit(1);
    }
}

verifyFlight(); 