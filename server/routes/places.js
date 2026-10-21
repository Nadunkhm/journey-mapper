const router = require('express').Router();
const db = require('../config/db');

// GET all places
router.get('/', async (req, res) => {
  const { categories, q, sort } = req.query;
  let sql = `
    SELECT p.*, GROUP_CONCAT(DISTINCT c.name) AS categories,
           (SELECT AVG(rating) FROM user_ratings WHERE place_id = p.id) AS avg_rating
    FROM places p
    LEFT JOIN place_categories pc ON p.id = pc.place_id
    LEFT JOIN categories c ON pc.category_id = c.id
  `;
  const params = [];
  const where = [];

  if (q) { where.push('p.name LIKE ?'); params.push(`%${q}%`); }
  if (categories) {
    const list = categories.split(',').map(s => s.trim()).filter(Boolean);
    if (list.length) {
      where.push(`p.id IN (
        SELECT pc2.place_id FROM place_categories pc2
        JOIN categories c2 ON pc2.category_id = c2.id
        WHERE c2.name IN (${list.map(() => '?').join(',')})
      )`);
      params.push(...list);
    }
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' GROUP BY p.id';
  sql += sort === 'distance' ? ' ORDER BY p.distance_km ASC' : ' ORDER BY p.name ASC';

  const [rows] = await db.query(sql, params);
  res.json(rows.map(r => ({
    ...r,
    categories: r.categories ? r.categories.split(',') : [],
    avg_rating: r.avg_rating ? parseFloat(r.avg_rating).toFixed(1) : null
  })));
});

// GET categories
router.get('/meta/categories', async (_req, res) => {
  const [rows] = await db.query('SELECT * FROM categories ORDER BY name');
  res.json(rows);
});

// GET single place details (with approved images & rating)
router.get('/:id', async (req, res) => {
  const [rows] = await db.query(`
    SELECT p.*, GROUP_CONCAT(DISTINCT c.name) AS categories,
           (SELECT AVG(rating) FROM user_ratings WHERE place_id = p.id) AS avg_rating
    FROM places p
    LEFT JOIN place_categories pc ON p.id = pc.place_id
    LEFT JOIN categories c ON pc.category_id = c.id
    WHERE p.id = ? GROUP BY p.id
  `, [req.params.id]);

  if (!rows.length) return res.status(404).json({ error: 'Place not found' });
  const place = rows[0];
  place.categories = place.categories ? place.categories.split(',') : [];
  place.avg_rating = place.avg_rating ? parseFloat(place.avg_rating).toFixed(1) : null;

  const [images] = await db.query(
    'SELECT id, image_url FROM user_images WHERE place_id = ? AND status = "approved"', 
    [req.params.id]
  );
  place.user_images = images;
  res.json(place);
});

// POST rating
router.post('/:id/rate', async (req, res) => {
  const { rating } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
  await db.query('INSERT INTO user_ratings (place_id, rating) VALUES (?, ?)', [req.params.id, rating]);
  res.json({ success: true });
});

// POST image upload
router.post('/:id/upload', (req, res) => {
  const upload = req.app.get('upload');
  upload.single('image')(req, res, async function (err) {
    if (err) return res.status(500).json({ error: 'Upload failed' });
    if (!req.file) return res.status(400).json({ error: 'No image provided' });
    
    const imageUrl = '/uploads/' + req.file.filename;
    await db.query('INSERT INTO user_images (place_id, image_url, status) VALUES (?, ?, "pending")', [req.params.id, imageUrl]);
    res.json({ success: true, message: 'Uploaded! Waiting for admin approval.' });
  });
});

module.exports = router;