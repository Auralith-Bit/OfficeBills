const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  businessName: { type: String, required: true },
  registrationType: { type: String, default: 'VAT' },
  panVat: { type: String, default: '' },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });

module.exports = mongoose.model('Vendor', vendorSchema);
