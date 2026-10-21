const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

router.use(auth);

// --- PLACE CRUD ---
router.post('/places', async (req, res) => {
  const { name, description, categoryIds, distance_km, latitude, longitude, opening_hours, travel_tips, entry_fee, image_url } = req.body;
  if (!name || !description || !categoryIds || !categoryIds.length) return res.status(400).json({ error: 'Missing required fields' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      `INSERT INTO places (name, description, distance_km, latitude, longitude, opening_hours, travel_tips, entry_fee, image_url) VALUES (?,?,?,?,?,?,?,?,?)`,
      [name, description, distance_km, latitude, longitude, opening_hours, travel_tips, entry_fee, image_url]
    );
    for (const cid of categoryIds) await conn.query('INSERT INTO place_categories (place_id, category_id) VALUES (?,?)', [r.insertId, cid]);
    await conn.query('INSERT INTO audit_log (admin_id, place_id, action) VALUES (?,?,?)', [req.admin.id, r.insertId, 'CREATE']);
    await conn.commit();
    res.status(201).json({ id: r.insertId });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); } finally { conn.release(); }
});

router.put('/places/:id', async (req, res) => {
  const { name, description, categoryIds, distance_km, latitude, longitude, opening_hours, travel_tips, entry_fee, image_url } = req.body;
  const id = req.params.id;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE places SET name=?, description=?, distance_km=?, latitude=?, longitude=?, opening_hours=?, travel_tips=?, entry_fee=?, image_url=? WHERE id=?`,
      [name, description, distance_km, latitude, longitude, opening_hours, travel_tips, entry_fee, image_url, id]
    );
    await conn.query('DELETE FROM place_categories WHERE place_id=?', [id]);
    for (const cid of categoryIds) await conn.query('INSERT INTO place_categories (place_id, category_id) VALUES (?,?)', [id, cid]);
    await conn.query('INSERT INTO audit_log (admin_id, place_id, action) VALUES (?,?,?)', [req.admin.id, id, 'UPDATE']);
    await conn.commit();
    res.json({ success: true });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); } finally { conn.release(); }
});

router.delete('/places/:id', async (req, res) => {
  await db.query('INSERT INTO audit_log (admin_id, place_id, action) VALUES (?,?,?)', [req.admin.id, req.params.id, 'DELETE']);
  await db.query('DELETE FROM places WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// --- UGC MODERATION ---
router.get('/pending-images', async (_req, res) => {
  const [rows] = await db.query(`
    SELECT ui.id, ui.image_url, ui.uploaded_at, p.name AS place_name 
    FROM user_images ui JOIN places p ON ui.place_id = p.id
    WHERE ui.status = 'pending' ORDER BY ui.uploaded_at DESC
  `);
  res.json(rows);
});

router.put('/images/:id/approve', async (req, res) => {
  await db.query('UPDATE user_images SET status = "approved" WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

router.delete('/images/:id', async (req, res) => {
  await db.query('DELETE FROM user_images WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// --- AUDIT LOG ---
router.get('/audit', async (_req, res) => {
  const [rows] = await db.query(`
    SELECT a.id, a.action, a.action_time, ad.username, p.name AS place_name
    FROM audit_log a LEFT JOIN admins ad ON a.admin_id = ad.id
    LEFT JOIN places p ON a.place_id = p.id ORDER BY a.action_time DESC LIMIT 200
  `);
  res.json(rows);
});

module.exports = router;