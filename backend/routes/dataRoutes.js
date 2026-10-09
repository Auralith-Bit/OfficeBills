const express = require('express');
const router = express.Router();
const pool = require('../db');
const { optionalAuth } = require('../middleware/authMiddleware');

router.use(optionalAuth);

// Helper to determine active vendorId
async function getActiveVendorId(req) {
  let candidate = null;
  if (req.user && req.user.vendorId) candidate = req.user.vendorId;
  else if (req.headers['x-vendor-id']) candidate = req.headers['x-vendor-id'];
  else if (req.body && req.body.vendorId) candidate = req.body.vendorId;
  else if (req.query.vendorId) candidate = req.query.vendorId;

  if (candidate) {
    const [rows] = await pool.query('SELECT id FROM vendors WHERE id = ?', [candidate]);
    if (rows.length > 0) return rows[0].id;
  }

  // Fallback: get first vendor from DB if any exists
  const [rows] = await pool.query('SELECT id FROM vendors ORDER BY created_at ASC LIMIT 1');
  if (rows.length > 0) return rows[0].id;

  return null;
}

// GET /api/data — Load all business data for current vendor
router.get('/', async (req, res) => {
  try {
    const vendorId = await getActiveVendorId(req);

    if (!vendorId) {
      // No vendor created yet in database
      return res.json({
        ok: true,
        data: {
          business: {
            name: '', address: '',
            phone: '', email: '', panVat: '',
            registrationType: 'VAT', invoicePrefix: 'INV-', nextInvoiceNo: 1, nextQuoteNo: 1, nextReturnNo: 1,
            nextPurchaseNo: 1, nextPurchaseReturnNo: 1,
            bankName: '', bankAccountName: '',
            bankAccountNumber: '', footerNote: 'Thank you for your business!',
          },
          parties: [
            {
              id: 'p_default_walkin',
              name: 'Walk-in Customer',
              type: 'CUSTOMER',
              panVatType: 'PAN',
              panVat: '',
              address: '',
              phone: ''
            }
          ],
          items: [],
          invoices: [],
          payments: [],
          stockMovements: [],
          expenses: [],
          salesReturns: [],
          purchases: [],
          purchaseReturns: [],
          dues: []
        }
      });
    }

    // 1. Fetch Vendor & Business Settings
    const [vendorRows] = await pool.query('SELECT * FROM vendors WHERE id = ?', [vendorId]);
    const vendor = vendorRows[0] || {};
    const [settingRows] = await pool.query('SELECT * FROM business_settings WHERE vendor_id = ?', [vendorId]);
    const settings = settingRows[0] || {};

    const business = {
      name: vendor.business_name || 'My Business',
      registrationType: vendor.registration_type || 'VAT',
      panVat: vendor.pan_vat || '',
      address: vendor.address || '',
      phone: vendor.phone || '',
      email: '',
      invoicePrefix: settings.invoice_prefix || 'INV-',
      nextInvoiceNo: Number(settings.next_invoice_no) || 1,
      nextQuoteNo: Number(settings.next_quote_no) || 1,
      nextReturnNo: Number(settings.next_return_no) || 1,
      nextPurchaseNo: Number(settings.next_purchase_no) || 1,
      nextPurchaseReturnNo: Number(settings.next_purchase_return_no) || 1,
      bankName: settings.bank_name || '',
      bankAccountName: settings.bank_account_name || '',
      bankAccountNumber: settings.bank_account_number || '',
      footerNote: settings.footer_note || 'Thank you for your business!',
    };

    // 2. Fetch Parties
    let [parties] = await pool.query(
      'SELECT id, name, type, pan_vat_type AS panVatType, pan_vat AS panVat, address, phone FROM parties WHERE vendor_id = ? ORDER BY created_at DESC',
      [vendorId]
    );

    // Ensure Walk-in Customer always exists
    if (!parties.some(p => p.name.trim().toLowerCase() === 'walk-in customer')) {
      const walkInId = `p_walkin_${vendorId}`;
      await pool.query(
        `INSERT IGNORE INTO parties (id, vendor_id, name, type, pan_vat_type, pan_vat, address, phone)
         VALUES (?, ?, 'Walk-in Customer', 'CUSTOMER', 'PAN', '', '', '')`,
        [walkInId, vendorId]
      );
      const [refreshed] = await pool.query(
        'SELECT id, name, type, pan_vat_type AS panVatType, pan_vat AS panVat, address, phone FROM parties WHERE vendor_id = ? ORDER BY created_at DESC',
        [vendorId]
      );
      parties = refreshed;
    }

    // 3. Fetch Items
    const [items] = await pool.query(
      'SELECT id, name, type, hsn_sac AS hsnSac, unit, CAST(price AS DOUBLE) AS price, CAST(tax_rate AS DOUBLE) AS taxRate, CAST(stock AS DOUBLE) AS stock, CAST(reorder_level AS DOUBLE) AS reorderLevel FROM items WHERE vendor_id = ? ORDER BY created_at DESC',
      [vendorId]
    );

    // 4. Fetch Invoices and their Lines
    const [invoiceRows] = await pool.query(
      'SELECT id, number, date_bs AS dateBS, party_id AS partyId, CAST(subtotal AS DOUBLE) AS subtotal, CAST(vat AS DOUBLE) AS vat, CAST(total AS DOUBLE) AS total, status FROM invoices WHERE vendor_id = ? ORDER BY created_at DESC',
      [vendorId]
    );

    const [allLines] = await pool.query(
      `SELECT il.invoice_id, il.item_id AS itemId, il.name, CAST(il.qty AS DOUBLE) AS qty, CAST(il.rate AS DOUBLE) AS rate, CAST(il.discount AS DOUBLE) AS discount, CAST(il.tax_rate AS DOUBLE) AS taxRate
       FROM invoice_lines il
       INNER JOIN invoices i ON il.invoice_id = i.id
       WHERE i.vendor_id = ?`,
      [vendorId]
    );

    const lineMap = {};
    allLines.forEach(l => {
      if (!lineMap[l.invoice_id]) lineMap[l.invoice_id] = [];
      lineMap[l.invoice_id].push({
        itemId: l.itemId,
        name: l.name,
        qty: l.qty,
        rate: l.rate,
        discount: l.discount,
        taxRate: l.taxRate
      });
    });

    const invoices = invoiceRows.map(inv => ({
      ...inv,
      lines: lineMap[inv.id] || []
    }));

    // 5. Fetch Payments
    const [payments] = await pool.query(
      'SELECT id, type, date_bs AS dateBS, party_id AS partyId, invoice_id AS invoiceId, purchase_id AS purchaseId, CAST(amount AS DOUBLE) AS amount, method, remarks, remarks AS note FROM payments WHERE vendor_id = ? ORDER BY created_at DESC',
      [vendorId]
    );

    // 6. Fetch Stock Movements
    const [stockMovements] = await pool.query(
      'SELECT id, date_bs AS dateBS, item_id AS itemId, type, CAST(qty AS DOUBLE) AS qty, reason, ref_no AS ref FROM stock_movements WHERE vendor_id = ? ORDER BY created_at DESC',
      [vendorId]
    );

    // 7. Fetch Expenses
    const [expenses] = await pool.query(
      'SELECT id, date_bs AS dateBS, category, CAST(amount AS DOUBLE) AS amount, note FROM expenses WHERE vendor_id = ? ORDER BY created_at DESC',
      [vendorId]
    );

    // 8. Fetch Purchases and Lines
    const [purchaseRows] = await pool.query(
      'SELECT id, number, supplier_bill_no AS supplierBillNo, date_bs AS dateBS, party_id AS partyId, CAST(subtotal AS DOUBLE) AS subtotal, CAST(vat AS DOUBLE) AS vat, CAST(total AS DOUBLE) AS total, status FROM purchases WHERE vendor_id = ? ORDER BY created_at DESC',
      [vendorId]
    );
    const [purLines] = await pool.query(
      `SELECT pl.purchase_id, pl.item_id AS itemId, pl.name, CAST(pl.qty AS DOUBLE) AS qty, CAST(pl.rate AS DOUBLE) AS rate, CAST(pl.discount AS DOUBLE) AS discount, CAST(pl.tax_rate AS DOUBLE) AS taxRate
       FROM purchase_lines pl
       INNER JOIN purchases p ON pl.purchase_id = p.id
       WHERE p.vendor_id = ?`,
      [vendorId]
    );
    const purLineMap = {};
    purLines.forEach(l => {
      if (!purLineMap[l.purchase_id]) purLineMap[l.purchase_id] = [];
      purLineMap[l.purchase_id].push({
        itemId: l.itemId, name: l.name, qty: l.qty, rate: l.rate, discount: l.discount, taxRate: l.taxRate
      });
    });
    const purchases = purchaseRows.map(p => ({ ...p, lines: purLineMap[p.id] || [] }));

    // 9. Fetch Dues (including invoiceId and invoiceNumber)
    const [dues] = await pool.query(
      'SELECT id, date_bs AS dateBS, party_id AS partyId, invoice_id AS invoiceId, invoice_number AS invoiceNumber, type, CAST(amount AS DOUBLE) AS amount, note FROM dues WHERE vendor_id = ? ORDER BY created_at DESC',
      [vendorId]
    );

    res.json({
      ok: true,
      data: {
        business,
        parties,
        items,
        invoices,
        payments,
        stockMovements,
        expenses,
        salesReturns: [],
        purchases,
        purchaseReturns: [],
        dues
      }
    });
  } catch (err) {
    console.error('GET /api/data error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/data/sync — Persist frontend changes to MySQL
router.post('/sync', async (req, res) => {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const conn = await pool.getConnection();
    try {
      const vendorId = await getActiveVendorId(req);
      if (!vendorId) {
        conn.release();
        return res.status(400).json({ ok: false, error: 'No active vendor context.' });
      }

    const {
      business, parties, items, invoices, payments,
      stockMovements, expenses,
      purchases, dues
    } = req.body;

    await conn.beginTransaction();

    // 1. Sync Business Settings
    if (business) {
      await conn.query(
        `INSERT INTO business_settings (vendor_id, invoice_prefix, next_invoice_no, next_quote_no, next_return_no, next_purchase_no, next_purchase_return_no, bank_name, bank_account_name, bank_account_number, footer_note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           invoice_prefix = VALUES(invoice_prefix),
           next_invoice_no = VALUES(next_invoice_no),
           next_quote_no = VALUES(next_quote_no),
           next_return_no = VALUES(next_return_no),
           next_purchase_no = VALUES(next_purchase_no),
           next_purchase_return_no = VALUES(next_purchase_return_no),
           bank_name = VALUES(bank_name),
           bank_account_name = VALUES(bank_account_name),
           bank_account_number = VALUES(bank_account_number),
           footer_note = VALUES(footer_note)`,
        [
          vendorId,
          business.invoicePrefix || 'INV-',
          business.nextInvoiceNo || 1,
          business.nextQuoteNo || 1,
          business.nextReturnNo || 1,
          business.nextPurchaseNo || 1,
          business.nextPurchaseReturnNo || 1,
          business.bankName || '',
          business.bankAccountName || '',
          business.bankAccountNumber || '',
          business.footerNote || ''
        ]
      );

      // If business name or registration type changed, also update vendor
      if (business.name || business.registrationType) {
        await conn.query(
          `UPDATE vendors SET
             business_name = COALESCE(?, business_name),
             registration_type = COALESCE(?, registration_type),
             pan_vat = COALESCE(?, pan_vat),
             address = COALESCE(?, address),
             phone = COALESCE(?, phone)
           WHERE id = ?`,
          [business.name, business.registrationType, business.panVat, business.address, business.phone, vendorId]
        );
      }
    }

    // 2. Sync Parties & Deletions
    if (parties && Array.isArray(parties)) {
      const partyIds = parties.map(p => p.id).filter(Boolean);
      if (partyIds.length > 0) {
        await conn.query('DELETE FROM parties WHERE vendor_id = ? AND id NOT IN (?)', [vendorId, partyIds]);
      } else {
        await conn.query('DELETE FROM parties WHERE vendor_id = ?', [vendorId]);
      }
      for (const p of parties) {
        await conn.query(
          `INSERT INTO parties (id, vendor_id, name, type, pan_vat_type, pan_vat, address, phone)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             type = VALUES(type),
             pan_vat_type = VALUES(pan_vat_type),
             pan_vat = VALUES(pan_vat),
             address = VALUES(address),
             phone = VALUES(phone)`,
          [p.id, vendorId, p.name, p.type, p.panVatType || 'PAN', p.panVat || '', p.address || '', p.phone || '']
        );
      }
    }

    // 3. Sync Items & Deletions
    if (items && Array.isArray(items)) {
      const itemIds = items.map(it => it.id).filter(Boolean);
      if (itemIds.length > 0) {
        await conn.query('DELETE FROM items WHERE vendor_id = ? AND id NOT IN (?)', [vendorId, itemIds]);
      } else {
        await conn.query('DELETE FROM items WHERE vendor_id = ?', [vendorId]);
      }
      for (const it of items) {
        await conn.query(
          `INSERT INTO items (id, vendor_id, name, type, hsn_sac, unit, price, tax_rate, stock, reorder_level)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             type = VALUES(type),
             hsn_sac = VALUES(hsn_sac),
             unit = VALUES(unit),
             price = VALUES(price),
             tax_rate = VALUES(tax_rate),
             stock = VALUES(stock),
             reorder_level = VALUES(reorder_level)`,
          [it.id, vendorId, it.name, it.type, it.hsnSac || '', it.unit || 'Pcs', it.price || 0, it.taxRate || 0, it.stock || 0, it.reorderLevel || 0]
        );
      }
    }

    // 4. Sync Invoices + Lines & Deletions
    if (invoices && Array.isArray(invoices)) {
      const invIds = invoices.map(i => i.id).filter(Boolean);
      if (invIds.length > 0) {
        await conn.query('DELETE FROM invoices WHERE vendor_id = ? AND id NOT IN (?)', [vendorId, invIds]);
      } else {
        await conn.query('DELETE FROM invoices WHERE vendor_id = ?', [vendorId]);
      }
      for (const inv of invoices) {
        await conn.query(
          `INSERT INTO invoices (id, vendor_id, number, date_bs, party_id, subtotal, vat, total, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             number = VALUES(number),
             date_bs = VALUES(date_bs),
             party_id = VALUES(party_id),
             subtotal = VALUES(subtotal),
             vat = VALUES(vat),
             total = VALUES(total),
             status = VALUES(status)`,
          [inv.id, vendorId, inv.number, inv.dateBS, inv.partyId, inv.subtotal || 0, inv.vat || 0, inv.total || 0, inv.status || 'UNPAID']
        );

        // Replace lines
        if (inv.lines && Array.isArray(inv.lines)) {
          await conn.query('DELETE FROM invoice_lines WHERE invoice_id = ?', [inv.id]);
          for (const l of inv.lines) {
            await conn.query(
              'INSERT INTO invoice_lines (invoice_id, item_id, name, qty, rate, discount, tax_rate) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [inv.id, l.itemId, l.name, l.qty, l.rate, l.discount || 0, l.taxRate || 0]
            );
          }
        }
      }
    }

    // 5. Sync Payments & Deletions
    if (payments && Array.isArray(payments)) {
      const payIds = payments.map(p => p.id).filter(Boolean);
      if (payIds.length > 0) {
        await conn.query('DELETE FROM payments WHERE vendor_id = ? AND id NOT IN (?)', [vendorId, payIds]);
      } else {
        await conn.query('DELETE FROM payments WHERE vendor_id = ?', [vendorId]);
      }
      for (const pay of payments) {
        await conn.query(
          `INSERT INTO payments (id, vendor_id, type, date_bs, party_id, invoice_id, purchase_id, amount, method, remarks)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             type = VALUES(type),
             date_bs = VALUES(date_bs),
             party_id = VALUES(party_id),
             invoice_id = VALUES(invoice_id),
             purchase_id = VALUES(purchase_id),
             amount = VALUES(amount),
             method = VALUES(method),
             remarks = VALUES(remarks)`,
          [pay.id, vendorId, pay.type, pay.dateBS, pay.partyId, pay.invoiceId || null, pay.purchaseId || null, pay.amount, pay.method || 'CASH', pay.remarks || pay.note || '']
        );
      }
    }

    // 6. Sync Stock Movements & Deletions
    if (stockMovements && Array.isArray(stockMovements)) {
      const movIds = stockMovements.map(m => m.id).filter(Boolean);
      if (movIds.length > 0) {
        await conn.query('DELETE FROM stock_movements WHERE vendor_id = ? AND id NOT IN (?)', [vendorId, movIds]);
      } else {
        await conn.query('DELETE FROM stock_movements WHERE vendor_id = ?', [vendorId]);
      }
      for (const m of stockMovements) {
        await conn.query(
          `INSERT INTO stock_movements (id, vendor_id, date_bs, item_id, type, qty, reason, ref_no)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             date_bs = VALUES(date_bs),
             item_id = VALUES(item_id),
             type = VALUES(type),
             qty = VALUES(qty),
             reason = VALUES(reason),
             ref_no = VALUES(ref_no)`,
          [m.id, vendorId, m.dateBS, m.itemId, m.type, m.qty, m.reason || '', m.ref || '']
        );
      }
    }

    // 7. Sync Expenses & Other Incomes & Deletions
    if (expenses && Array.isArray(expenses)) {
      const expIds = expenses.map(e => e.id).filter(Boolean);
      if (expIds.length > 0) {
        await conn.query('DELETE FROM expenses WHERE vendor_id = ? AND id NOT IN (?)', [vendorId, expIds]);
      } else {
        await conn.query('DELETE FROM expenses WHERE vendor_id = ?', [vendorId]);
      }
      for (const e of expenses) {
        await conn.query(
          `INSERT INTO expenses (id, vendor_id, date_bs, category, amount, note)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             date_bs = VALUES(date_bs),
             category = VALUES(category),
             amount = VALUES(amount),
             note = VALUES(note)`,
          [e.id, vendorId, e.dateBS, e.category, e.amount, e.note || '']
        );
      }
    }

    // 8. Sync Purchases + Lines & Deletions
    if (purchases && Array.isArray(purchases)) {
      const purIds = purchases.map(p => p.id).filter(Boolean);
      if (purIds.length > 0) {
        await conn.query('DELETE FROM purchases WHERE vendor_id = ? AND id NOT IN (?)', [vendorId, purIds]);
      } else {
        await conn.query('DELETE FROM purchases WHERE vendor_id = ?', [vendorId]);
      }
      for (const pur of purchases) {
        await conn.query(
          `INSERT INTO purchases (id, vendor_id, number, supplier_bill_no, date_bs, party_id, subtotal, vat, total, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             number = VALUES(number),
             supplier_bill_no = VALUES(supplier_bill_no),
             date_bs = VALUES(date_bs),
             party_id = VALUES(party_id),
             subtotal = VALUES(subtotal),
             vat = VALUES(vat),
             total = VALUES(total),
             status = VALUES(status)`,
          [pur.id, vendorId, pur.number, pur.supplierBillNo || '', pur.dateBS, pur.partyId, pur.subtotal || 0, pur.vat || 0, pur.total || 0, pur.status || 'UNPAID']
        );

        if (pur.lines && Array.isArray(pur.lines)) {
          await conn.query('DELETE FROM purchase_lines WHERE purchase_id = ?', [pur.id]);
          for (const l of pur.lines) {
            await conn.query(
              'INSERT INTO purchase_lines (purchase_id, item_id, name, qty, rate, discount, tax_rate) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [pur.id, l.itemId, l.name, l.qty, l.rate, l.discount || 0, l.taxRate || 0]
            );
          }
        }
      }
    }

    // 9. Sync Dues & Deletions (including invoice_id and invoice_number)
    if (dues && Array.isArray(dues)) {
      const dueIds = dues.map(d => d.id).filter(Boolean);
      if (dueIds.length > 0) {
        await conn.query('DELETE FROM dues WHERE vendor_id = ? AND id NOT IN (?)', [vendorId, dueIds]);
      } else {
        await conn.query('DELETE FROM dues WHERE vendor_id = ?', [vendorId]);
      }
      for (const d of dues) {
        await conn.query(
          `INSERT INTO dues (id, vendor_id, date_bs, party_id, invoice_id, invoice_number, type, amount, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             date_bs = VALUES(date_bs),
             party_id = VALUES(party_id),
             invoice_id = VALUES(invoice_id),
             invoice_number = VALUES(invoice_number),
             type = VALUES(type),
             amount = VALUES(amount),
             note = VALUES(note)`,
          [d.id, vendorId, d.dateBS, d.partyId, d.invoiceId || null, d.invoiceNumber || null, d.type, d.amount, d.note || '']
        );
      }
    }

      await conn.commit();
      conn.release();
      return res.json({ ok: true, message: 'All data synchronized successfully to MySQL.' });
    } catch (err) {
      await conn.rollback();
      conn.release();
      const isDeadlock = err.code === 'ER_LOCK_DEADLOCK' || err.errno === 1213;
      if (isDeadlock && attempt < maxRetries) {
        console.warn(`[Sync] Deadlock detected (attempt ${attempt}/${maxRetries}), retrying in ${50 * attempt}ms...`);
        await new Promise(r => setTimeout(r, 50 * attempt));
        continue;
      }
      console.error('POST /api/data/sync error:', err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }
});

module.exports = router;
