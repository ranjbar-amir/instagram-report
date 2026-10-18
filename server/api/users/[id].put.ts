import { requirePermission, hashPassword, getSessionUser } from '~~/server/utils/auth'
import { getDb } from '~~/server/utils/db'

/** ویرایش کاربر — شامل ریست رمز عبور کاربران دیگر */
export default defineEventHandler(async (event) => {
  requirePermission(event, 'user.edit')

  const id = parseInt(getRouterParam(event, 'id') as string)
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'شناسه نامعتبر است' })
  }

  const db = getDb()
  const user = db.prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL').get(id) as any
  if (!user) {
    throw createError({ statusCode: 404, message: 'کاربر یافت نشد' })
  }

  const current = getSessionUser(event)
  const isSelf = current?.id === id

  const body = await readBody(event)
  const { fullname, userIsActive, newPassword } = body || {}

  const updates: string[] = []
  const values: any[] = []

  if (fullname !== undefined) {
    updates.push('fullname = ?')
    values.push(fullname)
  }
  if (userIsActive !== undefined) {
    // کاربر فقط خودش را نمی‌تواند غیرفعال کند — غیرفعال کردن بقیه آزاد است
    if (isSelf && userIsActive === false) {
      throw createError({ statusCode: 400, message: 'نمی‌توانید حساب خودتان را غیرفعال کنید' })
    }
    updates.push('userIsActive = ?')
    values.push(userIsActive ? 1 : 0)
  }
  if (newPassword) {
    if (String(newPassword).length < 6) {
      throw createError({ statusCode: 400, message: 'رمز عبور باید حداقل ۶ کاراکتر باشد' })
    }
    updates.push('password = ?')
    values.push(hashPassword(newPassword))
  }

  if (!updates.length) {
    throw createError({ statusCode: 400, message: 'داده‌ای برای بروزرسانی ارسال نشده است' })
  }

  updates.push('updated_at = CURRENT_TIMESTAMP')
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values, id)

  return { success: true, message: 'کاربر با موفقیت بروزرسانی شد' }
})
