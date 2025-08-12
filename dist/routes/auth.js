"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const storage_1 = require("../data/storage");
const models_1 = require("../models");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const jwtSecret = process.env.JWT_SECRET || '42efe91fb379e199daabd7637640a03125b3173d33f0d5c437f8dee5f1c2d8771474cb754851434a5d5c62aecbda1ffdcf343b4813743f130a23b67afa331e6a3c59aa1fc0a4e20978778b56859f62071e9efa9edb4ce12bd69ea9bf0232165f227eedf32da81c207eef3a81b0bf39f4bcb9d36dfbb923b48eb0a7129f8e1a052f4dd7b6d7edfa25894b68217056b69270608cdbc41efcc0732ded697a7bafe9ad67d993aa30cc87d3d6ade051faf9e8967df71330e9fc716828cb030a68f0b619b8f249d096de632867c4d22fa84e506ba0ad4cedc40e2d888c8adc6c39bf05a5b7e5a0e216a3b16770431d0ac0c05058d990067e3d6a672a06caa621e97818';
// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        const user = await storage_1.dataService.getUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user._id }, jwtSecret, { expiresIn: '7d' }); // Extended to 7 days
        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Validate token
router.get('/validate', auth_1.authenticateToken, async (req, res) => {
    try {
        // If we get here, the token is valid (authenticateToken middleware passed)
        res.json({
            valid: true,
            user: {
                id: req.user._id,
                username: req.user.username,
                role: req.user.role
            }
        });
    }
    catch (error) {
        console.error('Token validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create admin user (for setup purposes)
router.post('/create-admin', async (req, res) => {
    try {
        // Delete existing admin
        await models_1.User.deleteOne({ username: 'admin' });
        const hashedPassword = await bcryptjs_1.default.hash('123456789', 10);
        const admin = new models_1.User({
            username: 'admin',
            password: hashedPassword,
            role: 'admin'
        });
        await admin.save();
        res.json({
            message: 'Admin user created successfully',
            username: 'admin',
            password: '123456789'
        });
    }
    catch (error) {
        console.error('Error creating admin:', error);
        res.status(500).json({ error: 'Failed to create admin user' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map