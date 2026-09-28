import { getAccountById, upsertSnapshot } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { account_id, followers, snapshot_date } = body
  
  if (!account_id) {
    throw createError({ statusCode: 400, message: 'شناسه حساب الزامی است' })
  }
  
  const account = getAccountById(account_id)
  if (!account) {
    throw createError({ statusCode: 404, message: 'حساب یافت نشد' })
  }
  
  // برای هر پیج و هر روز یک رکورد؛ اگر امروز قبلاً ثبت شده باشد بروزرسانی می‌شود
  const { snapshot, created } = upsertSnapshot(
    account_id,
    followers || account.followers,
    snapshot_date
  )

  return { success: true, data: snapshot, created }
})