const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, enum: ['IN', 'OUT'], required: true },
  dateBS: { type: String, required: true },
  partyId: { type: String, required: true },
  invoiceId: { type: String },
  purchaseId: { type: String },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['CASH', 'BANK', 'DIGITAL'], required: true },
  remarks: { type: String },
  note: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
