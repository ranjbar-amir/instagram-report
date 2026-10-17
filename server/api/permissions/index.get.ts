import { requirePermission } from '~~/server/utils/auth'
import { getDb } from '~~/server/utils/db'

/** لیست همه پرمیشن‌ها + پرمیشن‌های فعلی یک کاربر */
export default defineEventHandler((event) => {
  requirePermission(event, 'user.permissions')

  const db = getDb()
  const userId = parseInt(getQuery(event).userId as string) || null

  const permissions = db.prepare('SELECT id, permisionCode, permisionTitle FROM permissions ORDER BY id').all()

  let userPermissions: number[] = []
  if (userId) {
    userPermissions = (db.prepare(
      'SELECT permission_id FROM user_permissions WHERE user_id = ?'
    ).all(userId) as { permission_id: number }[]).map(r => r.permission_id)
  }

  return { success: true, data: { permissions, userPermissions } }
})
