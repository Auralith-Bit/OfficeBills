const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { JWT_SECRET } = require('../middleware/authMiddleware');

// Helper to remove password from user object
const cleanUser = (u) => {
  if (!u) return null;
  const copy = { ...u };
  delete copy.password;
  copy.active = Boolean(copy.active);
  return copy;
};

// GET /api/auth/state — list vendors and users (without password)
router.get('/state', async (req, res) => {
  try {
    const [vendors] = await pool.query(
      'SELECT id, business_name AS businessName, registration_type AS registrationType, pan_vat AS panVat, address, phone, created_at AS createdAt FROM vendors ORDER BY created_at DESC'
    );
    const [users] = await pool.query(
      'SELECT id, vendor_id AS vendorId, name, email, role, phone, active FROM users'
    );

    res.json({
      ok: true,
      vendors,
      users: users.map(u => ({ ...u, active: Boolean(u.active) })),
    });
  } catch (err) {
    console.error('GET /api/auth/state error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/auth/signup — create vendor, admin user, and default settings
router.post('/signup', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { businessName, registrationType, panVat, address, phone, name, email, password } = req.body;

    if (!email || !password || !name || !businessName) {
      return res.status(400).json({ ok: false, error: 'All fields are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if email already registered
    const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ ok: false, error: 'An account with this email already exists.' });
    }

    await conn.beginTransaction();

    const vendorId = `v_${Date.now()}`;
    const userId = `u_${Date.now() + 1}`;
    const hashedPassword = await bcrypt.hash(password, 10);
    const regType = registrationType === 'PAN' ? 'PAN' : 'VAT';

    // 1. Insert Vendor
    await conn.query(
      'INSERT INTO vendors (id, business_name, registration_type, pan_vat, address, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [vendorId, (businessName || '').trim(), regType, (panVat || '').trim(), (address || '').trim(), (phone || '').trim()]
    );

    // 2. Insert Admin User
    await conn.query(
      'INSERT INTO users (id, vendor_id, name, email, password, role, phone, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, vendorId, (name || '').trim(), cleanEmail, hashedPassword, 'ADMIN', (phone || '').trim(), 1]
    );

    // 3. Insert Default Business Settings
    await conn.query(
      `INSERT INTO business_settings (vendor_id, invoice_prefix, next_invoice_no, next_quote_no, next_return_no, next_purchase_no, next_purchase_return_no, bank_name, bank_account_name, bank_account_number, footer_note)
       VALUES (?, 'INV-', 1, 1, 1, 1, 1, '', '', '', 'Thank you for your business!')`,
      [vendorId]
    );

    // 4. Insert Default Walk-in Customer
    const walkInPartyId = `p_walkin_${vendorId}`;
    await conn.query(
      `INSERT INTO parties (id, vendor_id, name, type, pan_vat_type, pan_vat, address, phone)
       VALUES (?, ?, 'Walk-in Customer', 'CUSTOMER', 'PAN', '', '', '')`,
      [walkInPartyId, vendorId]
    );

    await conn.commit();

    const token = jwt.sign(
      { userId, vendorId, role: 'ADMIN', email: cleanEmail },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const vendorObj = {
      id: vendorId,
      businessName: (businessName || '').trim(),
      registrationType: regType,
      panVat: (panVat || '').trim(),
      address: (address || '').trim(),
      phone: (phone || '').trim(),
    };

    const userObj = {
      id: userId,
      vendorId,
      name: (name || '').trim(),
      email: cleanEmail,
      role: 'ADMIN',
      phone: (phone || '').trim(),
      active: true,
    };

    console.log(`✅ Signup success: ${cleanEmail} (vendor: ${vendorId})`);

    res.json({
      ok: true,
      token,
      vendor: vendorObj,
      user: userObj,
      session: { userId, vendorId, token }
    });
  } catch (err) {
    await conn.rollback();
    console.error('POST /api/auth/signup error:', err);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    conn.release();
  }
});

// POST /api/auth/login — authenticate user with bcrypt and return JWT
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const [users] = await pool.query(
      'SELECT id, vendor_id, name, email, password, role, phone, active FROM users WHERE email = ?',
      [cleanEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({ ok: false, error: 'Invalid email or password.' });
    }

    const user = users[0];

    // Verify hashed password (or fallback check for plain text legacy accounts)
    const isMatch = await bcrypt.compare(password, user.password).catch(() => false) || user.password === password;
    if (!isMatch) {
      return res.status(401).json({ ok: false, error: 'Invalid email or password.' });
    }

    if (!user.active) {
      return res.status(403).json({ ok: false, error: 'This account has been deactivated. Contact your administrator.' });
    }

    const [vendors] = await pool.query(
      'SELECT id, business_name AS businessName, registration_type AS registrationType, pan_vat AS panVat, address, phone FROM vendors WHERE id = ?',
      [user.vendor_id]
    );

    const vendor = vendors.length > 0 ? vendors[0] : null;

    const token = jwt.sign(
      { userId: user.id, vendorId: user.vendor_id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const userObj = {
      id: user.id,
      vendorId: user.vendor_id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      active: Boolean(user.active),
    };

    console.log(`✅ Login success: ${cleanEmail}`);

    res.json({
      ok: true,
      token,
      user: userObj,
      vendor,
      session: { userId: user.id, vendorId: user.vendor_id, token }
    });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/auth/staff — add staff user under same vendor
router.post('/staff', async (req, res) => {
  try {
    const { vendorId, name, email, password, role, phone } = req.body;
    if (!vendorId || !email || !name) {
      return res.status(400).json({ ok: false, error: 'vendorId, name and email are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ ok: false, error: 'An account with this email already exists.' });
    }

    // Ensure vendor exists in vendors table
    await pool.query(
      `INSERT IGNORE INTO vendors (id, business_name, registration_type, pan_vat, address, phone)
       VALUES (?, 'My Business', 'VAT', '', '', '')`,
      [vendorId]
    );

    const userId = `u_${Date.now()}`;
    const rawPass = (password || '').trim() || 'aura123';
    const hashedPassword = await bcrypt.hash(rawPass, 10);
    const assignedRole = role === 'ADMIN' ? 'ADMIN' : 'CASHIER';

    await pool.query(
      'INSERT INTO users (id, vendor_id, name, email, password, role, phone, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, vendorId, (name || '').trim(), cleanEmail, hashedPassword, assignedRole, (phone || '').trim(), 1]
    );

    const userObj = {
      id: userId,
      vendorId,
      name: (name || '').trim(),
      email: cleanEmail,
      role: assignedRole,
      phone: (phone || '').trim(),
      active: true,
    };

    res.json({ ok: true, user: userObj });
  } catch (err) {
    console.error('POST /api/auth/staff error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /api/auth/staff/:id — update staff user
router.put('/staff/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, active, password } = req.body;

    const fields = [];
    const values = [];

    if (name !== undefined) { fields.push('name = ?'); values.push(name.trim()); }
    if (email !== undefined) { fields.push('email = ?'); values.push(email.trim().toLowerCase()); }
    if (phone !== undefined) { fields.push('phone = ?'); values.push(phone.trim()); }
    if (role !== undefined) { fields.push('role = ?'); values.push(role); }
    if (active !== undefined) { fields.push('active = ?'); values.push(active ? 1 : 0); }
    if (password) {
      const hashed = await bcrypt.hash(password.trim(), 10);
      fields.push('password = ?');
      values.push(hashed);
    }

    if (fields.length === 0) {
      return res.json({ ok: true });
    }

    values.push(id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

    const [rows] = await pool.query('SELECT id, vendor_id AS vendorId, name, email, role, phone, active FROM users WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ ok: false, error: 'User not found.' });

    res.json({ ok: true, user: { ...rows[0], active: Boolean(rows[0].active) } });
  } catch (err) {
    console.error('PUT /api/auth/staff error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /api/auth/staff/:id — delete staff user
router.delete('/staff/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/auth/staff error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
