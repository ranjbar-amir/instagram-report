import { getSessionUser, hashPassword, verifyPassword } from '~~/server/utils/auth'
import { getDb } from '~~/server/utils/db'

/** تغییر رمز عبور کاربر جاری (نیاز به رمز فعلی) */
export default defineEventHandler(async (event) => {
  const user = getSessionUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'ابتدا وارد شوید' })
  }

  const body = await readBody(event)
  const { currentPassword, newPassword } = body || {}

  if (!currentPassword || !newPassword) {
    throw createError({ statusCode: 400, message: 'رمز فعلی و رمز جدید الزامی است' })
  }
  if (String(newPassword).length < 6) {
    throw createError({ statusCode: 400, message: 'رمز جدید باید حداقل ۶ کاراکتر باشد' })
  }

  const db = getDb()
  const row = db.prepare('SELECT password FROM users WHERE id = ?').get(user.id) as { password: string }

  if (!verifyPassword(currentPassword, row.password)) {
    throw createError({ statusCode: 400, message: 'رمز عبور فعلی اشتباه است' })
  }

  db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(hashPassword(newPassword), user.id)

  return { success: true, message: 'رمز عبور با موفقیت تغییر کرد' }
})
