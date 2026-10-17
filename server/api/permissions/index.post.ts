import { requirePermission } from '~~/server/utils/auth'
import { getDb } from '~~/server/utils/db'

/** ذخیره دسترسی‌های یک کاربر (جایگزینی کامل) */
export default defineEventHandler(async (event) => {
  requirePermission(event, 'user.permissions')

  const body = await readBody(event)
  const { userId, permissionIds } = body || {}

  if (!userId || !Array.isArray(permissionIds)) {
    throw createError({ statusCode: 400, message: 'شناسه کاربر و لیست دسترسی‌ها الزامی است' })
  }

  const db = getDb()
  const user = db.prepare('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL').get(userId) as any
  if (!user) {
    throw createError({ statusCode: 404, message: 'کاربر یافت نشد' })
  }

  const valid = db.prepare('SELECT id FROM permissions').all() as { id: number }[]
  const validIds = new Set(valid.map(v => v.id))

  db.prepare('DELETE FROM user_permissions WHERE user_id = ?').run(userId)
  const insert = db.prepare('INSERT OR IGNORE INTO user_permissions (user_id, permission_id) VALUES (?, ?)')
  for (const pid of permissionIds) {
    if (validIds.has(Number(pid))) insert.run(userId, Number(pid))
  }

  return { success: true, message: 'دسترسی‌های کاربر ذخیره شد' }
})
