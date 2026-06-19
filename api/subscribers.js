// api/subscribers.js
//
//   POST   /api/subscribers   -> public, saves a newsletter signup
//   GET    /api/subscribers   -> admin only, returns the full list

const { kv } = require('@vercel/kv');

const KEY_NAME = 'ee_scents_subscribers';
const ADMIN_KEY = process.env.ADMIN_KEY;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

function isAuthorized(req) {
  const key = req.headers['x-admin-key'];
  return ADMIN_KEY && key === ADMIN_KEY;
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const email = ((req.body && req.body.email) || '').trim().toLowerCase();
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const list = (await kv.get(KEY_NAME)) || [];
    if (list.some((s) => s.email === email)) {
      return res.status(200).json({ message: 'Already subscribed' });
    }

    list.push({ email, subscribedAt: new Date().toISOString() });
    await kv.set(KEY_NAME, list);
    return res.status(201).json({ message: 'Subscribed' });
  }

  if (req.method === 'GET') {
    if (!isAuthorized(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const list = (await kv.get(KEY_NAME)) || [];
    return res.status(200).json(list);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
