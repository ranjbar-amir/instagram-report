import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { hashPassword } from './auth'

let db: Database.Database | null = null

export interface InstagramAccount {
  id: number
  username: string
  full_name: string
  bio: string
  followers: number
  last_post_date: string | null
  profile_pic_url: string
  created_at: string
  updated_at: string
}

export interface Snapshot {
  id: number
  account_id: number
  followers: number
  snapshot_date: string
  created_at: string
}

export function getDb(): Database.Database {
  if (!db) {
    const dataDir = join(process.cwd(), 'data')
    const dbPath = join(dataDir, 'instagram.db')

    // اطمینان از وجود پوشه data
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true })
    }

    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')

    // ایجاد جداول
    db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        full_name TEXT DEFAULT '',
        bio TEXT DEFAULT '',
        followers INTEGER DEFAULT 0,
        last_post_date TEXT,
        profile_pic_url TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        followers INTEGER NOT NULL,
        snapshot_date TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_snapshots_account_date
        ON snapshots(account_id, snapshot_date);

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password TEXT NOT NULL,
        fullname TEXT DEFAULT '',
        userIsActive INTEGER DEFAULT 1,
        deleted_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        permisionCode TEXT UNIQUE NOT NULL,
        permisionTitle TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        permission_id INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
        UNIQUE(user_id, permission_id)
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `)

    seedPermissions(db)
    seedAdmin(db)
  }
  return db
}

// ---------- Permissions & Seed ----------

export const PERMISSION_CODES = [
  { code: 'proxy.settings', title: 'تنظیمات پروکسی' },
  { code: 'page.add', title: 'اضافه کردن پیج' },
  { code: 'page.delete', title: 'حذف پیج' },
  { code: 'snapshot.single', title: 'ثبت اسنپ شات تکی' },
  { code: 'snapshot.bulk', title: 'ثبت اسنپ شات گروهی' },
  { code: 'snapshot.report', title: 'گزارش اسنپ شات' },
  { code: 'user.list', title: 'دسترسی به لیست کاربران' },
  { code: 'user.create', title: 'ایجاد کاربر' },
  { code: 'user.delete', title: 'حذف کاربر' },
  { code: 'user.purge', title: 'حذف دائمی کاربر' },
  { code: 'user.edit', title: 'ویرایش کاربر' },
  { code: 'user.permissions', title: 'تنظیم دسترسی کاربر (permision)' }
] as const

function seedPermissions(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT INTO permissions (permisionCode, permisionTitle) VALUES (?, ?)
    ON CONFLICT(permisionCode) DO UPDATE SET permisionTitle = excluded.permisionTitle
  `)
  for (const p of PERMISSION_CODES) insert.run(p.code, p.title)
}

/**
 * ایجاد ادمین پیش‌فرض: admin / admin123
 * فقط بار اول — اگر ادمین حذف نشده باشد دوباره ساخته نمی‌شود.
 */
function seedAdmin(db: Database.Database): void {
  const existing = db
    .prepare("SELECT id FROM users WHERE username = 'admin' AND deleted_at IS NULL")
    .get() as { id: number } | undefined
  if (existing) return

  const hash = hashPassword('admin123')
  const result = db.prepare(`
    INSERT INTO users (username, password, fullname, userIsActive)
    VALUES ('admin', ?, 'مدیر سیستم', 1)
  `).run(hash)

  // ادمین همه دسترسی‌ها را دارد
  const perms = db.prepare('SELECT id FROM permissions').all() as { id: number }[]
  const insert = db.prepare('INSERT OR IGNORE INTO user_permissions (user_id, permission_id) VALUES (?, ?)')
  for (const p of perms) insert.run(result.lastInsertRowid as number, p.id)
}

// ---------- Settings ----------

export function getSetting(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row ? row.value : null
}

export function setSetting(key: string, value: string): void {
  getDb().prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value)
}

export function getAllAccounts(): InstagramAccount[] {
  const db = getDb()
  return db.prepare('SELECT * FROM accounts ORDER BY created_at DESC').all() as InstagramAccount[]
}

export function getAccountById(id: number): InstagramAccount | undefined {
  const db = getDb()
  return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as InstagramAccount | undefined
}

