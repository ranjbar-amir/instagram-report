import { getSessionUser } from '~~/server/utils/auth'

export default defineEventHandler((event) => {
  const user = getSessionUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'لاگین نیستید' })
  }
  return { success: true, data: user }
})
