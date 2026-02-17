import express from 'express';
import { getVendors, createVendor, updateVendor, deleteVendor } from '../controllers/vendorController.js';

const router = express.Router();

router.get('/vendors', getVendors);
router.post('/vendors', createVendor);
router.put('/vendors/:id', updateVendor);
router.delete('/vendors/:id', deleteVendor);

export default router;
