const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  panVat: { type: String, default: '' },
  registrationType: { type: String, default: 'VAT' },
  invoicePrefix: { type: String, default: 'INV-' },
  nextInvoiceNo: { type: Number, default: 1 },
  nextQuoteNo: { type: Number, default: 1 },
  nextReturnNo: { type: Number, default: 1 },
  nextPurchaseNo: { type: Number, default: 1 },
  nextPurchaseReturnNo: { type: Number, default: 1 },
  bankName: { type: String, default: '' },
  bankAccountName: { type: String, default: '' },
  bankAccountNumber: { type: String, default: '' },
  footerNote: { type: String, default: 'Thank you for your business!' }
}, { timestamps: true });

module.exports = mongoose.model('Business', businessSchema);
