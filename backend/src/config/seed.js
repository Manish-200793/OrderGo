const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { initDatabase, getDb } = require('./database');

async function seed() {
  await initDatabase();
  const db = getDb();
  console.log('🌱 Seeding database...\n');

  try {
    const connection = await db.getConnection();

    // Clear existing data (disable FK checks temporarily)
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    await connection.query('TRUNCATE TABLE feedback');
    await connection.query('TRUNCATE TABLE transactions');
    await connection.query('TRUNCATE TABLE order_items');
    await connection.query('TRUNCATE TABLE orders');
    await connection.query('TRUNCATE TABLE menu_items');
    await connection.query('TRUNCATE TABLE students');
    await connection.query('TRUNCATE TABLE admins');
    await connection.query('TRUNCATE TABLE staff');
    await connection.query('TRUNCATE TABLE users');

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    // --- Seed Users ---
    const adminPassword = bcrypt.hashSync('admin123', 10);
    const studentPassword = bcrypt.hashSync('student123', 10);
    const staffPassword = bcrypt.hashSync('staff123', 10);

    let res;

    // Admin
    [res] = await connection.query('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', ['admin@ordergo.com', adminPassword, 'admin']);
    await connection.query('INSERT INTO admins (admin_id, name, email, phone) VALUES (?, ?, ?, ?)', [res.insertId, 'Admin User', 'admin@ordergo.com', '9876543210']);

    // Students
    [res] = await connection.query('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', ['rahul@college.edu', studentPassword, 'student']);
    let studentId1 = res.insertId;
    await connection.query('INSERT INTO students (student_id, name, email, phone, roll_number) VALUES (?, ?, ?, ?, ?)', [studentId1, 'Rahul Sharma', 'rahul@college.edu', '9876543211', 'CS2024001']);
    
    [res] = await connection.query('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', ['priya@college.edu', studentPassword, 'student']);
    let studentId2 = res.insertId;
    await connection.query('INSERT INTO students (student_id, name, email, phone, roll_number) VALUES (?, ?, ?, ?, ?)', [studentId2, 'Priya Patel', 'priya@college.edu', '9876543212', 'EC2024015']);

    [res] = await connection.query('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', ['amit@college.edu', studentPassword, 'student']);
    let studentId3 = res.insertId;
    await connection.query('INSERT INTO students (student_id, name, email, phone, roll_number) VALUES (?, ?, ?, ?, ?)', [studentId3, 'Amit Kumar', 'amit@college.edu', '9876543213', 'ME2024042']);

    [res] = await connection.query('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', ['24bk1a05r4@stpetershyd.com', studentPassword, 'student']);
    let studentId4 = res.insertId;
    await connection.query('INSERT INTO students (student_id, name, email, phone, roll_number) VALUES (?, ?, ?, ?, ?)', [studentId4, 'Anirudh', '24bk1a05r4@stpetershyd.com', '9876543214', 'BK2024054']);

    // Staff
    [res] = await connection.query('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', ['staff@ordergo.com', staffPassword, 'staff']);
    await connection.query('INSERT INTO staff (staff_id, name, email, phone) VALUES (?, ?, ?, ?)', [res.insertId, 'Staff User', 'staff@ordergo.com', '9876543220']);

    console.log('✅ Users seeded (including staff)');

    // --- Seed Menu Items ---
    const menuItems = [
      // Breakfast
      ['Masala Dosa', 'Crispy rice crepe with potato filling, served with sambar and chutney', 'breakfast', 60, 40, '/images/masala-dosa.jpg', 1, 1],
      ['Idli Sambar', 'Steamed rice cakes served with sambar and coconut chutney', 'breakfast', 40, 50, '/images/idli.jpg', 1, 0],
      ['Poha', 'Flattened rice cooked with onions, peanuts, and spices', 'breakfast', 30, 45, '/images/poha.jpg', 1, 0],
      ['Aloo Paratha', 'Stuffed potato flatbread served with curd and pickle', 'breakfast', 50, 35, '/images/aloo-paratha.jpg', 1, 0],
      ['Upma', 'Savory semolina porridge with vegetables', 'breakfast', 35, 40, '/images/upma.jpg', 1, 0],

      // Lunch
      ['Veg Thali', 'Complete meal with dal, sabzi, rice, roti, salad, and sweet', 'lunch', 120, 30, '/images/veg-thali.jpg', 1, 1],
      ['Chicken Biryani', 'Fragrant basmati rice layered with spiced chicken', 'lunch', 150, 25, '/images/biryani.jpg', 1, 0],
      ['Paneer Butter Masala', 'Creamy tomato-based curry with cottage cheese, served with naan', 'lunch', 130, 30, '/images/paneer.jpg', 1, 0],
      ['Rajma Chawal', 'Kidney bean curry served with steamed rice', 'lunch', 90, 35, '/images/rajma.jpg', 1, 0],
      ['Chole Bhature', 'Spicy chickpea curry with deep-fried bread', 'lunch', 100, 30, '/images/chole.jpg', 1, 0],

      // Snacks
      ['Samosa', 'Crispy pastry filled with spiced potatoes and peas', 'snacks', 20, 60, '/images/samosa.jpg', 1, 0],
      ['Vada Pav', 'Mumbai-style spicy potato fritter in a bun', 'snacks', 25, 50, '/images/vada-pav.jpg', 1, 1],
      ['Pav Bhaji', 'Mashed vegetable curry served with buttered bread rolls', 'snacks', 70, 35, '/images/pav-bhaji.jpg', 1, 0],
      ['Maggi Noodles', 'Quick-cooked instant noodles with vegetables', 'snacks', 40, 45, '/images/maggi.jpg', 1, 0],
      ['French Fries', 'Crispy golden potato fries with ketchup', 'snacks', 50, 40, '/images/fries.jpg', 1, 0],

      // Beverages
      ['Masala Chai', 'Hot spiced Indian tea with milk', 'beverages', 15, 80, '/images/chai.jpg', 1, 0],
      ['Cold Coffee', 'Chilled coffee blended with milk and ice cream', 'beverages', 60, 40, '/images/cold-coffee.jpg', 1, 1],
      ['Fresh Lime Soda', 'Refreshing lemon soda, sweet or salty', 'beverages', 35, 50, '/images/lime-soda.jpg', 1, 0],
      ['Mango Lassi', 'Thick mango yogurt drink', 'beverages', 50, 35, '/images/lassi.jpg', 1, 0],
      ['Buttermilk', 'Spiced yogurt drink with cumin and coriander', 'beverages', 20, 45, '/images/buttermilk.jpg', 1, 0],
    ];

    for (const item of menuItems) {
      await connection.query(`
        INSERT INTO menu_items (name, description, category, price, stock, image_url, is_available, is_daily_special) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, item);
    }

    console.log('✅ Menu items seeded (20 items)');

    // --- Seed Sample Orders ---
    const order1Id = 'ORD-' + Date.now().toString(36).toUpperCase() + '001';
    const order2Id = 'ORD-' + Date.now().toString(36).toUpperCase() + '002';
    const order3Id = 'ORD-' + Date.now().toString(36).toUpperCase() + '003';
    const order4Id = 'ORD-' + Date.now().toString(36).toUpperCase() + '004';
    const order5Id = 'ORD-' + Date.now().toString(36).toUpperCase() + '005';

    // Order 1: Rahul's completed order
    await connection.query(`INSERT INTO orders (order_id, user_id, total_price, status, payment_method, payment_status, qr_code, pickup_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
      [order1Id, studentId1, 210, 'completed', 'upi', 'success', `QR:${order1Id}`, 'pickup']);
    await connection.query(`INSERT INTO order_items (order_id, item_id, quantity, price_at_order) VALUES (?, ?, ?, ?)`, [order1Id, 6, 1, 120]);
    await connection.query(`INSERT INTO order_items (order_id, item_id, quantity, price_at_order) VALUES (?, ?, ?, ?)`, [order1Id, 17, 1, 60]);
    await connection.query(`INSERT INTO order_items (order_id, item_id, quantity, price_at_order) VALUES (?, ?, ?, ?)`, [order1Id, 16, 2, 15]);
    await connection.query(`INSERT INTO transactions (transaction_id, order_id, payment_method, amount, status) VALUES (?, ?, ?, ?, ?)`, 
      ['TXN-' + Date.now().toString(36).toUpperCase() + '001', order1Id, 'upi', 210, 'success']);

    // Order 2: Priya's preparing order
    await connection.query(`INSERT INTO orders (order_id, user_id, total_price, status, payment_method, payment_status, qr_code, pickup_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
      [order2Id, studentId2, 170, 'preparing', 'card', 'success', `QR:${order2Id}`, 'pickup']);
    await connection.query(`INSERT INTO order_items (order_id, item_id, quantity, price_at_order) VALUES (?, ?, ?, ?)`, [order2Id, 1, 1, 60]);
    await connection.query(`INSERT INTO order_items (order_id, item_id, quantity, price_at_order) VALUES (?, ?, ?, ?)`, [order2Id, 11, 2, 20]);
    await connection.query(`INSERT INTO order_items (order_id, item_id, quantity, price_at_order) VALUES (?, ?, ?, ?)`, [order2Id, 18, 2, 35]);
    await connection.query(`INSERT INTO transactions (transaction_id, order_id, payment_method, amount, status) VALUES (?, ?, ?, ?, ?)`, 
      ['TXN-' + Date.now().toString(36).toUpperCase() + '002', order2Id, 'card', 170, 'success']);

    // Order 3: Amit's pending order
    await connection.query(`INSERT INTO orders (order_id, user_id, total_price, status, payment_method, payment_status, qr_code, pickup_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
      [order3Id, studentId3, 280, 'pending', 'upi', 'success', `QR:${order3Id}`, 'pickup']);
    await connection.query(`INSERT INTO order_items (order_id, item_id, quantity, price_at_order) VALUES (?, ?, ?, ?)`, [order3Id, 7, 1, 150]);
    await connection.query(`INSERT INTO order_items (order_id, item_id, quantity, price_at_order) VALUES (?, ?, ?, ?)`, [order3Id, 8, 1, 130]);
    await connection.query(`INSERT INTO transactions (transaction_id, order_id, payment_method, amount, status) VALUES (?, ?, ?, ?, ?)`, 
      ['TXN-' + Date.now().toString(36).toUpperCase() + '003', order3Id, 'upi', 280, 'success']);

    // Order 4: Anirudh's pending order
    await connection.query(`INSERT INTO orders (order_id, user_id, total_price, status, payment_method, payment_status, qr_code, pickup_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
      [order4Id, studentId4, 95, 'pending', 'cash', 'pending', `QR:${order4Id}`, 'pickup']);
    await connection.query(`INSERT INTO order_items (order_id, item_id, quantity, price_at_order) VALUES (?, ?, ?, ?)`, [order4Id, 12, 2, 25]);
    await connection.query(`INSERT INTO order_items (order_id, item_id, quantity, price_at_order) VALUES (?, ?, ?, ?)`, [order4Id, 14, 1, 40]);
    await connection.query(`INSERT INTO order_items (order_id, item_id, quantity, price_at_order) VALUES (?, ?, ?, ?)`, [order4Id, 20, 1, 20]);
    await connection.query(`INSERT INTO transactions (transaction_id, order_id, payment_method, amount, status) VALUES (?, ?, ?, ?, ?)`, 
      ['TXN-' + Date.now().toString(36).toUpperCase() + '004', order4Id, 'cash', 95, 'pending']);

    // Order 5: Rahul's ready order
    await connection.query(`INSERT INTO orders (order_id, user_id, total_price, status, payment_method, payment_status, qr_code, pickup_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
      [order5Id, studentId1, 110, 'ready', 'upi', 'success', `QR:${order5Id}`, 'pickup']);
    await connection.query(`INSERT INTO order_items (order_id, item_id, quantity, price_at_order) VALUES (?, ?, ?, ?)`, [order5Id, 1, 1, 60]);
    await connection.query(`INSERT INTO order_items (order_id, item_id, quantity, price_at_order) VALUES (?, ?, ?, ?)`, [order5Id, 19, 1, 50]);
    await connection.query(`INSERT INTO transactions (transaction_id, order_id, payment_method, amount, status) VALUES (?, ?, ?, ?, ?)`, 
      ['TXN-' + Date.now().toString(36).toUpperCase() + '005', order5Id, 'upi', 110, 'success']);

    console.log('✅ Sample orders seeded');

    // --- Seed Feedback ---
    await connection.query(`INSERT INTO feedback (user_id, item_id, order_id, rating, comment) VALUES (?, ?, ?, ?, ?)`, [studentId1, 6, order1Id, 5, 'Amazing thali! Best value meal on campus.']);
    await connection.query(`INSERT INTO feedback (user_id, item_id, order_id, rating, comment) VALUES (?, ?, ?, ?, ?)`, [studentId1, 17, order1Id, 4, 'Cold coffee was great, could be a bit colder.']);
    await connection.query(`INSERT INTO feedback (user_id, item_id, order_id, rating, comment) VALUES (?, ?, ?, ?, ?)`, [studentId2, 1, null, 5, 'Best dosa I have ever had in the canteen!']);
    await connection.query(`INSERT INTO feedback (user_id, item_id, order_id, rating, comment) VALUES (?, ?, ?, ?, ?)`, [studentId3, 12, null, 4, 'Vada pav is always fresh and tasty.']);
    await connection.query(`INSERT INTO feedback (user_id, item_id, order_id, rating, comment) VALUES (?, ?, ?, ?, ?)`, [studentId2, 11, null, 3, 'Samosa was okay, filling could be spicier.']);

    console.log('✅ Feedback seeded');
    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Test Accounts:');
    console.log('   Admin:   admin@ordergo.com / admin123');
    console.log('   Staff:   staff@ordergo.com / staff123');
    console.log('   Student: rahul@college.edu / student123');
    console.log('   Student: priya@college.edu / student123');
    
    connection.release();
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed database:', err);
    process.exit(1);
  }
}

seed();
