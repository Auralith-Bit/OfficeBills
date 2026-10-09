const mysql = require('mysql2/promise');
require('dotenv').config();

async function wipeDatabase() {
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

    console.log(`🧹 Clearing all data from MySQL database "${dbName}"...`);
    
    // Disable foreign key checks for clean truncation
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');

    const tables = [
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
      'business_settings',
      'users',
      'vendors'
    ];

    for (const tbl of tables) {
      try {
        await conn.query(`TRUNCATE TABLE \`${tbl}\``);
        console.log(`  ✓ Cleared table: ${tbl}`);
      } catch (err) {
        console.warn(`  ⚠️ Could not truncate ${tbl}: ${err.message}`);
      }
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log(`✅ All database tables have been completely cleared!`);
  } catch (err) {
    console.error('❌ Error connecting or wiping database:', err.message);
  } finally {
    if (conn) await conn.end();
    process.exit(0);
  }
}

wipeDatabase();
