const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Flight = require('./models/Flight');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/flight-booking')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB:', err));

async function testSearch() {
    try {
        // Define search parameters
        const from = 'DEL';
        const to = 'BOM';

        // Test with current date
        const currentDate = new Date();
        const currentDateStr = currentDate.toISOString().split('T')[0];

        // Test with a date in 2025 (based on our previous findings)
        const date2025 = new Date('2025-05-11');
        const date2025Str = date2025.toISOString().split('T')[0];

        console.log('Testing search with parameters:');
        console.log(`- From: ${from}`);
        console.log(`- To: ${to}`);
        console.log(`- Current date: ${currentDateStr}`);
        console.log(`- 2025 date: ${date2025Str}`);

        // Create date range for current date
        const startOfCurrentDay = new Date(new Date(currentDate).setHours(0, 0, 0, 0));
        const endOfCurrentDay = new Date(new Date(currentDate).setHours(23, 59, 59, 999));

        // Create date range for 2025 date
        const startOf2025Day = new Date(new Date(date2025).setHours(0, 0, 0, 0));
        const endOf2025Day = new Date(new Date(date2025).setHours(23, 59, 59, 999));

        // Query for current date
        const currentDateQuery = {
            'from.code': from,
            'to.code': to,
            departureTime: {
                $gte: startOfCurrentDay,
                $lte: endOfCurrentDay
            }
        };

        // Query for 2025 date
        const date2025Query = {
            'from.code': from,
            'to.code': to,
            departureTime: {
                $gte: startOf2025Day,
                $lte: endOf2025Day
            }
        };

        // Execute queries
        const currentDateFlights = await Flight.find(currentDateQuery);
        const date2025Flights = await Flight.find(date2025Query);

        console.log(`\nFlights found for current date (${currentDateStr}): ${currentDateFlights.length}`);
        console.log(`Flights found for 2025 date (${date2025Str}): ${date2025Flights.length}`);

        // Check if there are any flights for the route regardless of date
        const routeQuery = {
            'from.code': from,
            'to.code': to
        };

        const routeFlights = await Flight.find(routeQuery).limit(5);

        console.log(`\nFlights found for route ${from}-${to} (any date): ${routeFlights.length}`);

        if (routeFlights.length > 0) {
            console.log('\nSample flights for this route:');
            routeFlights.forEach(flight => {
                console.log(`- ${flight.airline} ${flight.flightNumber}: Departure: ${flight.departureTime.toISOString()}, Price: ₹${flight.currentPrice}`);
            });
        }

        // Check all available dates for flights
        console.log('\nChecking all available flight dates in the database:');
        const allDates = await Flight.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: "$departureTime" },
                        month: { $month: "$departureTime" },
                        day: { $dayOfMonth: "$departureTime" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]);

        allDates.forEach(date => {
            console.log(`- ${date._id.year}-${date._id.month.toString().padStart(2, '0')}-${date._id.day.toString().padStart(2, '0')}: ${date.count} flights`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error testing search:', error);
        process.exit(1);
    }
}

testSearch(); 