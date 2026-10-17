import { deleteAccount } from '~~/server/utils/db'
import { requirePermission } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requirePermission(event, 'page.delete')
  const id = parseInt(getRouterParam(event, 'id') as string)
  
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'شناسه نامعتبر است' })
  }
  
  const deleted = deleteAccount(id)
  
  if (!deleted) {
    throw createError({ statusCode: 404, message: 'حساب یافت نشد' })
  }
  
  return { success: true }
})