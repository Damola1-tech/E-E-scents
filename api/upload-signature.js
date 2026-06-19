// api/upload-signature.js
//
// The admin page asks this function for permission to upload a photo.
// This function (running privately on Vercel's server) creates a
// signature using your Cloudinary secret key — that secret never
// gets sent to the browser/admin page.

const crypto = require('crypto');

const ADMIN_KEY = process.env.ADMIN_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = req.headers['x-admin-key'];
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const timestamp = Math.round(Date.now() / 1000);

  // This folder name keeps your uploads completely separate from any
  // other Cloudinary project on the same account — nothing will mix up.
  const folder = 'ee-scents-products';

  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
  const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

  return res.status(200).json({
    signature,
    timestamp,
    folder,
    apiKey: CLOUDINARY_API_KEY,
    cloudName: CLOUDINARY_CLOUD_NAME
  });
};
