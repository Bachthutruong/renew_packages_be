import express, { Request, Response } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import { dataService } from '../data/storage';
import { ExcelRow } from '../types';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { DataEntry } from '../models';
import { PercentageConfig } from '../models';

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

    console.log(`[B3 DETAILS ROUTE] Request for B1: ${b1}, B2: ${b2}, B3: ${b3}`);
    const details = await dataService.getB3Details(b1 as string, b2 as string, b3 as string);
    console.log(`[B3 DETAILS ROUTE] Returning ${details.length} grouped details`);
    console.log(`[B3 DETAILS ROUTE] Sample detail:`, details[0]);
    res.json(details);
  } catch (error) {
    console.error('[B3 DETAILS ROUTE] Error:', error);
    res.status(500).json({ error: 'Failed to fetch B3 details' });
  }
});

// Test endpoint to get B3 details without cache
router.get('/test/b3/details', async (req: Request, res: Response) => {
  try {
    const { b1, b2, b3 } = req.query;
    
    if (!b1 || !b2 || !b3) {
      return res.status(400).json({ error: 'B1, B2, and B3 parameters are required' });
    }

    console.log(`[TEST B3 DETAILS] Request for B1: ${b1}, B2: ${b2}, B3: ${b3}`);
    
    // Direct database query without cache
    const entries = await DataEntry.find({
      B1: b1,
      B2: b2,
      B3: b3
    }).select('detail').lean();
    
    console.log(`[TEST] Found ${entries.length} entries from database`);
    
    const details = entries.map((entry: any) => entry.detail).filter((detail: string) => detail && detail.trim());
    
    // Group identical details
    const groupedDetails = new Map<string, number>();
    details.forEach((detail: string) => {
      const trimmedDetail = detail.trim();
      groupedDetails.set(trimmedDetail, (groupedDetails.get(trimmedDetail) || 0) + 1);
    });

    const totalCount = details.length;
    
    // Convert to result format
    const result = Array.from(groupedDetails.entries()).map(([detail, count]) => ({
      detail,
      count,
      totalCount,
      percentage: totalCount > 0 ? Math.round((count / totalCount) * 100 * 100) / 100 : 0,
      configuredPercentage: undefined
    })).sort((a, b) => b.count - a.count);
    
    console.log(`[TEST] Returning ${result.length} grouped details`);
    console.log(`[TEST] Sample:`, result[0]);
    
    res.json(result);
  } catch (error) {
    console.error('[TEST B3 DETAILS] Error:', error);
    res.status(500).json({ error: 'Failed to fetch B3 details' });
  }
});

// New grouped B3 details endpoint
router.get('/b3/details/grouped', async (req: Request, res: Response) => {
  try {
    const { b1, b2, b3 } = req.query;
    
    if (!b1 || !b2 || !b3) {
      return res.status(400).json({ error: 'B1, B2, and B3 parameters are required' });
    }

    console.log(`[GROUPED B3 DETAILS] Request for B1: ${b1}, B2: ${b2}, B3: ${b3}`);
    
    // Direct database query
    const entries = await DataEntry.find({
      B1: b1,
      B2: b2,
      B3: b3
    }).select('detail').lean();
    
    console.log(`[GROUPED] Found ${entries.length} entries from database`);
    
    const details = entries.map((entry: any) => entry.detail).filter((detail: string) => detail && detail.trim());
    
    // Group identical details
    const groupedDetails = new Map<string, number>();
    details.forEach((detail: string) => {
      const trimmedDetail = detail.trim();
      groupedDetails.set(trimmedDetail, (groupedDetails.get(trimmedDetail) || 0) + 1);
    });

    const totalCount = details.length;
    
    // Convert to result format
    const result = Array.from(groupedDetails.entries()).map(([detail, count]) => ({
      detail,
      count,
      totalCount,
      percentage: totalCount > 0 ? Math.round((count / totalCount) * 100 * 100) / 100 : 0,
      configuredPercentage: undefined
    })).sort((a, b) => b.count - a.count);
    
    console.log(`[GROUPED] Returning ${result.length} grouped details from ${totalCount} total`);
    console.log(`[GROUPED] Sample:`, result[0]);
    console.log(`[GROUPED] All results:`, result);
    
    res.json(result);
  } catch (error) {
    console.error('[GROUPED B3 DETAILS] Error:', error);
    res.status(500).json({ error: 'Failed to fetch grouped B3 details' });
  }
});

// Debug endpoint to clear cache
router.post('/debug/clear-cache', async (req: Request, res: Response) => {
  try {
    const { b1, b2, b3 } = req.body;
    if (b1 && b2 && b3) {
      const cacheKey = `b3Details:${b1}:${b2}:${b3}`;
      console.log(`[DEBUG] Clearing cache for key: ${cacheKey}`);
      // This will be handled by the dataService
    }
    res.json({ message: 'Cache clear request received' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cache' });
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

// Update B3 detail percentage
router.put('/b3/detail/percentage', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { b1, b2, b3, detail, percentage } = req.body;
    console.log('[UPDATE B3 DETAIL] Request body:', { b1, b2, b3, detail, percentage });
    
    if (!b1 || !b2 || !b3 || !detail || percentage === undefined) {
      console.log('[UPDATE B3 DETAIL] Validation failed:', { b1, b2, b3, detail, percentage });
      return res.status(400).json({ error: 'B1, B2, B3, detail and percentage are required' });
    }

    console.log('[UPDATE B3 DETAIL] Calling dataService.updateB3DetailPercentage...');
    await dataService.updateB3DetailPercentage(b1, b2, b3, detail, percentage);
    console.log('[UPDATE B3 DETAIL] Success!');
    res.json({ message: 'B3 detail percentage updated successfully' });
  } catch (error) {
    console.error('[UPDATE B3 DETAIL] Error:', error);
    res.status(500).json({ error: 'Failed to update B3 detail percentage', details: error instanceof Error ? error.message : String(error) });
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

// Test endpoint to check B3 detail update
router.post('/test/b3/detail/update', async (req: Request, res: Response) => {
  try {
    const { b1, b2, b3, detail, percentage } = req.body;
    
    if (!b1 || !b2 || !b3 || !detail || percentage === undefined) {
      return res.status(400).json({ error: 'All parameters are required' });
    }

    console.log(`[TEST B3 DETAIL UPDATE] Request:`, { b1, b2, b3, detail, percentage });
    
    // Test the update function
    await dataService.updateB3DetailPercentage(b1, b2, b3, detail, percentage);
    
    // Verify the update by querying the database
    const config = await PercentageConfig.findOne({
      type: 'B3_DETAIL',
      B1: b1,
      B2: b2,
      B3: b3,
      value: detail
    }).lean();
    
    console.log(`[TEST B3 DETAIL UPDATE] Result:`, config);
    
    res.json({ 
      message: 'Update successful',
      savedConfig: config,
      requestedPercentage: percentage
    });
  } catch (error) {
    console.error('[TEST B3 DETAIL UPDATE] Error:', error);
    res.status(500).json({ 
      error: 'Update failed', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

export default router; 