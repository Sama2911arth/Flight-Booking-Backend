const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const User = require('../models/User');

// Create a new booking
exports.createBooking = async (req, res) => {
    try {
        const { userId, flightId, passengerDetails, flightDetails } = req.body;

        let flight;
        let isGeneratedFlight = false;

        // Check if this is a generated flight ID
        if (flightId.startsWith('generated_') && flightDetails) {
            // For generated flights, create a temporary flight object
            isGeneratedFlight = true;
            flight = {
                _id: flightId,
                airline: flightDetails.airline,
                flightNumber: flightDetails.flightNumber,
                from: flightDetails.from,
                to: flightDetails.to,
                departureTime: flightDetails.departureTime,
                arrivalTime: flightDetails.arrivalTime,
                currentPrice: parseFloat(flightDetails.price),
                basePrice: parseFloat(flightDetails.price),
                availableSeats: 20,
                // Add dummy methods required for booking
                updatePrice: async function () { return this; },
                save: async function () { return this; }
            };
        } else {
            // Find the flight in the database
            flight = await Flight.findById(flightId);
            if (!flight) {
                return res.status(404).json({ message: 'Flight not found' });
            }
        }

        // Find the user
        const user = await User.findOne({ email: userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // For regular flights, check available seats
        if (!isGeneratedFlight && flight.availableSeats <= 0) {
            return res.status(400).json({ message: 'No seats available on this flight' });
        }

        // Record this as a booking attempt (for dynamic pricing) - only for regular flights
        if (!isGeneratedFlight) {
            flight.bookingAttempts.push({
                timestamp: new Date(),
                sessionId: req.body.sessionId || 'unknown'
            });
            await flight.updatePrice();
        }

        // Check if user has enough balance
        if (user.walletBalance < flight.currentPrice) {
            return res.status(400).json({ message: 'Insufficient wallet balance' });
        }

        // Create the booking
        const booking = new Booking({
            userId: user.email,
            flightId: isGeneratedFlight ? null : flight._id, // For generated flights, don't store flightId
            passengerDetails,
            price: flight.currentPrice,
            // For generated flights, store the flight details directly
            flightDetails: isGeneratedFlight ? {
                airline: flight.airline,
                flightNumber: flight.flightNumber,
                from: flight.from,
                to: flight.to,
                departureTime: flight.departureTime,
                arrivalTime: flight.arrivalTime,
                price: flight.currentPrice
            } : null
        });

        // Save the booking
        await booking.save();

        // Deduct money from wallet
        await user.deductMoney(
            flight.currentPrice,
            `Flight booking: ${flight.airline} ${flight.flightNumber}`,
            booking._id
        );

        // Decrease available seats - only for regular flights
        if (!isGeneratedFlight) {
            flight.availableSeats -= 1;
            await flight.save();
        }

        res.status(201).json({
            message: 'Booking created successfully',
            booking,
            remainingBalance: user.walletBalance
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get bookings for a user
exports.getUserBookings = async (req, res) => {
    try {
        const { userId } = req.params;

        const bookings = await Booking.find({ userId })
            .populate('flightId')
            .sort({ bookingDate: -1 });

        res.status(200).json(bookings);
    } catch (error) {
        console.error('Error getting user bookings:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get booking by ID
exports.getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id).populate('flightId');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        res.status(200).json(booking);
    } catch (error) {
        console.error('Error getting booking:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Cancel booking
exports.cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check if booking is already cancelled
        if (booking.status === 'CANCELLED') {
            return res.status(400).json({ message: 'Booking is already cancelled' });
        }

        // Update booking status
        booking.status = 'CANCELLED';
        await booking.save();

        // Refund money to wallet (you can adjust refund policy as needed)
        const user = await User.findOne({ email: booking.userId });
        if (user) {
            await user.addMoney(
                booking.price,
                `Refund for cancelled booking: ${booking.ticketNumber}`
            );
        }

        // Increase available seats for the flight
        const flight = await Flight.findById(booking.flightId);
        if (flight) {
            flight.availableSeats += 1;
            await flight.save();
        }

        res.status(200).json({
            message: 'Booking cancelled successfully',
            booking,
            refundedAmount: booking.price,
            newWalletBalance: user ? user.walletBalance : 'Unknown'
        });
    } catch (error) {
        console.error('Error cancelling booking:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Generate PDF ticket
exports.generateTicket = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[PDF] Starting ticket generation for booking ID: ${id}`);

        const booking = await Booking.findById(id).populate('flightId');

        if (!booking) {
            console.log(`[PDF] Booking not found with ID: ${id}`);
            return res.status(404).json({ message: 'Booking not found' });
        }

        console.log(`[PDF] Booking found: ${booking._id}, Status: ${booking.status}`);
        console.log(`[PDF] FlightId exists: ${!!booking.flightId}, FlightDetails exists: ${!!booking.flightDetails}`);

        // Check if this is a booking for a real flight or a generated flight
        const isGeneratedFlight = !booking.flightId && booking.flightDetails;
        console.log(`[PDF] Is generated flight: ${isGeneratedFlight}`);

        // Get flight info from either flightId or flightDetails
        const flightInfo = isGeneratedFlight ? booking.flightDetails : booking.flightId;

        // If no flight info available, return error
        if (!flightInfo) {
            console.log(`[PDF] Error: No flight info available for booking ${id}`);
            return res.status(400).json({ message: 'Flight details not available for this booking' });
        }

        console.log(`[PDF] Flight info available: ${flightInfo.airline} ${flightInfo.flightNumber}`);
        console.log(`[PDF] Departure: ${flightInfo.departureTime}, Arrival: ${flightInfo.arrivalTime}`);

        // Create PDF using PDFKit
        const PDFDocument = require('pdfkit');
        console.log(`[PDF] Creating PDF document`);

        try {
            const doc = new PDFDocument();

            // Set response headers for PDF download
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=ticket-${booking.ticketNumber}.pdf`);

            console.log(`[PDF] Piping PDF to response`);
            // Pipe the PDF directly to the response
            doc.pipe(res);

            // Format dates
            console.log(`[PDF] Formatting dates`);
            const departureDate = new Date(flightInfo.departureTime);
            const arrivalDate = new Date(flightInfo.arrivalTime);
            const bookingDate = new Date(booking.bookingDate);

            console.log(`[PDF] Parsed dates - Departure: ${departureDate}, Arrival: ${arrivalDate}`);

            const formatDate = (date) => {
                try {
                    return date.toLocaleDateString('en-IN', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                    });
                } catch (err) {
                    console.error(`[PDF] Date formatting error:`, err);
                    return 'Date not available';
                }
            };

            const formatTime = (date) => {
                try {
                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } catch (err) {
                    console.error(`[PDF] Time formatting error:`, err);
                    return 'Time not available';
                }
            };

            // Calculate duration
            let durationHours = 0;
            let durationMinutes = 0;

            try {
                const durationMs = arrivalDate.getTime() - departureDate.getTime();
                durationHours = Math.floor(durationMs / (1000 * 60 * 60));
                durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                console.log(`[PDF] Duration calculated: ${durationHours}h ${durationMinutes}m`);
            } catch (err) {
                console.error(`[PDF] Duration calculation error:`, err);
            }

            console.log(`[PDF] Adding content to PDF`);
            // Add content to PDF
            // Header
            doc.fontSize(20).text('Flight E-Ticket', { align: 'center' });
            doc.moveDown();

            // Status badge
            doc.fontSize(12);
            const statusText = booking.status === 'CONFIRMED' ? 'CONFIRMED' : 'CANCELLED';
            const statusColor = booking.status === 'CONFIRMED' ? '#48BB78' : '#E53E3E';
            doc.fillColor(statusColor).text(statusText, { align: 'right' });
            doc.fillColor('#000000'); // Reset color
            doc.moveDown();

            // Ticket info
            doc.fontSize(14).text('Ticket Information', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(12).text(`Ticket Number: ${booking.ticketNumber}`);
            doc.text(`Booking Date: ${formatDate(bookingDate)}`);
            doc.moveDown();

            // Flight info
            doc.fontSize(14).text('Flight Information', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(12).text(`Airline: ${flightInfo.airline}`);
            doc.text(`Flight Number: ${flightInfo.flightNumber}`);
            doc.moveDown();

            // Route info
            doc.fontSize(14).text('Route Information', { underline: true });
            doc.moveDown(0.5);

            // From
            try {
                doc.fontSize(12).text('From:', { continued: true });
                doc.fontSize(12).text(` ${flightInfo.from.city} (${flightInfo.from.code})`, { underline: false });
                doc.text(`Airport: ${flightInfo.from.name}`);
                doc.text(`Departure: ${formatDate(departureDate)} at ${formatTime(departureDate)}`);
                doc.moveDown();
            } catch (err) {
                console.error(`[PDF] Error adding 'From' section:`, err);
                doc.text('From information not available');
                doc.moveDown();
            }

            // To
            try {
                doc.fontSize(12).text('To:', { continued: true });
                doc.fontSize(12).text(` ${flightInfo.to.city} (${flightInfo.to.code})`, { underline: false });
                doc.text(`Airport: ${flightInfo.to.name}`);
                doc.text(`Arrival: ${formatDate(arrivalDate)} at ${formatTime(arrivalDate)}`);
                doc.moveDown();
            } catch (err) {
                console.error(`[PDF] Error adding 'To' section:`, err);
                doc.text('To information not available');
                doc.moveDown();
            }

            // Duration
            doc.text(`Duration: ${durationHours}h ${durationMinutes}m`);
            doc.moveDown();

            // Passenger details
            doc.fontSize(14).text('Passenger Details', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(12).text(`Name: ${booking.passengerDetails.name}`);
            doc.text(`Email: ${booking.passengerDetails.email}`);
            doc.text(`Phone: ${booking.passengerDetails.phone}`);
            doc.moveDown();

            // Price details
            doc.fontSize(14).text('Price Details', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(12).text(`Total Price: ₹${booking.price}`);
            doc.moveDown();

            // Footer
            doc.fontSize(10).text('This is an electronically generated ticket and does not require a physical signature.', { align: 'center' });

            console.log(`[PDF] Finalizing PDF document`);
            // Finalize the PDF
            doc.end();
            console.log(`[PDF] PDF generation completed successfully`);
        } catch (pdfError) {
            console.error(`[PDF] Error creating PDF document: ${pdfError.message}`);
            console.error(pdfError.stack);
            return res.status(500).json({ message: 'Error creating PDF document', error: pdfError.message });
        }
    } catch (error) {
        console.error('Error generating ticket:', error);
        console.error(error.stack);
        res.status(500).json({ message: 'Server error', error: error.message, stack: error.stack });
    }
}; 