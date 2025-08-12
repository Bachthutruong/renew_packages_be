"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.PhoneBrand = exports.PercentageConfig = exports.DataEntry = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// DataEntry Schema
const DataEntrySchema = new mongoose_1.Schema({
    B1: { type: String, required: true, index: true },
    B2: { type: String, required: true, index: true },
    B3: { type: String, required: true, index: true },
    detail: { type: String, default: '' }
}, {
    timestamps: true
});
// Add compound indexes for better query performance
DataEntrySchema.index({ B1: 1, B2: 1 }); // For B3 queries
DataEntrySchema.index({ B1: 1, B2: 1, B3: 1 }); // For B3 details queries
DataEntrySchema.index({ B1: 1 }); // For B2 queries
// PercentageConfig Schema
const PercentageConfigSchema = new mongoose_1.Schema({
    type: { type: String, enum: ['B2', 'B3', 'B3_DETAIL'], required: true },
    B1: { type: String, required: true, index: true },
    B2: { type: String, index: true }, // Optional, used for B3 configs
    B3: { type: String, index: true }, // Optional, used for B3_DETAIL configs
    value: { type: String, required: true },
    percentage: { type: Number, default: 0, min: 0, max: 100 }
}, {
    timestamps: true
});
// Compound index for type, B1, B2, B3, and value to ensure uniqueness
PercentageConfigSchema.index({ type: 1, B1: 1, B2: 1, B3: 1, value: 1 }, { unique: true });
// Additional indexes for better query performance
PercentageConfigSchema.index({ type: 1, B1: 1 }); // For B2 percentage configs
PercentageConfigSchema.index({ type: 1, B1: 1, B2: 1 }); // For B3 percentage configs
PercentageConfigSchema.index({ type: 1, B1: 1, B2: 1, B3: 1 }); // For B3_DETAIL percentage configs
// PhoneBrand Schema
const PhoneBrandSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    percentage: { type: Number, default: 0, min: 0, max: 100 }
}, {
    timestamps: true
});
// User Schema
const UserSchema = new mongoose_1.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' }
}, {
    timestamps: true
});
// Export models
exports.DataEntry = mongoose_1.default.model('DataEntry', DataEntrySchema);
exports.PercentageConfig = mongoose_1.default.model('PercentageConfig', PercentageConfigSchema);
exports.PhoneBrand = mongoose_1.default.model('PhoneBrand', PhoneBrandSchema);
exports.User = mongoose_1.default.model('User', UserSchema);
//# sourceMappingURL=index.js.map