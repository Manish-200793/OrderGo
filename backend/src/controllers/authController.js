const bcrypt = require('bcryptjs');
const { getDb } = require('../config/database');
const { generateToken } = require('../middleware/auth');
const { sendResetCodeEmail } = require('../services/emailService');

// In-memory store for reset codes (in production, use DB or Redis)
const resetCodes = new Map();

/**
 * POST /api/auth/register
 */
async function register(req, res) {
  const db = getDb();
  const { name, email, phone, roll_number, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  try {
    const [existing] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const password_hash = bcrypt.hashSync(password, 10);

    const [result] = await db.query(`
      INSERT INTO users (email, password_hash, role)
      VALUES (?, ?, 'student')
    `, [email, password_hash]);

    const userId = result.insertId;

    await db.query(`
      INSERT INTO students (student_id, name, email, phone, roll_number)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, name, email, phone || null, roll_number || null]);

    const [userRows] = await db.query(`
      SELECT u.user_id, u.email, u.role, s.name, s.phone, s.roll_number
      FROM users u
      JOIN students s ON u.user_id = s.student_id
      WHERE u.user_id = ?
    `, [userId]);

    const user = userRows[0];
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  const db = getDb();
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = users[0];
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    let roleData = {};
    if (user.role === 'student') {
      const [rows] = await db.query('SELECT * FROM students WHERE student_id = ?', [user.user_id]);
      roleData = rows[0] || {};
    } else if (user.role === 'admin') {
      const [rows] = await db.query('SELECT * FROM admins WHERE admin_id = ?', [user.user_id]);
      roleData = rows[0] || {};
    } else if (user.role === 'staff') {
      const [rows] = await db.query('SELECT * FROM staff WHERE staff_id = ?', [user.user_id]);
      roleData = rows[0] || {};
    }

    const token = generateToken(user);

    let favorites = [];
    if (roleData.favorites) {
      try {
        favorites = typeof roleData.favorites === 'string' ? JSON.parse(roleData.favorites) : roleData.favorites;
      } catch (e) {
        favorites = [];
      }
    }

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
        favorites,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/auth/me
 */
async function getProfile(req, res) {
  const db = getDb();
  
  try {
    const [users] = await db.query('SELECT * FROM users WHERE user_id = ?', [req.user.userId]);
    const user = users[0];
    
    if (!user) return res.status(404).json({ error: 'User not found.' });

    let roleData = {};
    if (user.role === 'student') {
      const [rows] = await db.query('SELECT * FROM students WHERE student_id = ?', [user.user_id]);
      roleData = rows[0] || {};
    } else if (user.role === 'admin') {
      const [rows] = await db.query('SELECT * FROM admins WHERE admin_id = ?', [user.user_id]);
      roleData = rows[0] || {};
    } else if (user.role === 'staff') {
      const [rows] = await db.query('SELECT * FROM staff WHERE staff_id = ?', [user.user_id]);
      roleData = rows[0] || {};
    }

    let favorites = [];
    if (roleData.favorites) {
      try {
        favorites = typeof roleData.favorites === 'string' ? JSON.parse(roleData.favorites) : roleData.favorites;
      } catch (e) {
        favorites = [];
      }
    }

    res.json({
      user_id: user.user_id,
      name: roleData.name,
      email: user.email,
      phone: roleData.phone,
      roll_number: roleData.roll_number || null,
      role: user.role,
      favorites,
      created_at: user.created_at,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/auth/profile
 */
async function updateProfile(req, res) {
  const db = getDb();
  const { name, phone, roll_number, favorites } = req.body;
  const userId = req.user.userId;

  try {
    const [users] = await db.query('SELECT * FROM users WHERE user_id = ?', [userId]);
    const user = users[0];
    
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (user.role === 'student') {
      await db.query(`
        UPDATE students SET 
          name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          roll_number = COALESCE(?, roll_number),
          favorites = COALESCE(?, favorites)
        WHERE student_id = ?
      `, [
        name || null,
        phone || null,
        roll_number || null,
        favorites ? JSON.stringify(favorites) : null,
        userId
      ]);
    } else if (user.role === 'admin') {
      await db.query(`
        UPDATE admins SET 
          name = COALESCE(?, name),
          phone = COALESCE(?, phone)
        WHERE admin_id = ?
      `, [name || null, phone || null, userId]);
    } else if (user.role === 'staff') {
      await db.query(`
        UPDATE staff SET 
          name = COALESCE(?, name),
          phone = COALESCE(?, phone)
        WHERE staff_id = ?
      `, [name || null, phone || null, userId]);
    }

    let roleData = {};
    if (user.role === 'student') {
      const [rows] = await db.query('SELECT * FROM students WHERE student_id = ?', [user.user_id]);
      roleData = rows[0] || {};
    } else if (user.role === 'admin') {
      const [rows] = await db.query('SELECT * FROM admins WHERE admin_id = ?', [user.user_id]);
      roleData = rows[0] || {};
    } else if (user.role === 'staff') {
      const [rows] = await db.query('SELECT * FROM staff WHERE staff_id = ?', [user.user_id]);
      roleData = rows[0] || {};
    }

    let parsedFavorites = [];
    if (roleData.favorites) {
      try {
        parsedFavorites = typeof roleData.favorites === 'string' ? JSON.parse(roleData.favorites) : roleData.favorites;
      } catch (e) {
        parsedFavorites = [];
      }
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
        favorites: parsedFavorites,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
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

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = users[0];
    
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

    let name = '';
    if (user.role === 'student') {
      const [rows] = await db.query('SELECT name FROM students WHERE student_id = ?', [user.user_id]);
      name = rows[0]?.name;
    } else if (user.role === 'admin') {
      const [rows] = await db.query('SELECT name FROM admins WHERE admin_id = ?', [user.user_id]);
      name = rows[0]?.name;
    } else if (user.role === 'staff') {
      const [rows] = await db.query('SELECT name FROM staff WHERE staff_id = ?', [user.user_id]);
      name = rows[0]?.name;
    }
    
    // FIRE AND FORGET: Trigger background email with retry logic
    const { sendResetCodeEmailBackground } = require('../services/emailService');
    sendResetCodeEmailBackground(email, name || 'User', code);
    
    console.log(`🔐 Reset code generated and sent to background queue for ${email}`);

    res.json({
      message: 'If an account with that email exists, a reset code has been sent.',
    });
  } catch (err) {
    console.error('Failed to process reset password request:', err);
    res.status(500).json({ error: 'Failed to process request. Please try again.' });
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
async function resetPassword(req, res) {
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

  try {
    const password_hash = bcrypt.hashSync(newPassword, 10);
    await db.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [password_hash, stored.userId]);

    resetCodes.delete(email.toLowerCase());

    res.json({ message: 'Password reset successful! You can now log in with your new password.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { register, login, getProfile, updateProfile, forgotPassword, verifyResetCode, resetPassword };
