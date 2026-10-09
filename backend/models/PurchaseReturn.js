const mongoose = require('mongoose');

const purchaseReturnLineSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  name: { type: String, required: true },
  qty: { type: Number, required: true },
  rate: { type: Number, required: true },
  taxRate: { type: Number, default: 0 }
}, { _id: false });

const purchaseReturnSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  number: { type: String, required: true },
  dateBS: { type: String, required: true },
  partyId: { type: String, required: true },
  purchaseId: { type: String },
  lines: [purchaseReturnLineSchema],
  total: { type: Number, required: true },
  settlement: { type: String, enum: ['CASH', 'CREDIT'], required: true }
}, { timestamps: true });

module.exports = mongoose.model('PurchaseReturn', purchaseReturnSchema);
