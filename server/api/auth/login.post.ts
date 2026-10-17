import { verifyPassword, createSession, setSessionCookie } from '~~/server/utils/auth'
import { getDb } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password } = body || {}

  if (!username || !password) {
    throw createError({ statusCode: 400, message: 'نام کاربری و رمز عبور الزامی است' })
  }

  const db = getDb()
  const user = db.prepare(
    'SELECT id, password, userIsActive, deleted_at FROM users WHERE username = ? COLLATE NOCASE'
  ).get(String(username).trim()) as any

  if (!user || user.deleted_at) {
    throw createError({ statusCode: 401, message: 'نام کاربری یا رمز عبور اشتباه است' })
  }
  if (!user.userIsActive) {
    throw createError({ statusCode: 403, message: 'حساب کاربری شما غیرفعال است' })
  }

  if (!verifyPassword(password, user.password)) {
    throw createError({ statusCode: 401, message: 'نام کاربری یا رمز عبور اشتباه است' })
  }

  const token = createSession(user.id)
  setSessionCookie(event, token)

  return { success: true }
})
