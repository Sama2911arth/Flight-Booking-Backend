const User = require('../models/User');

// Create or get a user
exports.createOrGetUser = async (req, res) => {
    try {
        const { name, email } = req.body;

        // Check if user already exists
        let user = await User.findOne({ email });

        if (!user) {
            // Create a new user
            user = new User({
                name,
                email,
                walletBalance: 50000 // Default balance
            });
            await user.save();
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Error creating/getting user:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get wallet balance
exports.getWalletBalance = async (req, res) => {
    try {
        const { email } = req.params;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            walletBalance: user.walletBalance
        });
    } catch (error) {
        console.error('Error getting wallet balance:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get wallet transactions
exports.getWalletTransactions = async (req, res) => {
    try {
        const { email } = req.params;

        const user = await User.findOne({ email })
            .populate('transactions.bookingId');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Sort transactions by timestamp in descending order
        const transactions = user.transactions.sort((a, b) =>
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        res.status(200).json(transactions);
    } catch (error) {
        console.error('Error getting wallet transactions:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Add money to wallet
exports.addMoneyToWallet = async (req, res) => {
    try {
        const { email } = req.params;
        const { amount, description } = req.body;

        if (amount <= 0) {
            return res.status(400).json({ message: 'Amount must be greater than 0' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.addMoney(amount, description || 'Wallet top-up');

        res.status(200).json({
            message: 'Money added successfully',
            newBalance: user.walletBalance
        });
    } catch (error) {
        console.error('Error adding money to wallet:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}; 