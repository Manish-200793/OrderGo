const bcrypt = require('bcryptjs');
const { getDb } = require('../config/database');
const { generateToken } = require('../middleware/auth');
const { sendResetCodeEmail } = require('../services/emailService');

// In-memory store for reset codes (in production, use DB or Redis)
const resetCodes = new Map();

/**
 * POST /api/auth/register
 */
function register(req, res) {
  const db = getDb();
  const { name, email, phone, roll_number, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const existing = db.prepare('SELECT user_id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const password_hash = bcrypt.hashSync(password, 10);

  const result = db.prepare(`
    INSERT INTO users (email, password_hash, role)
    VALUES (?, ?, 'student')
  `).run(email, password_hash);

  const userId = result.lastInsertRowid;

  db.prepare(`
    INSERT INTO students (student_id, name, email, phone, roll_number)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, name, email, phone || null, roll_number || null);

  const user = db.prepare(`
    SELECT u.user_id, u.email, u.role, s.name, s.phone, s.roll_number
    FROM users u
    JOIN students s ON u.user_id = s.student_id
    WHERE u.user_id = ?
  `).get(userId);

  const token = generateToken(user);

  res.status(201).json({
    message: 'Registration successful!',
    token,
    user: {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      roll_number: user.roll_number,
      role: user.role,
    },
  });
}

/**
 * POST /api/auth/login
 */
function login(req, res) {
  const db = getDb();
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  let roleData = {};
  if (user.role === 'student') {
    roleData = db.prepare('SELECT * FROM students WHERE student_id = ?').get(user.user_id);
  } else if (user.role === 'admin') {
    roleData = db.prepare('SELECT * FROM admins WHERE admin_id = ?').get(user.user_id);
  } else if (user.role === 'staff') {
    roleData = db.prepare('SELECT * FROM staff WHERE staff_id = ?').get(user.user_id);
  }

  const token = generateToken(user);

  res.json({
    message: 'Login successful!',
    token,
    user: {
      user_id: user.user_id,
      name: roleData.name,
      email: user.email,
      phone: roleData.phone,
      roll_number: roleData.roll_number || null,
      role: user.role,
      favorites: roleData.favorites ? JSON.parse(roleData.favorites) : [],
    },
  });
}

/**
 * GET /api/auth/me
 */
function getProfile(req, res) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  let roleData = {};
  if (user.role === 'student') {
    roleData = db.prepare('SELECT * FROM students WHERE student_id = ?').get(user.user_id);
  } else if (user.role === 'admin') {
    roleData = db.prepare('SELECT * FROM admins WHERE admin_id = ?').get(user.user_id);
  } else if (user.role === 'staff') {
    roleData = db.prepare('SELECT * FROM staff WHERE staff_id = ?').get(user.user_id);
  }

  res.json({
    user_id: user.user_id,
    name: roleData.name,
    email: user.email,
    phone: roleData.phone,
    roll_number: roleData.roll_number || null,
    role: user.role,
    favorites: roleData.favorites ? JSON.parse(roleData.favorites) : [],
    created_at: user.created_at,
  });
}

/**
 * PUT /api/auth/profile
 */
function updateProfile(req, res) {
  const db = getDb();
  const { name, phone, roll_number, favorites } = req.body;
  const userId = req.user.userId;

  const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (user.role === 'student') {
    db.prepare(`
      UPDATE students SET 
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        roll_number = COALESCE(?, roll_number),
        favorites = COALESCE(?, favorites)
      WHERE student_id = ?
    `).run(
      name || null,
      phone || null,
      roll_number || null,
      favorites ? JSON.stringify(favorites) : null,
      userId
    );
  } else if (user.role === 'admin') {
    db.prepare(`
      UPDATE admins SET 
        name = COALESCE(?, name),
        phone = COALESCE(?, phone)
      WHERE admin_id = ?
    `).run(name || null, phone || null, userId);
  } else if (user.role === 'staff') {
    db.prepare(`
      UPDATE staff SET 
        name = COALESCE(?, name),
        phone = COALESCE(?, phone)
      WHERE staff_id = ?
    `).run(name || null, phone || null, userId);
  }

  let roleData = {};
  if (user.role === 'student') {
    roleData = db.prepare('SELECT * FROM students WHERE student_id = ?').get(user.user_id);
  } else if (user.role === 'admin') {
    roleData = db.prepare('SELECT * FROM admins WHERE admin_id = ?').get(user.user_id);
  } else if (user.role === 'staff') {
    roleData = db.prepare('SELECT * FROM staff WHERE staff_id = ?').get(user.user_id);
  }

  res.json({
    message: 'Profile updated.',
    user: {
      user_id: user.user_id,
      name: roleData.name,
      email: user.email,
      phone: roleData.phone,
      roll_number: roleData.roll_number || null,
      role: user.role,
      favorites: roleData.favorites ? JSON.parse(roleData.favorites) : [],
    },
  });
}

/**
 * POST /api/auth/forgot-password
 * Generates a 6-digit reset code and sends it via email
 */
async function forgotPassword(req, res) {
  const db = getDb();
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.json({ message: 'If an account with that email exists, a reset code has been sent.' });
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Store with 10-minute expiry
  resetCodes.set(email.toLowerCase(), {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000,
    userId: user.user_id,
  });

  try {
    let name = '';
    if (user.role === 'student') name = db.prepare('SELECT name FROM students WHERE student_id = ?').get(user.user_id)?.name;
    else if (user.role === 'admin') name = db.prepare('SELECT name FROM admins WHERE admin_id = ?').get(user.user_id)?.name;
    else if (user.role === 'staff') name = db.prepare('SELECT name FROM staff WHERE staff_id = ?').get(user.user_id)?.name;
    
    const result = await sendResetCodeEmail(email, name || 'User', code);
    console.log(`🔐 Reset code for ${email}: ${code}`);

    res.json({
      message: 'If an account with that email exists, a reset code has been sent.',
      previewUrl: result.previewUrl || null,
    });
  } catch (err) {
    console.error('Failed to send reset email:', err);
    res.status(500).json({ error: 'Failed to send reset email. Please try again.' });
  }
}

/**
 * POST /api/auth/verify-reset-code
 */
function verifyResetCode(req, res) {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required.' });
  }

  const stored = resetCodes.get(email.toLowerCase());
  if (!stored) {
    return res.status(400).json({ error: 'No reset code found. Please request a new one.' });
  }

  if (Date.now() > stored.expiresAt) {
    resetCodes.delete(email.toLowerCase());
    return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
  }

  if (stored.code !== code) {
    return res.status(400).json({ error: 'Invalid reset code.' });
  }

  res.json({ message: 'Code verified. You can now reset your password.', valid: true });
}

/**
 * POST /api/auth/reset-password
 */
function resetPassword(req, res) {
  const db = getDb();
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, code, and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const stored = resetCodes.get(email.toLowerCase());
  if (!stored) {
    return res.status(400).json({ error: 'No reset code found. Please request a new one.' });
  }

  if (Date.now() > stored.expiresAt) {
    resetCodes.delete(email.toLowerCase());
    return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
  }

  if (stored.code !== code) {
    return res.status(400).json({ error: 'Invalid reset code.' });
  }

  const password_hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE user_id = ?').run(password_hash, stored.userId);

  resetCodes.delete(email.toLowerCase());

  res.json({ message: 'Password reset successful! You can now log in with your new password.' });
}

module.exports = { register, login, getProfile, updateProfile, forgotPassword, verifyResetCode, resetPassword };
