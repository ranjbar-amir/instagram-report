import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

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
    `)
  }
  return db
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
  return db.prepare('SELECT * FROM accounts WHERE username = ?').get(username) as InstagramAccount | undefined
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

export function createSnapshot(accountId: number, followers: number, snapshotDate?: string): Snapshot {
  const db = getDb()
  const date = snapshotDate || new Date().toISOString().split('T')[0]

  const stmt = db.prepare(`
    INSERT INTO snapshots (account_id, followers, snapshot_date)
    VALUES (?, ?, ?)
  `)

  const result = stmt.run(accountId, followers, date)
  return db.prepare('SELECT * FROM snapshots WHERE id = ?').get(result.lastInsertRowid) as Snapshot
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