const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

// POST /api/bookings
router.post('/', bookingController.createBooking);

// GET /api/bookings/user/:userId
router.get('/user/:userId', bookingController.getUserBookings);

// GET /api/bookings/:id
router.get('/:id', bookingController.getBookingById);

// PUT /api/bookings/:id/cancel
router.put('/:id/cancel', bookingController.cancelBooking);

// GET /api/bookings/:id/ticket
router.get('/:id/ticket', bookingController.generateTicket);

module.exports = router; 