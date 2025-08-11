"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const storage_1 = require("../data/storage");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get all phone brands
router.get('/', async (req, res) => {
    try {
        const phoneBrands = await storage_1.dataService.getPhoneBrands();
        res.json(phoneBrands);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch phone brands' });
    }
});
// Add new phone brand
router.post('/', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { name, percentage } = req.body;
        if (!name || percentage === undefined) {
            return res.status(400).json({ error: 'Name and percentage are required' });
        }
        const newBrand = await storage_1.dataService.addPhoneBrand({ name, percentage });
        res.status(201).json(newBrand);
    }
    catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ error: 'Phone brand name already exists' });
        }
        else {
            res.status(500).json({ error: 'Failed to add phone brand' });
        }
    }
});
// Update phone brand
router.put('/:id', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, percentage } = req.body;
        const updatedBrand = await storage_1.dataService.updatePhoneBrand(id, { name, percentage });
        if (!updatedBrand) {
            return res.status(404).json({ error: 'Phone brand not found' });
        }
        res.json(updatedBrand);
    }
    catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ error: 'Phone brand name already exists' });
        }
        else {
            res.status(500).json({ error: 'Failed to update phone brand' });
        }
    }
});
// Delete phone brand
router.delete('/:id', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await storage_1.dataService.deletePhoneBrand(id);
        if (!deleted) {
            return res.status(404).json({ error: 'Phone brand not found' });
        }
        res.json({ message: 'Phone brand deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete phone brand' });
    }
});
exports.default = router;
//# sourceMappingURL=phoneBrands.js.map