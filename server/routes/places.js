const router = require('express').Router();
const db = require('../config/db');

// GET /api/places  (with optional ?categories=..&q=..&sort=distance)
router.get('/', async (req, res) => {
  const { categories, q, sort } = req.query;

  let sql = `
    SELECT p.id, p.name, p.description, p.distance_km, p.latitude, p.longitude,
           p.opening_hours, p.travel_tips, p.entry_fee, p.image_url,
           GROUP_CONCAT(c.name) AS categories
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
    categories: r.categories ? r.categories.split(',') : []
  })));
});

// GET /api/places/meta/categories
router.get('/meta/categories', async (_req, res) => {
  const [rows] = await db.query('SELECT * FROM categories ORDER BY name');
  res.json(rows);
});

// GET /api/places/:id
router.get('/:id', async (req, res) => {
  const [rows] = await db.query(`
    SELECT p.*, GROUP_CONCAT(c.name) AS categories
    FROM places p
    LEFT JOIN place_categories pc ON p.id = pc.place_id
    LEFT JOIN categories c ON pc.category_id = c.id
    WHERE p.id = ?
    GROUP BY p.id
  `, [req.params.id]);

  if (!rows.length) return res.status(404).json({ error: 'Place not found' });
  const place = rows[0];
  place.categories = place.categories ? place.categories.split(',') : [];
  res.json(place);
});

module.exports = router;