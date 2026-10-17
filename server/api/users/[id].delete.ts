import { requirePermission } from '~~/server/utils/auth'
import { getDb } from '~~/server/utils/db'

/** حذف نرم کاربر (soft delete) */
export default defineEventHandler((event) => {
  const session = requirePermission(event, 'user.delete')

  const id = parseInt(getRouterParam(event, 'id') as string)
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'شناسه نامعتبر است' })
  }
  if (id === session.id) {
    throw createError({ statusCode: 400, message: 'نمی‌توانید حساب خودتان را حذف کنید' })
  }

  const db = getDb()
  const result = db.prepare(`
    UPDATE users SET deleted_at = CURRENT_TIMESTAMP, userIsActive = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND deleted_at IS NULL
  `).run(id)

  if (result.changes === 0) {
    throw createError({ statusCode: 404, message: 'کاربر یافت نشد' })
  }

  // سشن‌های کاربر حذف‌شده را باطل کن
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id)

  return { success: true, message: 'کاربر حذف شد' }
})
