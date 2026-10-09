const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  dateBS: { type: String, required: true },
  itemId: { type: String, required: true },
  type: { type: String, enum: ['IN', 'OUT', 'ADJUST'], required: true },
  qty: { type: Number, required: true },
  reason: { type: String, required: true },
  ref: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
