const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Flight = require('../models/Flight');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB:', err));

// Helper function to get a random price between 2000 and 3000
const getRandomPrice = () => Math.floor(Math.random() * (3000 - 2000 + 1)) + 2000;

// Helper function to generate a random duration in minutes (45 min to 4 hours)
const getRandomDuration = () => Math.floor(Math.random() * (240 - 45 + 1)) + 45;

// Generate a random flight number based on the airline
const generateFlightNumber = (airline) => {
    const prefixes = {
        'Indigo': '6E',
        'SpiceJet': 'SG',
        'Air India': 'AI',
        'Vistara': 'UK'
    };

    const prefix = prefixes[airline] || 'FL';
    // Add timestamp to ensure uniqueness
    const timestamp = Date.now().toString().slice(-4);
    const number = Math.floor(Math.random() * 9000) + 1000;

    return `${prefix}-${number}-${timestamp}`;
};

// Airlines to use
const airlines = ['Indigo', 'SpiceJet', 'Air India', 'Vistara'];

// Enhance flight data
const enhanceFlightData = async () => {
    try {
        console.log('Starting to enhance flight data...');

        // Get all unique routes with dates
        const uniqueRoutes = await Flight.aggregate([
            {
                $group: {
                    _id: {
                        fromCode: "$from.code",
                        toCode: "$to.code",
                        date: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$departureTime"
                            }
                        }
                    },
                    fromCity: { $first: "$from.city" },
                    fromName: { $first: "$from.name" },
                    toCity: { $first: "$to.city" },
                    toName: { $first: "$to.name" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.date": 1 } }
        ]);

        console.log(`Found ${uniqueRoutes.length} unique routes with dates`);

        // Store all routes for which flights were added
        const enhancedRoutes = [];

        // Process each unique route
        for (const route of uniqueRoutes) {
            const { fromCode, toCode, date } = route._id;
            const currentCount = route.count;

            console.log(`Route: ${fromCode} to ${toCode} on ${date} has ${currentCount} flights`);

            // Calculate how many flights to add to reach a total of 10
            const flightsToAdd = Math.max(10 - currentCount, 0);

            if (flightsToAdd > 0) {
                console.log(`Adding ${flightsToAdd} flights to ${fromCode} to ${toCode} on ${date}`);

                const baseDate = new Date(date);
                baseDate.setHours(0, 0, 0, 0);

                // Store the new flights to add
                const newFlights = [];

                for (let i = 0; i < flightsToAdd; i++) {
                    // Generate a departure time at a different hour (distribute throughout the day)
                    const departureHour = Math.floor(i * 24 / flightsToAdd);
                    const departureMinute = Math.floor(Math.random() * 60);

                    const departureTime = new Date(baseDate);
                    departureTime.setHours(departureHour, departureMinute, 0, 0);

                    // Get random airline and price
                    const airline = airlines[i % airlines.length]; // Distribute airlines evenly
                    const basePrice = getRandomPrice();

                    // Generate random duration and calculate arrival time
                    const durationMinutes = getRandomDuration();
                    const arrivalTime = new Date(departureTime);
                    arrivalTime.setMinutes(arrivalTime.getMinutes() + durationMinutes);

                    // Create flight object
                    const flight = new Flight({
                        airline,
                        flightNumber: generateFlightNumber(airline),
                        from: {
                            code: fromCode,
                            name: route.fromName,
                            city: route.fromCity
                        },
                        to: {
                            code: toCode,
                            name: route.toName,
                            city: route.toCity
                        },
                        departureTime,
                        arrivalTime,
                        basePrice,
                        currentPrice: basePrice,
                        availableSeats: Math.floor(Math.random() * 50) + 10
                    });

                    newFlights.push(flight);
                }

                // Save new flights to the database
                await Flight.insertMany(newFlights);

                // Add to enhanced routes list
                enhancedRoutes.push({
                    from: route.fromCity,
                    to: route.toCity,
                    date,
                    added: flightsToAdd,
                    total: currentCount + flightsToAdd
                });
            }
        }

        console.log('\nEnhanced routes summary:');
        enhancedRoutes.forEach(route => {
            console.log(`${route.from} to ${route.to} on ${route.date}: Added ${route.added} flights (Total: ${route.total})`);
        });

        console.log('\nFlight data enhancement completed!');
        process.exit(0);
    } catch (error) {
        console.error('Error enhancing flight data:', error);
        process.exit(1);
    }
};

// Run the enhancement function
enhanceFlightData(); 