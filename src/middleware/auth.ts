import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { dataService } from '../data/storage';

interface AuthRequest extends Request {
  user?: any;
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwtSecret = process.env.JWT_SECRET || '42efe91fb379e199daabd7637640a03125b3173d33f0d5c437f8dee5f1c2d8771474cb754851434a5d5c62aecbda1ffdcf343b4813743f130a23b67afa331e6a3c59aa1fc0a4e20978778b56859f62071e9efa9edb4ce12bd69ea9bf0232165f227eedf32da81c207eef3a81b0bf39f4bcb9d36dfbb923b48eb0a7129f8e1a052f4dd7b6d7edfa25894b68217056b69270608cdbc41efcc0732ded697a7bafe9ad67d993aa30cc87d3d6ade051faf9e8967df71330e9fc716828cb030a68f0b619b8f249d096de632867c4d22fa84e506ba0ad4cedc40e2d888c8adc6c39bf05a5b7e5a0e216a3b16770431d0ac0c05058d990067e3d6a672a06caa621e97818';

  try {
    const decoded: any = jwt.verify(token, jwtSecret);
    const user = await dataService.getUserById(decoded.userId);
    
    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.log('Token verification failed - please login again');
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
}; 