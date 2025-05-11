const express = require('express');
const router = express.Router();
const flightController = require('../controllers/flightController');

// GET /api/flights/search
router.get('/search', flightController.searchFlights);

// GET /api/flights/available-routes
router.get('/available-routes', flightController.getAvailableRoutes);

// GET /api/flights/:id
router.get('/:id', flightController.getFlightById);

// POST /api/flights/:id/attempt
router.post('/:id/attempt', flightController.recordBookingAttempt);

module.exports = router; 