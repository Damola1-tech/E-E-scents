// api/products.js
//
//   GET    /api/products          -> public, returns the product list (used by shop.html)
//   POST   /api/products          -> admin only, adds a new product
//   PUT    /api/products?id=5     -> admin only, edits product 5
//   DELETE /api/products?id=5     -> admin only, deletes product 5
//
// "Admin only" is enforced with a shared-secret header (x-admin-key).
// Storage is Upstash Redis (set up via the Upstash integration in your
// Vercel dashboard — it injects the connection details automatically).

const { Redis } = require('@upstash/redis');
const redis = Redis.fromEnv();

const KEY_NAME = 'ee_scents_products';
const ADMIN_KEY = process.env.ADMIN_KEY;

const seed = require('./seed-products.json');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
}

function isAuthorized(req) {
  const key = req.headers['x-admin-key'];
  return ADMIN_KEY && key === ADMIN_KEY;
}

async function loadProducts() {
  const data = await redis.get(KEY_NAME);
  if (data) return data;
  await redis.set(KEY_NAME, seed);
  return seed;
}

module.exports = async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ── PUBLIC: anyone can read the product list ──
  if (req.method === 'GET') {
    const products = await loadProducts();
    return res.status(200).json(products);
  }

  // ── EVERYTHING ELSE REQUIRES THE ADMIN KEY ──
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized. Missing or incorrect admin key.' });
  }

  const products = await loadProducts();

  if (req.method === 'POST') {
    const newProduct = req.body;
    const nextId = products.length
      ? Math.max(...products.map((p) => p.id)) + 1
      : 1;
    newProduct.id = nextId;
    products.push(newProduct);
    await redis.set(KEY_NAME, products);
    return res.status(201).json(newProduct);
  }

  if (req.method === 'PUT') {
    const id = parseInt(req.query.id, 10);
    const updates = req.body;
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Product not found' });
    products[idx] = { ...products[idx], ...updates, id };
    await redis.set(KEY_NAME, products);
    return res.status(200).json(products[idx]);
  }

  if (req.method === 'DELETE') {
    const id = parseInt(req.query.id, 10);
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Product not found' });
    const [removed] = products.splice(idx, 1);
    await redis.set(KEY_NAME, products);
    return res.status(200).json(removed);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
