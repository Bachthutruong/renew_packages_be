import express, { Request, Response } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import { dataService } from '../data/storage';
import { ExcelRow } from '../types';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Import Excel data
router.post('/import', authenticateToken, requireAdmin, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

    const dataEntries = rawData.map((row) => ({
      B1: row.B1 || '',
      B2: row.B2 || '',
      B3: row.B3 || '',
      detail: row['B3的詳細資料'] || ''
    }));

    await dataService.setData(dataEntries);

    res.json({
      message: 'Data imported successfully',
      count: dataEntries.length
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Failed to import data' });
  }
});

// Get B1 values
router.get('/b1', async (req: Request, res: Response) => {
  try {
    const b1Values = await dataService.getB1Values();
    res.json(b1Values);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch B1 values' });
  }
});

// Get B2 data
router.get('/b2', async (req: Request, res: Response) => {
  try {
    const { b1 } = req.query;
    const b2Data = await dataService.getB2Data(b1 as string);
    res.json(b2Data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch B2 data' });
  }
});

// Get B3 data
router.get('/b3', async (req: Request, res: Response) => {
  try {
    const { b1, b2 } = req.query;
    const b3Data = await dataService.getB3Data(b1 as string, b2 as string);
    res.json(b3Data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch B3 data' });
  }
});

// Get B3 details
router.get('/b3/details', async (req: Request, res: Response) => {
  try {
    const { b1, b2, b3 } = req.query;
    
    if (!b1 || !b2 || !b3) {
      return res.status(400).json({ error: 'B1, B2, and B3 parameters are required' });
    }

    const details = await dataService.getB3Details(b1 as string, b2 as string, b3 as string);
    res.json(details);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch B3 details' });
  }
});

// Update B2 percentage
router.put('/b2/percentage', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { b1, value, percentage } = req.body;
    console.log('[UPDATE B2] Request body:', { b1, value, percentage });
    
    if (!b1 || !value || percentage === undefined) {
      console.log('[UPDATE B2] Validation failed:', { b1, value, percentage });
      return res.status(400).json({ error: 'B1, value and percentage are required' });
    }

    console.log('[UPDATE B2] Calling dataService.updateB2Percentage...');
    await dataService.updateB2Percentage(b1, value, percentage);
    console.log('[UPDATE B2] Success!');
    res.json({ message: 'B2 percentage updated successfully' });
  } catch (error) {
    console.error('[UPDATE B2] Error:', error);
    res.status(500).json({ error: 'Failed to update B2 percentage', details: error instanceof Error ? error.message : String(error) });
  }
});

// Update B3 percentage
router.put('/b3/percentage', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { b1, b2, value, percentage } = req.body;
    console.log('[UPDATE B3] Request body:', { b1, b2, value, percentage });
    
    if (!b1 || !b2 || !value || percentage === undefined) {
      console.log('[UPDATE B3] Validation failed:', { b1, b2, value, percentage });
      return res.status(400).json({ error: 'B1, B2, value and percentage are required' });
    }

    console.log('[UPDATE B3] Calling dataService.updateB3Percentage...');
    await dataService.updateB3Percentage(b1, b2, value, percentage);
    console.log('[UPDATE B3] Success!');
    res.json({ message: 'B3 percentage updated successfully' });
  } catch (error) {
    console.error('[UPDATE B3] Error:', error);
    res.status(500).json({ error: 'Failed to update B3 percentage', details: error instanceof Error ? error.message : String(error) });
  }
});

// Clear all percentage configurations
router.delete('/configurations', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    await dataService.clearAllConfigurations();
    res.json({ message: 'All percentage configurations cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear configurations' });
  }
});

// Migrate percentage configurations (fix schema conflicts)
router.post('/migrate-percentage-configs', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    await dataService.migratePercentageConfigs();
    res.json({ message: 'Percentage configuration migration completed successfully' });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: 'Failed to migrate percentage configurations' });
  }
});

export default router; 