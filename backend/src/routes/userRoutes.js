import express from 'express';
import { getAdminUsers, addAdminUser, deleteAdminUser } from '../controllers/userController.js';

const router = express.Router();

router.get('/admin-users', getAdminUsers);
router.post('/admin-users', addAdminUser);
router.delete('/admin-users/:username', deleteAdminUser);

export default router;
