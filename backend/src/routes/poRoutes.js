import express from 'express';
import { getPOs, createPO, updatePO, deletePO } from '../controllers/poController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public for now (or basic auth), can add verifyToken later
router.get('/pos', getPOs);
router.post('/pos', createPO);
router.put('/pos/:id', updatePO);
router.delete('/pos/:id', deletePO); // Future: requireRole('Admin')

export default router;
