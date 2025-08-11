"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = __importDefault(require("./config/database"));
const auth_1 = __importDefault(require("./routes/auth"));
const data_1 = __importDefault(require("./routes/data"));
const phoneBrands_1 = __importDefault(require("./routes/phoneBrands"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Connect to MongoDB
(0, database_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/data', data_1.default);
app.use('/api/phone-brands', phoneBrands_1.default);
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
});
exports.default = app;
//# sourceMappingURL=server.js.map