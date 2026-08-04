const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const DB_PATH = path.resolve(__dirname, '..', '..', process.env.DB_PATH || './ordergo.db');

let db = null;
let SQL = null;

/**
 * Wrapper around sql.js to provide a better-sqlite3 compatible API.
 * This allows all controllers to work without changes.
 */
class DatabaseWrapper {
  constructor(sqlDb) {
    this._db = sqlDb;
  }

  /** Save database to file */
  _save() {
    const data = this._db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }

  /** Execute raw SQL (multi-statement) */
  exec(sql) {
    this._db.run(sql);
    this._save();
  }

  /** No-op for sql.js compatibility */
  pragma() {}

  /**
   * Prepare a statement — returns an object with .all(), .get(), .run()
   * that mimics better-sqlite3's synchronous API
   */
  prepare(sql) {
    const self = this;
    return {
      /** Return all matching rows as an array of objects */
      all(...params) {
        const flatParams = flattenParams(params);
        try {
          const stmt = self._db.prepare(sql);
          if (flatParams.length > 0) stmt.bind(flatParams);
          const rows = [];
          while (stmt.step()) {
            rows.push(stmt.getAsObject());
          }
          stmt.free();
          return rows;
        } catch (e) {
          console.error('SQL Error (all):', sql, flatParams, e.message);
          return [];
        }
      },

      /** Return the first matching row as an object, or undefined */
      get(...params) {
        const flatParams = flattenParams(params);
        try {
          const stmt = self._db.prepare(sql);
          if (flatParams.length > 0) stmt.bind(flatParams);
          let row = undefined;
          if (stmt.step()) {
            row = stmt.getAsObject();
          }
          stmt.free();
          return row;
        } catch (e) {
          console.error('SQL Error (get):', sql, flatParams, e.message);
          return undefined;
        }
      },

      /** Execute a write statement, return { changes, lastInsertRowid } */
      run(...params) {
        const flatParams = flattenParams(params);
        try {
          self._db.run(sql, flatParams);
          const changes = self._db.getRowsModified();
          // Get last insert rowid
          const lastIdResult = self._db.exec('SELECT last_insert_rowid() as id');
          const lastInsertRowid = lastIdResult.length > 0 ? lastIdResult[0].values[0][0] : 0;
          self._save();
          return { changes, lastInsertRowid };
        } catch (e) {
          console.error('SQL Error (run):', sql, flatParams, e.message);
          throw e;
        }
      },
    };
  }

  /**
   * Transaction wrapper — executes the function atomically
   */
  transaction(fn) {
    const self = this;
    return function (...args) {
      self._db.run('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        self._db.run('COMMIT');
        self._save();
        return result;
      } catch (e) {
        self._db.run('ROLLBACK');
        throw e;
      }
    };
  }
}

/** Flatten params — handles both spread args and array args */
function flattenParams(params) {
  if (params.length === 0) return [];
  if (params.length === 1 && Array.isArray(params[0])) return params[0];
  return params;
}

/**
 * Initialize the database (async, but we block on it at module load)
 */
async function initDatabase() {
  SQL = await initSqlJs();

  // Load existing database file or create new
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new DatabaseWrapper(new SQL.Database(fileBuffer));
    console.log('📂 Loaded existing database from', DB_PATH);
  } else {
    db = new DatabaseWrapper(new SQL.Database());
    console.log('✨ Created new database');
  }

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'admin', 'staff')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS students (
      student_id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      roll_number TEXT,
      favorites TEXT DEFAULT '[]',
      FOREIGN KEY (student_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS admins (
      admin_id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      FOREIGN KEY (admin_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS staff (
      staff_id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      FOREIGN KEY (staff_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      item_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL CHECK(category IN ('breakfast', 'lunch', 'snacks', 'beverages')),
      price REAL NOT NULL,
      stock INTEGER DEFAULT 50,
      image_url TEXT,
      is_available INTEGER DEFAULT 1,
      is_daily_special INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      order_id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      total_price REAL NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
      payment_method TEXT CHECK(payment_method IN ('cash', 'upi', 'card')),
      payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'success', 'failed')),
      qr_code TEXT,
      pickup_type TEXT DEFAULT 'pickup' CHECK(pickup_type IN ('pickup', 'delivery')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      price_at_order REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(order_id),
      FOREIGN KEY (item_id) REFERENCES menu_items(item_id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      transaction_id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'success', 'failed')),
      gateway_ref TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(order_id)
    );

    CREATE TABLE IF NOT EXISTS feedback (
      feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      order_id TEXT,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id),
      FOREIGN KEY (item_id) REFERENCES menu_items(item_id),
      FOREIGN KEY (order_id) REFERENCES orders(order_id)
    );

    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_item ON feedback(item_id);
    CREATE INDEX IF NOT EXISTS idx_menu_category ON menu_items(category);
  `);

  return db;
}

// We need to export a promise that resolves to the db
// The server.js will await this before starting
module.exports = { initDatabase, getDb: () => db };
