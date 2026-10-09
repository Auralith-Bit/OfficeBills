const mongoose = require('mongoose');

const returnLineSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  name: { type: String, required: true },
  qty: { type: Number, required: true },
  rate: { type: Number, required: true },
  taxRate: { type: Number, default: 0 }
}, { _id: false });

const salesReturnSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  number: { type: String, required: true },
  dateBS: { type: String, required: true },
  partyId: { type: String, required: true },
  invoiceId: { type: String },
  lines: [returnLineSchema],
  total: { type: Number, required: true },
  settlement: { type: String, enum: ['CASH', 'CREDIT'], required: true }
}, { timestamps: true });

module.exports = mongoose.model('SalesReturn', salesReturnSchema);
