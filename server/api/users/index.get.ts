import { requirePermission } from '~~/server/utils/auth'
import { getDb } from '~~/server/utils/db'

/** لیست کاربران (شامل soft-delete ها با پرچم deleted) */
export default defineEventHandler((event) => {
  requirePermission(event, 'user.list')

  const db = getDb()
  const rows = db.prepare(`
    SELECT id, username, fullname, userIsActive, deleted_at, created_at,
      (deleted_at IS NOT NULL) AS isDeleted
    FROM users
    ORDER BY created_at DESC
  `).all()

  return { success: true, data: rows }
})
