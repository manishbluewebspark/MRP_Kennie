import express from 'express';
import { createQuote, getAllQuotes, getQuoteById, updateQuote, deleteQuote, getQuotesByCustomer, updateQuoteStatus, exportQuoteToWord, exportQuoteToExcel, exportSelectedQuotesToExcel } from '../controllers/quote.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';


const router = express.Router();

// CRUD
router.post('/', authenticate, createQuote);
router.get('/',authenticate, getAllQuotes);
router.get('/:id', authenticate, getQuoteById);
router.put('/:id', authenticate, updateQuote);
router.delete('/:id', authenticate, deleteQuote);

// Export
router.get('/export/excel/:quoteId',authenticate, exportQuoteToExcel);
router.get('/export/word/:id', authenticate, exportQuoteToWord); // Add proper Word export function
router.post('/export/excel',authenticate, exportSelectedQuotesToExcel); // Add proper Excel export function

// Additional
router.get('/customer/:customerId', authenticate, getQuotesByCustomer);
router.patch('/:id/status', authenticate, updateQuoteStatus);

export default router;
