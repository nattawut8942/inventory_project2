import express from 'express';
import { login } from '../controllers/authController.js';

const router = express.Router();

router.post('/authen', login);

export default router;
