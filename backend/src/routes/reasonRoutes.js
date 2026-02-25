import express from 'express';
import { getReasons, addReason, updateReason, deleteReason } from '../controllers/reasonController.js';

const router = express.Router();

router.get('/reasons', getReasons);
router.post('/reasons', addReason);
router.put('/reasons/:id', updateReason);
router.delete('/reasons/:id', deleteReason);

export default router;
