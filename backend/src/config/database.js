const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

let pool;

async function initDatabase() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error('❌ DATABASE_URL is not defined in .env');
    console.error('You need a MySQL connection string (e.g., from Aiven or Railway) to start the server.');
    console.error('Format: mysql://user:password@host:port/database');
    process.exit(1);
  }

  pool = mysql.createPool({
    uri: dbUrl,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL database');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('student', 'admin', 'staff') NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS students (
        student_id INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        roll_number VARCHAR(50),
        favorites TEXT,
        FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS admins (
        admin_id INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS staff (
        staff_id INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        FOREIGN KEY (staff_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        item_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category ENUM('breakfast', 'lunch', 'snacks', 'beverages') NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        stock INT DEFAULT 50,
        image_url VARCHAR(255),
        is_available BOOLEAN DEFAULT 1,
        is_daily_special BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        order_id VARCHAR(50) PRIMARY KEY,
        user_id INT NOT NULL,
        guest_name VARCHAR(255) DEFAULT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        status ENUM('pending', 'preparing', 'ready', 'completed', 'cancelled') DEFAULT 'pending',
        payment_method ENUM('cash', 'upi', 'card'),
        payment_status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
        qr_code TEXT,
        pickup_type ENUM('pickup', 'delivery') DEFAULT 'pickup',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL,
        item_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        price_at_order DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES menu_items(item_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        transaction_id VARCHAR(50) PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
        gateway_ref VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        feedback_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        item_id INT NOT NULL,
        order_id VARCHAR(50),
        rating INT NOT NULL CHECK(rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (item_id) REFERENCES menu_items(item_id),
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
      )
    `);

    // Indexes
    await connection.query('CREATE INDEX idx_orders_user ON orders(user_id)');
    await connection.query('CREATE INDEX idx_orders_status ON orders(status)');
    await connection.query('CREATE INDEX idx_order_items_order ON order_items(order_id)');
    await connection.query('CREATE INDEX idx_feedback_item ON feedback(item_id)');
    await connection.query('CREATE INDEX idx_menu_category ON menu_items(category)');

    connection.release();
    console.log('✅ MySQL tables synchronized');
  } catch (err) {
    // Indexes might already exist, MySQL throws error on create index if it exists unless we check.
    // It's fine to ignore index exists errors or wrap them. Let's just catch and ignore ER_DUP_KEYname for indexes
    if (err.code !== 'ER_DUP_KEYNAME') {
      console.error('❌ Failed to connect or sync MySQL:', err);
    }
  }
}

function getDb() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initDatabase first.');
  }
  return pool;
}

module.exports = { initDatabase, getDb };
