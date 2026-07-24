import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { q } from './db.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

export function hashPassword(pw) {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(pw, stored) {
  const [saltHex, hashHex] = String(stored || '').split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(pw, salt, 64);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export async function registerUser({ name, email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!EMAIL_RE.test(normalizedEmail)) {
    throw new Error('e-mail inválido');
  }
  if (!password || String(password).length < 8) {
    throw new Error('a senha deve ter no mínimo 8 caracteres');
  }

  const orgId = randomUUID();
  const userId = randomUUID();
  const passHash = hashPassword(password);
  const orgName = name || normalizedEmail;

  try {
    await q(
      `INSERT INTO orgs (id, name, plan) VALUES ($1, $2, 'individual')`,
      [orgId, orgName]
    );
    await q(
      `INSERT INTO users (id, email, name, pass_hash) VALUES ($1, $2, $3, $4)`,
      [userId, normalizedEmail, name || '', passHash]
    );
    await q(
      `INSERT INTO org_members (org_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [orgId, userId]
    );
  } catch (err) {
    if (err && err.code === '23505') {
      throw new Error('este e-mail já está cadastrado');
    }
    throw err;
  }

  return {
    user: { id: userId, name: name || '', email: normalizedEmail },
    orgId,
  };
}

export async function loginUser({ email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  const { rows } = await q(
    `SELECT id, name, email, pass_hash FROM users WHERE email = $1`,
    [normalizedEmail]
  );
  const user = rows[0];
  if (!user || !verifyPassword(password, user.pass_hash)) {
    throw new Error('e-mail ou senha incorretos');
  }

  const memberRes = await q(
    `SELECT org_id FROM org_members WHERE user_id = $1 LIMIT 1`,
    [user.id]
  );
  const orgId = memberRes.rows[0] && memberRes.rows[0].org_id;

  return {
    user: { id: user.id, name: user.name, email: user.email },
    orgId,
  };
}

export async function createSession(userId, orgId) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await q(
    `INSERT INTO sessions (token, user_id, org_id, expires_at) VALUES ($1, $2, $3, $4)`,
    [token, userId, orgId, expiresAt]
  );
  return token;
}

export async function getSession(token) {
  if (!token) return null;
  const { rows } = await q(
    `SELECT user_id, org_id, expires_at FROM sessions WHERE token = $1`,
    [token]
  );
  const session = rows[0];
  if (!session) return null;
  if (new Date(session.expires_at).getTime() <= Date.now()) return null;
  return { userId: session.user_id, orgId: session.org_id };
}

export async function destroySession(token) {
  if (!token) return;
  await q(`DELETE FROM sessions WHERE token = $1`, [token]);
}

export function parseCookies(req) {
  const header = req && req.headers && req.headers.cookie;
  const cookies = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

export function sessionCookie(token) {
  return `snsess=${token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax`;
}

export function clearCookie() {
  return `snsess=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

export async function requireAuth(req) {
  const cookies = parseCookies(req);
  const token = cookies.snsess;
  if (!token) return null;
  return getSession(token);
}
