const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetAndSeed() {
  const dbName = process.env.DB_NAME || 'office_bills';
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: dbName,
      port: Number(process.env.DB_PORT) || 3306,
    });

    console.log(`🧹 Clearing transactional data from "${dbName}"...`);
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');

    const tablesToClear = [
      'invoice_lines',
      'invoices',
      'purchase_lines',
      'purchases',
      'stock_movements',
      'payments',
      'expenses',
      'dues',
      'items',
      'parties',
    ];

    for (const tbl of tablesToClear) {
      await conn.query(`TRUNCATE TABLE \`${tbl}\``);
      console.log(`  ✓ Cleared table: ${tbl}`);
    }

    // Ensure payments table has `remarks` column
    const [colRemarks] = await conn.query("SHOW COLUMNS FROM payments LIKE 'remarks'");
    if (colRemarks.length === 0) {
      const [colNote] = await conn.query("SHOW COLUMNS FROM payments LIKE 'note'");
      if (colNote.length > 0) {
        await conn.query("ALTER TABLE payments CHANGE COLUMN note remarks TEXT;");
        console.log("  ✓ Renamed payments.note to payments.remarks");
      } else {
        await conn.query("ALTER TABLE payments ADD COLUMN remarks TEXT AFTER method;");
        console.log("  ✓ Added payments.remarks column");
      }
    } else {
      console.log("  ✓ payments.remarks column already exists");
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');

    // Get all vendors (or create default if none)
    let [vendors] = await conn.query('SELECT id FROM vendors');
    if (vendors.length === 0) {
      const defaultVendorId = `v_${Date.now()}`;
      await conn.query(
        "INSERT INTO vendors (id, business_name, registration_type, pan_vat, address, phone) VALUES (?, 'Aura Traders', 'VAT', '123456789', 'Kathmandu', '9800000000')",
        [defaultVendorId]
      );
      vendors = [{ id: defaultVendorId }];
    }

    console.log(`🌱 Seeding new Payment Out data according to image for ${vendors.length} vendor(s)...`);

    for (const v of vendors) {
      const vendorId = v.id;

      // 1. Default Walk-in Customer
      const walkinId = `p_walkin_${vendorId}`;
      await conn.query(
        "INSERT INTO parties (id, vendor_id, name, type, pan_vat_type, pan_vat, address, phone) VALUES (?, ?, 'Walk-in Customer', 'CUSTOMER', 'PAN', '', '', '')",
        [walkinId, vendorId]
      );

      // 2. Supplier "oho suppliers" from image
      const supplierId = `sup_oho_${vendorId}`;
      await conn.query(
        "INSERT INTO parties (id, vendor_id, name, type, pan_vat_type, pan_vat, address, phone) VALUES (?, ?, 'oho suppliers', 'SUPPLIER', 'PAN', '123456789', 'Kathmandu', '9800000000')",
        [supplierId, vendorId]
      );

      // 3. Purchase PUR-0001 from image (supplier: bil-es-11, Date 2083-06-22, Balance Rs. 97,778)
      const purchaseId = `pur_0001_${vendorId}`;
      await conn.query(
        `INSERT INTO purchases (id, vendor_id, number, supplier_bill_no, date_bs, party_id, subtotal, vat, total, status)
         VALUES (?, ?, 'PUR-0001', 'bil-es-11', '2083-06-22', ?, 97778.00, 0.00, 97778.00, 'UNPAID')`,
        [purchaseId, vendorId, supplierId]
      );

      // 4. Purchase Line for PUR-0001
      await conn.query(
        `INSERT INTO purchase_lines (purchase_id, item_id, name, qty, rate, discount, tax_rate)
         VALUES (?, NULL, 'Ashwin stock', 1, 97778.00, 0.00, 0.00)`,
        [purchaseId]
      );

      // 5. Update next purchase number in business settings
      await conn.query(
        `UPDATE business_settings SET next_purchase_no = 2 WHERE vendor_id = ?`,
        [vendorId]
      );

      console.log(`  ✓ Seeded "oho suppliers" and PUR-0001 (Rs. 97,778) for vendor ${vendorId}`);
    }

    console.log(`✅ Database successfully cleared, schema updated with "remarks", and seeded with new Payment Out data!`);
  } catch (err) {
    console.error('❌ Error in resetAndSeed:', err.message);
  } finally {
    if (conn) await conn.end();
    process.exit(0);
  }
}

resetAndSeed();
