import { requirePermission, hashPassword } from '~~/server/utils/auth'
import { getDb } from '~~/server/utils/db'

/** ایجاد کاربر جدید (بدون پرمیشن — از endpoint جداگانه تنظیم می‌شود) */
export default defineEventHandler(async (event) => {
  requirePermission(event, 'user.create')

  const body = await readBody(event)
  const { username, password, fullname, userIsActive } = body || {}

  if (!username || !password) {
    throw createError({ statusCode: 400, message: 'نام کاربری و رمز عبور الزامی است' })
  }
  if (String(password).length < 6) {
    throw createError({ statusCode: 400, message: 'رمز عبور باید حداقل ۶ کاراکتر باشد' })
  }

  const db = getDb()
  const existing = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE AND deleted_at IS NULL')
    .get(String(username).trim()) as { id: number } | undefined
  if (existing) {
    throw createError({ statusCode: 409, message: 'این نام کاربری قبلاً ثبت شده است' })
  }

  const result = db.prepare(`
    INSERT INTO users (username, password, fullname, userIsActive)
    VALUES (?, ?, ?, ?)
  `).run(String(username).trim(), hashPassword(password), fullname || '', userIsActive === false ? 0 : 1)

  return {
    success: true,
    data: { id: result.lastInsertRowid },
    message: 'کاربر با موفقیت ایجاد شد'
  }
})
