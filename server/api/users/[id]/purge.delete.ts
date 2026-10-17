import { requirePermission } from '~~/server/utils/auth'
import { getDb } from '~~/server/utils/db'

/** حذف دائمی کاربر از دیتابیس */
export default defineEventHandler((event) => {
  const session = requirePermission(event, 'user.purge')

  const id = parseInt(getRouterParam(event, 'id') as string)
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'شناسه نامعتبر است' })
  }
  if (id === session.id) {
    throw createError({ statusCode: 400, message: 'نمی‌توانید حساب خودتان را حذف کنید' })
  }

  const db = getDb()
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id)
  db.prepare('DELETE FROM user_permissions WHERE user_id = ?').run(id)
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id)

  if (result.changes === 0) {
    throw createError({ statusCode: 404, message: 'کاربر یافت نشد' })
  }

  return { success: true, message: 'کاربر به صورت دائمی حذف شد' }
})
