const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['PRODUCT', 'SERVICE'], required: true },
  hsnSac: { type: String, default: '' },
  unit: { type: String, default: 'Pcs' },
  price: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Item', itemSchema);