export function getAccountByUsername(username: string): InstagramAccount | undefined {
  const db = getDb()
  // نام کاربری اینستاگرام به بزرگی/کوچکی حروف حساس نیست
  return db.prepare('SELECT * FROM accounts WHERE username = ? COLLATE NOCASE').get(username) as InstagramAccount | undefined
}

export function createAccount(data: {
  username: string
  full_name?: string
  bio?: string
  followers: number
  last_post_date?: string | null
  profile_pic_url?: string
}): InstagramAccount {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO accounts (username, full_name, bio, followers, last_post_date, profile_pic_url, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `)

  const result = stmt.run(
    data.username,
    data.full_name || '',
    data.bio || '',
    data.followers,
    data.last_post_date || null,
    data.profile_pic_url || ''
  )

  return getAccountById(result.lastInsertRowid as number)!
}

export function updateAccount(id: number, data: Partial<{
  full_name: string
  bio: string
  followers: number
  last_post_date: string | null
  profile_pic_url: string
}>): InstagramAccount | undefined {
  const db = getDb()

  const fields = Object.keys(data).filter(k => data[k] !== undefined)
  if (fields.length === 0) return getAccountById(id)

  const setClause = fields.map(f => `${f} = ?`).join(', ')
  const values = fields.map(f => data[f as keyof typeof data])

  db.prepare(`UPDATE accounts SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, id)
  return getAccountById(id)
}

export function deleteAccount(id: number): boolean {
  const db = getDb()
  const result = db.prepare('DELETE FROM accounts WHERE id = ?').run(id)
  return result.changes > 0
}

/**
 * تاریخ امروز به وقت تهران (YYYY-MM-DD).
 * اگر از تاریخ UTC استفاده کنیم، اسنپ‌شات‌های بعد از نیمه‌شب تهران
 * روی روز قبل ثبت می‌شدند و گزارش پیوت دو ستون برای یک روز می‌ساخت.
 */
export function todayInTehran(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

/**
 * ثبت/بروزرسانی اسنپ‌شات یک پیج برای یک روز.
 * برای هر (پیج، روز) فقط یک رکورد نگه می‌داریم تا پیوت تاریخ×فالوور درست بماند؛
 * اگر همان روز دوباره اسنپ‌شات بگیرید، مقدار قبلی بروزرسانی می‌شود.
 */
export function upsertSnapshot(
  accountId: number,
  followers: number,
  snapshotDate?: string
): { snapshot: Snapshot; created: boolean } {
  const db = getDb()
  const date = snapshotDate || todayInTehran()

  const existing = db
    .prepare('SELECT id FROM snapshots WHERE account_id = ? AND snapshot_date = ? ORDER BY id DESC LIMIT 1')
    .get(accountId, date) as { id: number } | undefined

  if (existing) {
    db.prepare('UPDATE snapshots SET followers = ? WHERE id = ?').run(followers, existing.id)
    const snapshot = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(existing.id) as Snapshot
    return { snapshot, created: false }
  }

  const result = db.prepare(`
    INSERT INTO snapshots (account_id, followers, snapshot_date)
    VALUES (?, ?, ?)
  `).run(accountId, followers, date)

  const snapshot = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(result.lastInsertRowid) as Snapshot
  return { snapshot, created: true }
}

export function getSnapshotsByDateRange(
  accountId?: number,
  fromDate?: string,
  toDate?: string
): (Snapshot & { username: string })[] {
  const db = getDb()

  let sql = `
    SELECT s.*, a.username 
    FROM snapshots s
    JOIN accounts a ON a.id = s.account_id
    WHERE 1=1
  `
  const params: any[] = []

  if (accountId) {
    sql += ' AND s.account_id = ?'
    params.push(accountId)
  }
  if (fromDate) {
    sql += ' AND s.snapshot_date >= ?'
    params.push(fromDate)
  }
  if (toDate) {
    sql += ' AND s.snapshot_date <= ?'
    params.push(toDate)
  }

  sql += ' ORDER BY s.snapshot_date DESC, a.username ASC'

  return db.prepare(sql).all(...params) as any[]
}