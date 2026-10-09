const mysql = require('mysql2/promise');
require('dotenv').config();

const schemaQueries = [
  // 1. Vendors
  `CREATE TABLE IF NOT EXISTS vendors (
    id VARCHAR(64) PRIMARY KEY,
    business_name VARCHAR(150) NOT NULL,
    registration_type ENUM('PAN', 'VAT') DEFAULT 'VAT',
    pan_vat VARCHAR(50) DEFAULT '',
    address VARCHAR(255) DEFAULT '',
    phone VARCHAR(50) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB;`,

  // 2. Users
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    vendor_id VARCHAR(64) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'CASHIER') DEFAULT 'ADMIN',
    phone VARCHAR(50) DEFAULT '',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
  ) ENGINE=InnoDB;`,

  // 3. Business Settings
  `CREATE TABLE IF NOT EXISTS business_settings (
    vendor_id VARCHAR(64) PRIMARY KEY,
    invoice_prefix VARCHAR(20) DEFAULT 'INV-',
    next_invoice_no INT DEFAULT 1,
    next_quote_no INT DEFAULT 1,
    next_return_no INT DEFAULT 1,
    next_purchase_no INT DEFAULT 1,
    next_purchase_return_no INT DEFAULT 1,
    bank_name VARCHAR(100) DEFAULT '',
    bank_account_name VARCHAR(150) DEFAULT '',
    bank_account_number VARCHAR(100) DEFAULT '',
    footer_note TEXT,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
  ) ENGINE=InnoDB;`,

  // 4. Parties
  `CREATE TABLE IF NOT EXISTS parties (
    id VARCHAR(64) PRIMARY KEY,
    vendor_id VARCHAR(64) NOT NULL,
    name VARCHAR(150) NOT NULL,
    type ENUM('CUSTOMER', 'SUPPLIER') NOT NULL,
    pan_vat_type ENUM('PAN', 'VAT') DEFAULT 'PAN',
    pan_vat VARCHAR(50) DEFAULT '',
    address VARCHAR(255) DEFAULT '',
    phone VARCHAR(50) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
  ) ENGINE=InnoDB;`,

  // 5. Items
  `CREATE TABLE IF NOT EXISTS items (
    id VARCHAR(64) PRIMARY KEY,
    vendor_id VARCHAR(64) NOT NULL,
    name VARCHAR(150) NOT NULL,
    type ENUM('PRODUCT', 'SERVICE') NOT NULL,
    hsn_sac VARCHAR(50) DEFAULT '',
    unit VARCHAR(30) DEFAULT 'Pcs',
    price DECIMAL(12,2) DEFAULT 0.00,
    tax_rate DECIMAL(5,2) DEFAULT 0.00,
    stock DECIMAL(12,2) DEFAULT 0.00,
    reorder_level DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
  ) ENGINE=InnoDB;`,

  // 6. Invoices
  `CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(64) PRIMARY KEY,
    vendor_id VARCHAR(64) NOT NULL,
    number VARCHAR(50) NOT NULL,
    date_bs VARCHAR(20) NOT NULL,
    party_id VARCHAR(64) DEFAULT NULL,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    vat DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status ENUM('PAID', 'UNPAID', 'OVERDUE', 'DRAFT') DEFAULT 'UNPAID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL
  ) ENGINE=InnoDB;`,

  // 7. Invoice Lines
  `CREATE TABLE IF NOT EXISTS invoice_lines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id VARCHAR(64) NOT NULL,
    item_id VARCHAR(64) DEFAULT NULL,
    name VARCHAR(150) NOT NULL,
    qty DECIMAL(10,2) NOT NULL,
    rate DECIMAL(12,2) NOT NULL,
    discount DECIMAL(12,2) DEFAULT 0.00,
    tax_rate DECIMAL(5,2) DEFAULT 0.00,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
  ) ENGINE=InnoDB;`,

  // 8. Payments
  `CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(64) PRIMARY KEY,
    vendor_id VARCHAR(64) NOT NULL,
    type ENUM('IN', 'OUT') NOT NULL,
    date_bs VARCHAR(20) NOT NULL,
    party_id VARCHAR(64) DEFAULT NULL,
    invoice_id VARCHAR(64) DEFAULT NULL,
    purchase_id VARCHAR(64) DEFAULT NULL,
    amount DECIMAL(12,2) NOT NULL,
    method ENUM('CASH', 'BANK', 'DIGITAL') DEFAULT 'CASH',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
  ) ENGINE=InnoDB;`,

  // 9. Stock Movements
  `CREATE TABLE IF NOT EXISTS stock_movements (
    id VARCHAR(64) PRIMARY KEY,
    vendor_id VARCHAR(64) NOT NULL,
    date_bs VARCHAR(20) NOT NULL,
    item_id VARCHAR(64) DEFAULT NULL,
    type ENUM('IN', 'OUT', 'ADJUST') NOT NULL,
    qty DECIMAL(10,2) NOT NULL,
    reason VARCHAR(255) DEFAULT '',
    ref_no VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
  ) ENGINE=InnoDB;`,

  // 10. Expenses
  `CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(64) PRIMARY KEY,
    vendor_id VARCHAR(64) NOT NULL,
    date_bs VARCHAR(20) NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
  ) ENGINE=InnoDB;`,

  // 11. Purchases
  `CREATE TABLE IF NOT EXISTS purchases (
    id VARCHAR(64) PRIMARY KEY,
    vendor_id VARCHAR(64) NOT NULL,
    number VARCHAR(50) NOT NULL,
    supplier_bill_no VARCHAR(50) DEFAULT '',
    date_bs VARCHAR(20) NOT NULL,
    party_id VARCHAR(64) DEFAULT NULL,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    vat DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status ENUM('PAID', 'UNPAID') DEFAULT 'UNPAID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL
  ) ENGINE=InnoDB;`,

  // 12. Purchase Lines
  `CREATE TABLE IF NOT EXISTS purchase_lines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_id VARCHAR(64) NOT NULL,
    item_id VARCHAR(64) DEFAULT NULL,
    name VARCHAR(150) NOT NULL,
    qty DECIMAL(10,2) NOT NULL,
    rate DECIMAL(12,2) NOT NULL,
    discount DECIMAL(12,2) DEFAULT 0.00,
    tax_rate DECIMAL(5,2) DEFAULT 0.00,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
  ) ENGINE=InnoDB;`,

  // 13. Dues
  `CREATE TABLE IF NOT EXISTS dues (
    id VARCHAR(64) PRIMARY KEY,
    vendor_id VARCHAR(64) NOT NULL,
    date_bs VARCHAR(20) NOT NULL,
    party_id VARCHAR(64) DEFAULT NULL,
    invoice_id VARCHAR(64) DEFAULT NULL,
    invoice_number VARCHAR(50) DEFAULT NULL,
    type ENUM('ADD', 'REDUCE') NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
  ) ENGINE=InnoDB;`
];

async function initializeDatabase() {
  const dbName = process.env.DB_NAME || 'office_bills';
  let serverConn;
  let conn;
  try {
    // 1. Connect to MySQL server first (to create database if needed)
    serverConn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: Number(process.env.DB_PORT) || 3306,
    });

    console.log(`⏳ Ensuring database "${dbName}" exists...`);
    await serverConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await serverConn.end();

    // 2. Connect directly to target database
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: dbName,
      port: Number(process.env.DB_PORT) || 3306,
    });

    // 3. Drop removed tables if they exist
    console.log('⏳ Cleaning up deprecated tables (quotation_lines, quotations, other_incomes)...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');
    await conn.query('DROP TABLE IF EXISTS quotation_lines;');
    await conn.query('DROP TABLE IF EXISTS quotations;');
    await conn.query('DROP TABLE IF EXISTS other_incomes;');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log(`⏳ Creating database tables in "${dbName}"...`);
    for (const sql of schemaQueries) {
      await conn.query(sql);
    }

    // 4. Ensure dues table has invoice columns if already created earlier
    try {
      const [colInvoiceId] = await conn.query("SHOW COLUMNS FROM dues LIKE 'invoice_id'");
      if (colInvoiceId.length === 0) {
        await conn.query("ALTER TABLE dues ADD COLUMN invoice_id VARCHAR(64) DEFAULT NULL AFTER party_id;");
      }
      const [colInvoiceNumber] = await conn.query("SHOW COLUMNS FROM dues LIKE 'invoice_number'");
      if (colInvoiceNumber.length === 0) {
        await conn.query("ALTER TABLE dues ADD COLUMN invoice_number VARCHAR(50) DEFAULT NULL AFTER invoice_id;");
      }
      const [colRemarks] = await conn.query("SHOW COLUMNS FROM payments LIKE 'remarks'");
      if (colRemarks.length === 0) {
        const [colNote] = await conn.query("SHOW COLUMNS FROM payments LIKE 'note'");
        if (colNote.length > 0) {
          await conn.query("ALTER TABLE payments CHANGE COLUMN note remarks TEXT;");
        } else {
          await conn.query("ALTER TABLE payments ADD COLUMN remarks TEXT AFTER method;");
        }
      }
    } catch (migErr) {
      console.warn('Note on column check:', migErr.message);
    }

    // 5. Ensure existing vendors have default Walk-in Customer
    try {
      const [vendors] = await conn.query("SELECT id FROM vendors");
      for (const v of vendors) {
        const [existing] = await conn.query(
          "SELECT id FROM parties WHERE vendor_id = ? AND LOWER(TRIM(name)) = 'walk-in customer'",
          [v.id]
        );
        if (existing.length === 0) {
          await conn.query(
            "INSERT INTO parties (id, vendor_id, name, type, pan_vat_type, pan_vat, address, phone) VALUES (?, ?, 'Walk-in Customer', 'CUSTOMER', 'PAN', '', '', '')",
            [`p_walkin_${v.id}`, v.id]
          );
        }
      }
    } catch (walkInErr) {
      console.warn('Note on default customer setup:', walkInErr.message);
    }

    console.log('✅ All MySQL tables initialized cleanly in "' + dbName + '"!');
  } catch (err) {
    console.error('❌ Error initializing tables:', err.message);
  } finally {
    if (conn) await conn.end();
    process.exit(0);
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
