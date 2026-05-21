const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./unegui.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    name TEXT,
    verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('sell', 'rent')),
    property_type TEXT NOT NULL,
    city TEXT NOT NULL,
    district TEXT,
    khoroo TEXT,
    address_detail TEXT,
    price INTEGER NOT NULL,
    price_type TEXT DEFAULT 'month',
    description TEXT,
    phone TEXT NOT NULL,
    contact_name TEXT,
    images TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Зөвхөн зураг файл (jpg, png, gif, webp) оруулна уу'));
  }
});

// ============ API ROUTES ============

// Send verification code
app.post('/api/send-code', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Утасны дугаараа оруулна уу' });
  
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  db.run(`INSERT INTO verification_codes (phone, code) VALUES (?, ?)`, [phone, code], (err) => {
    if (err) return res.status(500).json({ error: 'Алдаа гарлаа' });
    // In production, send SMS here. For demo, return code in response
    console.log(`Verification code for ${phone}: ${code}`);
    res.json({ success: true, message: 'Баталгаажуулах код илгээгдлээ', code: code });
  });
});

// Verify code and login/register
app.post('/api/verify-code', (req, res) => {
  const { phone, code, name } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'Утасны дугаар болон кодоо оруулна уу' });

  db.get(`SELECT * FROM verification_codes WHERE phone = ? AND code = ? ORDER BY created_at DESC LIMIT 1`, 
    [phone, code], (err, row) => {
      if (err) return res.status(500).json({ error: 'Алдаа гарлаа' });
      if (!row) return res.status(400).json({ error: 'Баталгаажуулах код буруу байна' });

      // Check if code is expired (10 minutes)
      const created = new Date(row.created_at);
      const now = new Date();
      if ((now - created) > 10 * 60 * 1000) {
        return res.status(400).json({ error: 'Баталгаажуулах кодны хугацаа дууссан' });
      }

      // Find or create user
      db.get(`SELECT * FROM users WHERE phone = ?`, [phone], (err, user) => {
        if (err) return res.status(500).json({ error: 'Алдаа гарлаа' });
        
        if (user) {
          db.run(`UPDATE users SET verified = 1 WHERE id = ?`, [user.id]);
          res.json({ success: true, user: { id: user.id, phone: user.phone, name: user.name } });
        } else {
          db.run(`INSERT INTO users (phone, name, verified) VALUES (?, ?, 1)`, [phone, name || ''], function(err) {
            if (err) return res.status(500).json({ error: 'Алдаа гарлаа' });
            res.json({ success: true, user: { id: this.lastID, phone, name: name || '' } });
          });
        }
      });
    });
});

// Get user by phone
app.get('/api/user/:phone', (req, res) => {
  db.get(`SELECT * FROM users WHERE phone = ?`, [req.params.phone], (err, user) => {
    if (err) return res.status(500).json({ error: 'Алдаа гарлаа' });
    if (!user) return res.status(404).json({ error: 'Хэрэглэгч олдсонгүй' });
    res.json({ user });
  });
});

// Upload images
app.post('/api/upload', upload.array('images', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Зураг оруулна уу' });
  }
  const files = req.files.map(f => '/uploads/' + f.filename);
  res.json({ success: true, files });
});

// Create listing
app.post('/api/listings', (req, res) => {
  const { user_id, category, property_type, city, district, khoroo, address_detail, price, price_type, description, phone, contact_name, images } = req.body;
  
  if (!user_id || !category || !property_type || !city || !price || !phone) {
    return res.status(400).json({ error: 'Шаардлагатай талбаруудыг бөглөнө үү' });
  }

  db.run(`INSERT INTO listings (user_id, category, property_type, city, district, khoroo, address_detail, price, price_type, description, phone, contact_name, images) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [user_id, category, property_type, city, district, khoroo, address_detail, price, price_type || 'month', description, phone, contact_name, JSON.stringify(images || [])],
    function(err) {
      if (err) return res.status(500).json({ error: 'Зар үүсгэхэд алдаа гарлаа: ' + err.message });
      res.json({ success: true, id: this.lastID });
    });
});

// Get all listings with filters
app.get('/api/listings', (req, res) => {
  let sql = `SELECT l.*, u.name as user_name FROM listings l LEFT JOIN users u ON l.user_id = u.id WHERE 1=1`;
  const params = [];

  if (req.query.category) {
    sql += ` AND l.category = ?`;
    params.push(req.query.category);
  }
  if (req.query.property_type) {
    sql += ` AND l.property_type = ?`;
    params.push(req.query.property_type);
  }
  if (req.query.city) {
    sql += ` AND l.city LIKE ?`;
    params.push(`%${req.query.city}%`);
  }
  if (req.query.district) {
    sql += ` AND l.district LIKE ?`;
    params.push(`%${req.query.district}%`);
  }
  if (req.query.search) {
    sql += ` AND (l.description LIKE ? OR l.address_detail LIKE ?)`;
    params.push(`%${req.query.search}%`, `%${req.query.search}%`);
  }
  if (req.query.min_price) {
    sql += ` AND l.price >= ?`;
    params.push(req.query.min_price);
  }
  if (req.query.max_price) {
    sql += ` AND l.price <= ?`;
    params.push(req.query.max_price);
  }

  sql += ` ORDER BY l.created_at DESC`;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Алдаа гарлаа' });
    const listings = rows.map(row => ({
      ...row,
      images: JSON.parse(row.images || '[]')
    }));
    res.json({ listings });
  });
});

// Get single listing
app.get('/api/listings/:id', (req, res) => {
  db.get(`SELECT l.*, u.name as user_name FROM listings l LEFT JOIN users u ON l.user_id = u.id WHERE l.id = ?`, 
    [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ error: 'Алдаа гарлаа' });
      if (!row) return res.status(404).json({ error: 'Зар олдсонгүй' });
      row.images = JSON.parse(row.images || '[]');
      res.json({ listing: row });
    });
});

// Get user's listings
app.get('/api/user/:userId/listings', (req, res) => {
  db.all(`SELECT l.*, u.name as user_name FROM listings l LEFT JOIN users u ON l.user_id = u.id WHERE l.user_id = ? ORDER BY l.created_at DESC`,
    [req.params.userId], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Алдаа гарлаа' });
      const listings = rows.map(row => ({
        ...row,
        images: JSON.parse(row.images || '[]')
      }));
      res.json({ listings });
    });
});

// Delete listing
app.delete('/api/listings/:id', (req, res) => {
  db.get(`SELECT images FROM listings WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Алдаа гарлаа' });
    if (!row) return res.status(404).json({ error: 'Зар олдсонгүй' });
    
    // Delete image files
    const images = JSON.parse(row.images || '[]');
    images.forEach(img => {
      const filePath = path.join(__dirname, 'public', img);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    db.run(`DELETE FROM listings WHERE id = ?`, [req.params.id], (err) => {
      if (err) return res.status(500).json({ error: 'Устгахад алдаа гарлаа' });
      res.json({ success: true });
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Сервер ажиллаж байна: http://localhost:${PORT}`);
});
