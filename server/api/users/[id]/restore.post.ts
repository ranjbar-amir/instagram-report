import { requirePermission } from '~~/server/utils/auth'
import { getDb } from '~~/server/utils/db'

/** بازیابی کاربر حذف‌شده (undo soft delete) */
export default defineEventHandler((event) => {
  requirePermission(event, 'user.edit')

  const id = parseInt(getRouterParam(event, 'id') as string)
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'شناسه نامعتبر است' })
  }

  const db = getDb()
  const result = db.prepare(`
    UPDATE users SET deleted_at = NULL, userIsActive = 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND deleted_at IS NOT NULL
  `).run(id)

  if (result.changes === 0) {
    throw createError({ statusCode: 404, message: 'کاربر حذف‌شده یافت نشد' })
  }

  return { success: true, message: 'کاربر بازیابی شد' }
})
