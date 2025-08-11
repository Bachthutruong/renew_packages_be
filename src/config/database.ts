import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models';

const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/renew_packages';
    
    await mongoose.connect(mongoUri);
    
    console.log('MongoDB connected successfully');
    
    // Create default admin user if not exists
    await createDefaultAdmin();
    
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const createDefaultAdmin = async (): Promise<void> => {
  try {
    // Force delete existing admin to recreate with new JWT_SECRET
    await User.deleteOne({ username: 'admin' });
    console.log('Removed existing admin user');
    
    const hashedPassword = await bcrypt.hash('123456789', 10);
    
    const admin = new User({
      username: 'admin',
      password: hashedPassword,
      role: 'admin'
    });
    
    await admin.save();
    console.log('New admin user created with username: admin, password: 123456789');
    
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

export default connectDB; 