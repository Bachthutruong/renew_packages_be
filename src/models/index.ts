import mongoose, { Schema } from 'mongoose';
import { IDataEntry, IPercentageConfig, IPhoneBrand, IUser } from '../types';

// DataEntry Schema
const DataEntrySchema = new Schema<IDataEntry>({
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
const PercentageConfigSchema = new Schema<IPercentageConfig>({
  type: { type: String, enum: ['B2', 'B3'], required: true },
  B1: { type: String, required: true, index: true },
  B2: { type: String, index: true }, // Optional, used for B3 configs
  value: { type: String, required: true },
  percentage: { type: Number, default: 0, min: 0, max: 100 }
}, {
  timestamps: true
});

// Compound index for type, B1, B2, and value to ensure uniqueness
PercentageConfigSchema.index({ type: 1, B1: 1, B2: 1, value: 1 }, { unique: true });
// Additional indexes for better query performance
PercentageConfigSchema.index({ type: 1, B1: 1 }); // For B2 percentage configs
PercentageConfigSchema.index({ type: 1, B1: 1, B2: 1 }); // For B3 percentage configs

// PhoneBrand Schema
const PhoneBrandSchema = new Schema<IPhoneBrand>({
  name: { type: String, required: true, unique: true },
  percentage: { type: Number, default: 0, min: 0, max: 100 }
}, {
  timestamps: true
});

// User Schema
const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' }
}, {
  timestamps: true
});

// Export models
export const DataEntry = mongoose.model<IDataEntry>('DataEntry', DataEntrySchema);
export const PercentageConfig = mongoose.model<IPercentageConfig>('PercentageConfig', PercentageConfigSchema);
export const PhoneBrand = mongoose.model<IPhoneBrand>('PhoneBrand', PhoneBrandSchema);
export const User = mongoose.model<IUser>('User', UserSchema); 