import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import dotenv from 'dotenv';

// Config & Services
import { connectDB } from './src/config/db.js';
import { initializeDatabase } from './src/config/initDb.js';
import { sendDailyReport } from './src/services/emailService.js';

// Routes
import authRoutes from './src/routes/authRoutes.js';
import productRoutes from './src/routes/productRoutes.js';
import vendorRoutes from './src/routes/vendorRoutes.js';
import poRoutes from './src/routes/poRoutes.js';
import transactionRoutes from './src/routes/transactionRoutes.js';
import reportRoutes from './src/routes/reportRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import locationRoutes from './src/routes/locationRoutes.js';
import reasonRoutes from './src/routes/reasonRoutes.js';
import maRoutes from './src/routes/maRoutes.js';

// Setup Environment
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Static Files (Uploads)
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Database Connection & Init
const startServer = async () => {
    try {
        await connectDB();
        await initializeDatabase();

        // Routes
        app.use('/api', authRoutes);         // /api/authen
        app.use('/api', productRoutes);      // /api/products, /api/types, /api/forecast, /api/upload
        app.use('/api', vendorRoutes);       // /api/vendors
        app.use('/api', poRoutes);           // /api/pos
        app.use('/api', transactionRoutes);  // /api/transactions, /api/invoices, /api/receive
        app.use('/api', reportRoutes);       // /api/report/export, /api/test-email
        app.use('/api', userRoutes);         // /api/admin-users
        app.use('/api', locationRoutes);     // /api/locations
        app.use('/api', reasonRoutes);       // /api/reasons
        app.use('/api', maRoutes);            // /api/ma

        // Cron Job (Daily Low Stock Report at 07:00 AM)
        cron.schedule('20 18 * * *', async () => {
            console.log('Running daily report...');
            await sendDailyReport();
        }, {
            scheduled: true,
            timezone: "Asia/Bangkok" // บังคับให้เป็นเวลาประเทศไทย
        });

        // Error Handling Middleware
        app.use((err, req, res, next) => {
            console.error('Unhandled Error:', err.stack);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        });

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Uploads directory: ${uploadsDir}`);
        });

    } catch (err) {
        console.error('Failed to start server:', err);
    }
};

startServer();
