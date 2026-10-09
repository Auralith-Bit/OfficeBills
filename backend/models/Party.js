const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['CUSTOMER', 'SUPPLIER'], required: true },
  panVat: { type: String, default: '' },
  address: { type: String, default: '' },
  phone: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Party', partySchema);
