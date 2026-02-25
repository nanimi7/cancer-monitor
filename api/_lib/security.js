import { getAdminAuth } from './firebaseAdmin.js';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 12;
const rateLimitStore = new Map();

function getAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || '';
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function applyCors(req, res) {
  const requestOrigin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  }

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function enforceBodySize(req, maxBytes = 60 * 1024) {
  const body = req.body ?? {};
  const size = Buffer.byteLength(JSON.stringify(body), 'utf8');
  if (size > maxBytes) {
    const err = new Error('Request body too large');
    err.statusCode = 413;
    throw err;
  }
}

function checkRateLimit(key) {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || now - existing.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(key, { windowStart: now, count: 1 });
    return;
  }

  existing.count += 1;
  if (existing.count > RATE_LIMIT_MAX) {
    const err = new Error('Too many requests');
    err.statusCode = 429;
    throw err;
  }
}

export async function verifyUser(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    const err = new Error('Missing Authorization Bearer token');
    err.statusCode = 401;
    throw err;
  }

  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken) {
    const err = new Error('Missing Firebase ID token');
    err.statusCode = 401;
    throw err;
  }

  const decoded = await getAdminAuth().verifyIdToken(idToken, true);
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  checkRateLimit(`${decoded.uid}:${ip}:${req.url}`);
  return decoded;
}
