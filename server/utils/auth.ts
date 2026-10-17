import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { getDb } from './db'

const SESSION_DAYS = 7

// ---------- Password Hashing (scrypt) ----------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const candidate = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

// ---------- Sessions ----------

export interface SessionUser {
  id: number
  username: string
  fullname: string
  permissions: string[]
}

export function createSession(userId: number): string {
  const db = getDb()
  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires)
  return token
}

export function destroySession(token: string): void {
  getDb().prepare('DELETE FROM sessions WHERE id = ?').run(token)
}

export function getUserPermissions(userId: number): string[] {
  const rows = getDb().prepare(`
    SELECT p.permisionCode
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    WHERE up.user_id = ?
  `).all(userId) as { permisionCode: string }[]
  return rows.map(r => r.permisionCode)
}

/** خواندن کاربر جاری از کوکی سشن؛ اگر لاگین نباشد null */
export function getSessionUser(event: any): SessionUser | null {
  const token = getCookie(event, 'session_token')
  if (!token) return null

  const row = getDb().prepare(`
    SELECT s.id AS token, s.expires_at, u.id, u.username, u.fullname, u.userIsActive, u.deleted_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
  `).get(token) as any

  if (!row) return null
  if (row.deleted_at || !row.userIsActive) {
    destroySession(token)
    return null
  }
  if (new Date(row.expires_at) < new Date()) {
    destroySession(token)
    return null
  }

  return {
    id: row.id,
    username: row.username,
    fullname: row.fullname,
    permissions: getUserPermissions(row.id)
  }
}

/** اگر لاگین نباشد 401 می‌دهد */
export function requireAuth(event: any): SessionUser {
  const user = getSessionUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'ابتدا وارد شوید' })
  }
  return user
}

/** اگر پرمیشن نداشته باشد 403 می‌دهد */
export function requirePermission(event: any, code: string): SessionUser {
  const user = requireAuth(event)
  if (!user.permissions.includes(code)) {
    throw createError({ statusCode: 403, message: 'شما دسترسی لازم برای این عملیات را ندارید' })
  }
  return user
}

export function setSessionCookie(event: any, token: string): void {
  setCookie(event, 'session_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60
  })
}
