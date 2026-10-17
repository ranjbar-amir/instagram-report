import { getSessionUser, destroySession } from '~~/server/utils/auth'

export default defineEventHandler((event) => {
  const user = getSessionUser(event)
  if (user) {
    const token = getCookie(event, 'session_token')!
    destroySession(token)
  }
  deleteCookie(event, 'session_token', { path: '/' })
  return { success: true }
})
