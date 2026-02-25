import express from 'express';
import { exportReport, testEmail } from '../controllers/reportController.js';

const router = express.Router();

router.get('/report/export', exportReport);
router.post('/test-email', testEmail);

export default router;
