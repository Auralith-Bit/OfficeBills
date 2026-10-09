const mongoose = require('mongoose');

const invoiceLineSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  name: { type: String, required: true },
  qty: { type: Number, required: true },
  rate: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  number: { type: String, required: true },
  dateBS: { type: String, required: true },
  partyId: { type: String, required: true },
  lines: [invoiceLineSchema],
  subtotal: { type: Number, default: 0 },
  vat: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  status: { type: String, enum: ['PAID', 'UNPAID', 'OVERDUE', 'DRAFT'], default: 'UNPAID' }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
