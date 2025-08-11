import express, { Request, Response } from 'express';
import { dataService } from '../data/storage';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Get all phone brands
router.get('/', async (req: Request, res: Response) => {
  try {
    const phoneBrands = await dataService.getPhoneBrands();
    res.json(phoneBrands);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch phone brands' });
  }
});

// Add new phone brand
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, percentage } = req.body;
    
    if (!name || percentage === undefined) {
      return res.status(400).json({ error: 'Name and percentage are required' });
    }

    const newBrand = await dataService.addPhoneBrand({ name, percentage });
    res.status(201).json(newBrand);
  } catch (error) {
    if ((error as any).code === 11000) {
      res.status(400).json({ error: 'Phone brand name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to add phone brand' });
    }
  }
});

// Update phone brand
router.put('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, percentage } = req.body;
    
    const updatedBrand = await dataService.updatePhoneBrand(id, { name, percentage });
    
    if (!updatedBrand) {
      return res.status(404).json({ error: 'Phone brand not found' });
    }

    res.json(updatedBrand);
  } catch (error) {
    if ((error as any).code === 11000) {
      res.status(400).json({ error: 'Phone brand name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update phone brand' });
    }
  }
});

// Delete phone brand
router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const deleted = await dataService.deletePhoneBrand(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Phone brand not found' });
    }

    res.json({ message: 'Phone brand deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete phone brand' });
  }
});

export default router; 