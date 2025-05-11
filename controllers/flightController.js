const Flight = require('../models/Flight');

// Search flights based on criteria
exports.searchFlights = async (req, res) => {
    try {
        const { from, to, date, airlines, timeRange, priceRange } = req.query;

        console.log('Search parameters:', { from, to, date, airlines, timeRange, priceRange });

        // Create date range for the entire day, accounting for timezone
        const searchDate = new Date(date);

        // Use UTC to avoid timezone issues
        const startOfDay = new Date(Date.UTC(
            searchDate.getUTCFullYear(),
            searchDate.getUTCMonth(),
            searchDate.getUTCDate(),
            0, 0, 0, 0
        ));

        const endOfDay = new Date(Date.UTC(
            searchDate.getUTCFullYear(),
            searchDate.getUTCMonth(),
            searchDate.getUTCDate(),
            23, 59, 59, 999
        ));

        console.log('Date range:', {
            searchDate: searchDate.toISOString(),
            startOfDay: startOfDay.toISOString(),
            endOfDay: endOfDay.toISOString()
        });

        // First, check flights with just from and to
        const basicQuery = {
            'from.code': from,
            'to.code': to
        };

        const basicResults = await Flight.countDocuments(basicQuery);
        console.log('Flights matching basic from/to query:', basicResults);

        // If there are no flights for this route at all, return early
        if (basicResults === 0) {
            return res.status(200).json({
                flights: [],
                message: 'No flights available for this route',
                availableDates: []
            });
        }

        // Get all flights for this route
        const allRouteFlights = await Flight.find(basicQuery).limit(100); // Increase limit to get more flights

        // Filter flights that match the exact date (without flexibility)
        let flights = allRouteFlights.filter(flight => {
            const flightDate = new Date(flight.departureTime);
            return flightDate >= startOfDay && flightDate <= endOfDay;
        });

        console.log('Flights found with exact date match:', flights.length);

        // If no flights found for the date, get available dates
        if (flights.length === 0) {
            console.log('No flights found for the date, checking other dates');

            // Find available dates for this route
            const availableDates = await Flight.aggregate([
                {
                    $match: basicQuery
                },
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

            const formattedDates = availableDates.map(date => {
                return {
                    date: `${date._id.year}-${date._id.month.toString().padStart(2, '0')}-${date._id.day.toString().padStart(2, '0')}`,
                    count: date.count
                };
            });

            console.log('Available dates for this route:', formattedDates);

            return res.status(200).json({
                flights: [],
                message: 'No flights found for the selected date',
                availableDates: formattedDates
            });
        }

        // Make sure we have 10 flights for this route-date combination
        if (flights.length < 10) {
            console.log(`Only ${flights.length} flights found for this route-date, generating more to reach 10`);

            const additionalFlights = generateAdditionalFlights(
                flights,
                10 - flights.length,
                from,
                to,
                searchDate
            );

            flights = [...flights, ...additionalFlights];
        }

        // Sort all flights for this route-date by departure time
        flights.sort((a, b) =>
            new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
        );

        // Now apply filters to the complete set of flights
        let filteredFlights = [...flights];

        // Add airline filter if provided
        if (airlines && airlines.length > 0) {
            const airlineList = airlines.split(',');
            filteredFlights = filteredFlights.filter(flight =>
                airlineList.includes(flight.airline)
            );
            console.log('Flights after airline filter:', filteredFlights.length);
        }

        // Add time range filter if provided
        if (timeRange && timeRange !== 'all') {
            let startHour, endHour;

            switch (timeRange) {
                case 'morning':
                    startHour = 6;
                    endHour = 12;
                    break;
                case 'afternoon':
                    startHour = 12;
                    endHour = 18;
                    break;
                case 'evening':
                    startHour = 18;
                    endHour = 24;
                    break;
                case 'night':
                    startHour = 0;
                    endHour = 6;
                    break;
                default:
                    break;
            }

            if (startHour !== undefined && endHour !== undefined) {
                filteredFlights = filteredFlights.filter(flight => {
                    const flightDate = new Date(flight.departureTime);
                    const flightHour = flightDate.getHours();

                    // Handle overnight range (night: 0-6)
                    if (startHour > endHour) {
                        return flightHour >= startHour || flightHour < endHour;
                    }

                    return flightHour >= startHour && flightHour < endHour;
                });
                console.log('Flights after time range filter:', filteredFlights.length);
            }
        }

        // Add price range filter if provided
        if (priceRange && priceRange !== 'all') {
            const [min, max] = priceRange.split('-').map(Number);
            filteredFlights = filteredFlights.filter(flight =>
                flight.currentPrice >= min && flight.currentPrice <= max
            );
            console.log('Flights after price filter:', filteredFlights.length);
        }

        // If no flights match the filters, return an empty array with a message
        if (filteredFlights.length === 0) {
            return res.status(200).json({
                flights: [],
                message: 'No flights match your filter criteria',
                totalFlights: flights.length, // Show how many total flights exist without filters
                filterApplied: true
            });
        }

        // Return the filtered flights
        res.status(200).json(filteredFlights);
    } catch (error) {
        console.error('Error searching flights:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Helper function to generate additional flights with variations
function generateAdditionalFlights(existingFlights, count, fromCode, toCode, date) {
    if (existingFlights.length === 0) return [];

    const sampleFlight = existingFlights[0];
    const additionalFlights = [];

    // Airlines to use for variety
    const airlines = ['Indigo', 'SpiceJet', 'Air India', 'Vistara'];

    // Base date for the flights (midnight of the search date)
    const baseDate = new Date(date);
    baseDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < count; i++) {
        // Create a new flight based on the sample flight
        const newFlight = { ...JSON.parse(JSON.stringify(sampleFlight)) };

        // Generate unique ID (just for frontend, not saved to DB)
        newFlight._id = `generated_${Date.now()}_${i}`;

        // Vary the airline
        newFlight.airline = airlines[i % airlines.length];

        // Generate flight number with timestamp to ensure uniqueness
        const prefix = {
            'Indigo': '6E',
            'SpiceJet': 'SG',
            'Air India': 'AI',
            'Vistara': 'UK'
        }[newFlight.airline] || 'FL';
        const timestamp = Date.now().toString().slice(-4);
        const number = Math.floor(Math.random() * 9000) + 1000;
        newFlight.flightNumber = `${prefix}-${number}-${timestamp}`;

        // Vary departure time (distribute throughout the day)
        const departureHour = Math.floor(i * 24 / count); // Distribute evenly across 24 hours
        const departureMinute = Math.floor(Math.random() * 60);

        const departureTime = new Date(baseDate);
        departureTime.setHours(departureHour, departureMinute, 0, 0);
        newFlight.departureTime = departureTime.toISOString();

        // Vary duration between 1-3 hours
        const durationMinutes = 60 + Math.floor(Math.random() * 120); // 1 to 3 hours

        // Set arrival time based on duration
        const arrivalTime = new Date(departureTime);
        arrivalTime.setMinutes(arrivalTime.getMinutes() + durationMinutes);
        newFlight.arrivalTime = arrivalTime.toISOString();

        // Vary price between 2000-3000
        newFlight.basePrice = 2000 + Math.floor(Math.random() * 1000);
        newFlight.currentPrice = newFlight.basePrice;

        // Set available seats
        newFlight.availableSeats = 10 + Math.floor(Math.random() * 50);

        additionalFlights.push(newFlight);
    }

    return additionalFlights;
}

// Get flight by ID
exports.getFlightById = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if this is a generated flight ID
        if (id.startsWith('generated_')) {
            // Parse the generated ID to extract information
            const parts = id.split('_');

            // This is a generated flight - create a temporary flight object with the same structure
            // Get route information from query parameters
            const { fromCode, fromCity, fromName, toCode, toCity, toName, departureTime, arrivalTime, airline, price, flightNumber } = req.query;

            if (!fromCode || !toCode || !departureTime || !arrivalTime) {
                // If no query parameters are provided, we can't recreate the flight
                return res.status(404).json({
                    message: 'Generated flight not found. Missing required details.',
                    isGenerated: true
                });
            }

            // Recreate the flight object from query parameters
            const flight = {
                _id: id,
                airline: airline || 'Unknown Airline',
                flightNumber: flightNumber || `GEN-${Date.now().toString().slice(-4)}`,
                from: {
                    code: fromCode,
                    name: fromName || `${fromCity} Airport`,
                    city: fromCity || fromCode
                },
                to: {
                    code: toCode,
                    name: toName || `${toCity} Airport`,
                    city: toCity || toCode
                },
                departureTime: departureTime,
                arrivalTime: arrivalTime,
                basePrice: parseFloat(price) || 2500,
                currentPrice: parseFloat(price) || 2500,
                availableSeats: 20
            };

            return res.status(200).json(flight);
        }

        // If not a generated ID, find the flight in the database
        const flight = await Flight.findById(id);

        if (!flight) {
            return res.status(404).json({ message: 'Flight not found' });
        }

        res.status(200).json(flight);
    } catch (error) {
        console.error('Error getting flight:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Record booking attempt for dynamic pricing
exports.recordBookingAttempt = async (req, res) => {
    try {
        const { id } = req.params;
        const { sessionId } = req.body;

        const flight = await Flight.findById(id);

        if (!flight) {
            return res.status(404).json({ message: 'Flight not found' });
        }

        // Add booking attempt
        flight.bookingAttempts.push({
            timestamp: new Date(),
            sessionId
        });

        // Update price based on booking attempts
        await flight.updatePrice();

        res.status(200).json({
            message: 'Booking attempt recorded',
            currentPrice: flight.currentPrice
        });
    } catch (error) {
        console.error('Error recording booking attempt:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all available routes with dates
exports.getAvailableRoutes = async (req, res) => {
    try {
        // Get all unique routes with their dates
        const routesData = await Flight.aggregate([
            {
                $group: {
                    _id: {
                        fromCode: "$from.code",
                        toCode: "$to.code",
                        fromCity: "$from.city",
                        toCity: "$to.city",
                        date: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$departureTime"
                            }
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            // Sort by from city, to city, and date
            {
                $sort: {
                    "_id.fromCity": 1,
                    "_id.toCity": 1,
                    "_id.date": 1
                }
            }
        ]);

        // Transform the data to group by routes
        const routeMap = {};

        routesData.forEach(item => {
            const routeKey = `${item._id.fromCity}-${item._id.toCity}`;
            const date = item._id.date;

            if (!routeMap[routeKey]) {
                routeMap[routeKey] = {
                    from: item._id.fromCity,
                    to: item._id.toCity,
                    fromCode: item._id.fromCode,
                    toCode: item._id.toCode,
                    dates: [],
                    testingStatus: "All dates have 10 flights available for testing"
                };
            }

            routeMap[routeKey].dates.push(date);

            // Update the message based on the flight count
            if (item.count < 10) {
                routeMap[routeKey].testingStatus = "Each search will generate 10 flights for testing";
            }
        });

        // Convert to array format
        const routes = Object.values(routeMap);

        res.status(200).json({
            success: true,
            routes,
            message: "All search results will return 10 flights per route for testing purposes"
        });
    } catch (error) {
        console.error('Error getting available routes:', error);

        // If database error or not connected, return sample data
        const sampleRoutes = [
            {
                from: "Delhi",
                to: "Mumbai",
                fromCode: "DEL",
                toCode: "BOM",
                dates: ["2025-05-15", "2025-05-20", "2025-05-25"],
                testingStatus: "Test data - 10 flights generated for each search"
            },
            {
                from: "Bengaluru",
                to: "Hyderabad",
                fromCode: "BLR",
                toCode: "HYD",
                dates: ["2025-05-18", "2025-05-22", "2025-05-30"],
                testingStatus: "Test data - 10 flights generated for each search"
            },
            {
                from: "Chennai",
                to: "Kolkata",
                fromCode: "MAA",
                toCode: "CCU",
                dates: ["2025-06-01", "2025-06-05", "2025-06-10"],
                testingStatus: "Test data - 10 flights generated for each search"
            }
        ];

        res.status(200).json({
            success: true,
            routes: sampleRoutes,
            message: "Using sample data due to database connection issue. All searches will generate 10 flights."
        });
    }
}; 