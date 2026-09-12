const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  try {
    const conn = await mysql.createConnection(process.env.DATABASE_URL);
    await conn.query("ALTER TABLE menu_items MODIFY COLUMN category ENUM('breakfast', 'lunch', 'snacks', 'beverages', 'desserts') NOT NULL;");
    console.log('ALTER done');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
