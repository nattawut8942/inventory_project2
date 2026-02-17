import express from 'express';
import { getTransactions, getInvoices, receiveGoods, getStockHistory } from '../controllers/transactionController.js';

const router = express.Router();

router.get('/transactions', getTransactions);
router.get('/invoices', getInvoices);
router.post('/receive', receiveGoods);
router.get('/stock/history/:id', getStockHistory);

export default router;
