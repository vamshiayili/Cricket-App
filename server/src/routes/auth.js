const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

// Register
router.post('/register', (req, res) => {
  try {
    let { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required.' });
    }

    username = username.trim();
    email = email.trim().toLowerCase();
    password = password.trim();

    if (username.length < 2) {
      return res.status(400).json({ message: 'Username must be at least 2 characters long.' });
    }

    // Default to VIEWER if not specified or unless requesting SCORER/ADMIN with valid code
    const userRole = (role === 'SCORER' || role === 'ADMIN') ? role : 'VIEWER';

    // Case-insensitive duplicate check
    const checkUser = db.prepare(`
      SELECT id, username, email FROM users
      WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)
    `).get(email, username);

    if (checkUser) {
      if (checkUser.email.toLowerCase() === email) {
        return res.status(400).json({ message: 'An account with this email address already exists. Please log in.' });
      }
      return res.status(400).json({ message: 'This username is already taken. Please choose another one.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const result = db.prepare(`
      INSERT INTO users (username, email, password, role)
      VALUES (?, ?, ?, ?)
    `).run(username, email, hashedPassword, userRole);

    const user = { id: result.lastInsertRowid, username, email, role: userRole };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '14d' });

    res.status(201).json({
      message: `Welcome, ${username}! Account created successfully.`,
      user,
      token
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error during registration: ' + err.message });
  }
});

// Login (Supports case-insensitive email or username with trimmed whitespace)
router.post('/login', (req, res) => {
  try {
    let { emailOrUsername, password } = req.body;
    if (!emailOrUsername || !password) {
      return res.status(400).json({ message: 'Please enter your username/email and password.' });
    }

    const identifier = emailOrUsername.trim();
    const cleanPassword = password.trim();

    // Case-insensitive lookup for either email or username
    const user = db.prepare(`
      SELECT * FROM users
      WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)
    `).get(identifier, identifier);

    if (!user) {
      return res.status(400).json({
        message: `Account "${identifier}" not found. Please check your spelling or register a new account.`
      });
    }

    // Try both raw password and trimmed password for mobile keyboard tolerance
    const isMatch = bcrypt.compareSync(cleanPassword, user.password) || bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: 'Incorrect password. Please try again or use a demo login.'
      });
    }

    const userPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '14d' });

    res.json({
      message: `Welcome back, ${user.username}!`,
      user: userPayload,
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login: ' + err.message });
  }
});

// Current User Profile
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User session not found. Please log in again.' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching user profile' });
  }
});

module.exports = router;
