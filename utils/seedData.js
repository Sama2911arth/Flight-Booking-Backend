const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Flight = require('../models/Flight');
const User = require('../models/User');
const Booking = require('../models/Booking');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB:', err));

// Sample airports data
const airports = [
    { code: 'DEL', name: 'Indira Gandhi International Airport', city: 'Delhi' },
    { code: 'BOM', name: 'Chhatrapati Shivaji International Airport', city: 'Mumbai' },
    { code: 'BLR', name: 'Kempegowda International Airport', city: 'Bengaluru' },
    { code: 'MAA', name: 'Chennai International Airport', city: 'Chennai' },
    { code: 'CCU', name: 'Netaji Subhash Chandra Bose International Airport', city: 'Kolkata' },
    { code: 'HYD', name: 'Rajiv Gandhi International Airport', city: 'Hyderabad' },
    { code: 'COK', name: 'Cochin International Airport', city: 'Kochi' },
    { code: 'PNQ', name: 'Pune International Airport', city: 'Pune' },
    { code: 'GOI', name: 'Goa International Airport', city: 'Goa' },
    { code: 'AMD', name: 'Sardar Vallabhbhai Patel International Airport', city: 'Ahmedabad' }
];

// Sample airlines data
const airlines = ['Indigo', 'SpiceJet', 'Air India', 'Vistara'];

// Helper function to get a random item from an array
const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper function to get a random price between 2000 and 3000
const getRandomPrice = () => Math.floor(Math.random() * (3000 - 2000 + 1)) + 2000;

// Helper function to get a random date in the next 30 days
const getRandomFutureDate = () => {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + Math.floor(Math.random() * 30) + 1);
    return futureDate;
};

// Generate a random flight number based on the airline
const generateFlightNumber = (airline) => {
    const prefixes = {
        'Indigo': '6E',
        'SpiceJet': 'SG',
        'Air India': 'AI',
        'Vistara': 'UK'
    };

    const prefix = prefixes[airline] || 'FL';
    const number = Math.floor(Math.random() * 9000) + 1000;

    return `${prefix}-${number}`;
};

// Seed function
const seed = async () => {
    try {
        // Clear existing data
        await Flight.deleteMany({});
        await User.deleteMany({});
        await Booking.deleteMany({});

        console.log('Cleared existing data');

        // Create sample flights (100 flights)
        const flights = [];

        for (let i = 0; i < 100; i++) {
            // Get random from and to airports (ensuring they are different)
            const fromAirport = getRandomItem(airports);
            let toAirport;

            do {
                toAirport = getRandomItem(airports);
            } while (fromAirport.code === toAirport.code);

            // Get random airline and price
            const airline = getRandomItem(airlines);
            const basePrice = getRandomPrice();

            // Get random departure date and time
            const departureDate = getRandomFutureDate();

            // Set arrival time 1-3 hours after departure
            const arrivalDate = new Date(departureDate);
            arrivalDate.setHours(arrivalDate.getHours() + Math.floor(Math.random() * 3) + 1);

            // Create flight object
            const flight = new Flight({
                airline,
                flightNumber: generateFlightNumber(airline),
                from: {
                    code: fromAirport.code,
                    name: fromAirport.name,
                    city: fromAirport.city
                },
                to: {
                    code: toAirport.code,
                    name: toAirport.name,
                    city: toAirport.city
                },
                departureTime: departureDate,
                arrivalTime: arrivalDate,
                basePrice,
                currentPrice: basePrice,
                availableSeats: Math.floor(Math.random() * 50) + 10
            });

            flights.push(flight);
        }

        // Save flights to database
        await Flight.insertMany(flights);
        console.log('Added 100 sample flights');

        // Create sample user with wallet
        const user = new User({
            name: 'Test User',
            email: 'test@example.com',
            walletBalance: 50000
        });

        await user.save();
        console.log('Created sample user with 50,000 Rs wallet balance');

        console.log('Database seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

// Run the seed function
seed(); 