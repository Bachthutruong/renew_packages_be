"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const models_1 = require("../models");
const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/renew_packages';
        await mongoose_1.default.connect(mongoUri);
        console.log('MongoDB connected successfully');
        // Create default admin user if not exists
        await createDefaultAdmin();
    }
    catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};
const createDefaultAdmin = async () => {
    try {
        // Force delete existing admin to recreate with new JWT_SECRET
        await models_1.User.deleteOne({ username: 'admin' });
        console.log('Removed existing admin user');
        const hashedPassword = await bcryptjs_1.default.hash('123456789', 10);
        const admin = new models_1.User({
            username: 'admin',
            password: hashedPassword,
            role: 'admin'
        });
        await admin.save();
        console.log('New admin user created with username: admin, password: 123456789');
    }
    catch (error) {
        console.error('Error creating default admin:', error);
    }
};
exports.default = connectDB;
//# sourceMappingURL=database.js.map