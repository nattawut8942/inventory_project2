import express from 'express';
import { getLocations, addLocation, updateLocation, deleteLocation } from '../controllers/locationController.js';

const router = express.Router();

router.get('/locations', getLocations);
router.post('/locations', addLocation);
router.put('/locations/:id', updateLocation);
router.delete('/locations/:id', deleteLocation);

export default router;
