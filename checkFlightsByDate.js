const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Flight = require('./models/Flight');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/flight-booking')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB:', err));

async function checkFlightsByDate() {
    try {
        // Get today's date
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Get tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // Get date 7 days from now
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        console.log(`Checking flights for dates: ${todayStr}, ${tomorrowStr}, ${nextWeekStr}`);

        // Check flights for today
        const startOfToday = new Date(today.setHours(0, 0, 0, 0));
        const endOfToday = new Date(today.setHours(23, 59, 59, 999));

        const todayFlights = await Flight.countDocuments({
            departureTime: {
                $gte: startOfToday,
                $lte: endOfToday
            }
        });

        console.log(`Flights for today (${todayStr}): ${todayFlights}`);

        // Check flights for tomorrow
        const startOfTomorrow = new Date(tomorrow.setHours(0, 0, 0, 0));
        const endOfTomorrow = new Date(tomorrow.setHours(23, 59, 59, 999));

        const tomorrowFlights = await Flight.countDocuments({
            departureTime: {
                $gte: startOfTomorrow,
                $lte: endOfTomorrow
            }
        });

        console.log(`Flights for tomorrow (${tomorrowStr}): ${tomorrowFlights}`);

        // Check flights for next week
        const startOfNextWeek = new Date(nextWeek.setHours(0, 0, 0, 0));
        const endOfNextWeek = new Date(nextWeek.setHours(23, 59, 59, 999));

        const nextWeekFlights = await Flight.countDocuments({
            departureTime: {
                $gte: startOfNextWeek,
                $lte: endOfNextWeek
            }
        });

        console.log(`Flights for next week (${nextWeekStr}): ${nextWeekFlights}`);

        // Check flights from Delhi to Mumbai for tomorrow
        const delhiToMumbaiTomorrow = await Flight.find({
            'from.code': 'DEL',
            'to.code': 'BOM',
            departureTime: {
                $gte: startOfTomorrow,
                $lte: endOfTomorrow
            }
        });

        console.log(`Flights from Delhi to Mumbai for tomorrow: ${delhiToMumbaiTomorrow.length}`);
        if (delhiToMumbaiTomorrow.length > 0) {
            delhiToMumbaiTomorrow.forEach(flight => {
                console.log(`- ${flight.airline} ${flight.flightNumber}: Departure: ${flight.departureTime}, Price: ₹${flight.currentPrice}`);
            });
        }

        // Check all departure dates in the database
        const allDepartureDates = await Flight.aggregate([
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

        console.log('Available departure dates:');
        allDepartureDates.forEach(date => {
            console.log(`- ${date._id.year}-${date._id.month.toString().padStart(2, '0')}-${date._id.day.toString().padStart(2, '0')}: ${date.count} flights`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error checking flights by date:', error);
        process.exit(1);
    }
}

checkFlightsByDate(); 