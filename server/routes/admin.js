const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

router.use(auth);   // every route below requires a valid JWT

// ADD
router.post('/places', async (req, res) => {
  const { name, description, categoryIds, distance_km, latitude, longitude,
          opening_hours, travel_tips, entry_fee, image_url } = req.body;

  if (!name || !description || !categoryIds || !categoryIds.length)
    return res.status(400).json({ error: 'name, description and at least one category are required' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      `INSERT INTO places (name, description, distance_km, latitude, longitude,
        opening_hours, travel_tips, entry_fee, image_url)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [name, description, distance_km, latitude, longitude,
       opening_hours, travel_tips, entry_fee, image_url]
    );
    for (const cid of categoryIds)
      await conn.query('INSERT INTO place_categories (place_id, category_id) VALUES (?,?)',
        [r.insertId, cid]);
    await conn.query('INSERT INTO audit_log (admin_id, place_id, action) VALUES (?,?,?)',
      [req.admin.id, r.insertId, 'CREATE']);
    await conn.commit();
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

// EDIT
router.put('/places/:id', async (req, res) => {
  const { name, description, categoryIds, distance_km, latitude, longitude,
          opening_hours, travel_tips, entry_fee, image_url } = req.body;
  const id = req.params.id;

  if (!name || !description || !categoryIds?.length)
    return res.status(400).json({ error: 'Missing required fields' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE places SET name=?, description=?, distance_km=?, latitude=?, longitude=?,
        opening_hours=?, travel_tips=?, entry_fee=?, image_url=? WHERE id=?`,
      [name, description, distance_km, latitude, longitude,
       opening_hours, travel_tips, entry_fee, image_url, id]
    );
    await conn.query('DELETE FROM place_categories WHERE place_id=?', [id]);
    for (const cid of categoryIds)
      await conn.query('INSERT INTO place_categories (place_id, category_id) VALUES (?,?)', [id, cid]);
    await conn.query('INSERT INTO audit_log (admin_id, place_id, action) VALUES (?,?,?)',
      [req.admin.id, id, 'UPDATE']);
    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

// DELETE
router.delete('/places/:id', async (req, res) => {
  const id = req.params.id;
  await db.query('INSERT INTO audit_log (admin_id, place_id, action) VALUES (?,?,?)',
    [req.admin.id, id, 'DELETE']);
  await db.query('DELETE FROM places WHERE id=?', [id]);
  res.json({ ok: true });
});

// AUDIT LOG
router.get('/audit', async (_req, res) => {
  const [rows] = await db.query(`
    SELECT a.id, a.action, a.action_time, ad.username, p.name AS place_name
    FROM audit_log a
    LEFT JOIN admins ad ON a.admin_id = ad.id
    LEFT JOIN places p ON a.place_id = p.id
    ORDER BY a.action_time DESC LIMIT 200
  `);
  res.json(rows);
});

module.exports = router;