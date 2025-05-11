const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// POST /api/users
router.post('/', userController.createOrGetUser);

// GET /api/users/:email/wallet
router.get('/:email/wallet', userController.getWalletBalance);

// GET /api/users/:email/transactions
router.get('/:email/transactions', userController.getWalletTransactions);

// POST /api/users/:email/wallet/add
router.post('/:email/wallet/add', userController.addMoneyToWallet);

module.exports = router; 