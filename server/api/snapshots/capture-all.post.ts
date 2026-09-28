import { getAllAccounts, getAccountById, upsertSnapshot } from '~~/server/utils/db'
import type { InstagramAccount } from '~~/server/utils/db'

/**
 * اسنپ‌شات گروهی: برای همه‌ی پیج‌های لیست (یا فقط شناسه‌های داده‌شده)
 * تعداد فالوور لحظه‌ای دیتابیس را با تاریخ امروز ثبت می‌کند.
 * اگر همان روز قبلاً اسنپ‌شات گرفته شده باشد، مقدار بروزرسانی می‌شود.
 */
export default defineEventHandler(async (event) => {
  let body: any = {}
  try {
    body = (await readBody(event)) || {}
  } catch {
    body = {}
  }

  const requestedIds: number[] = Array.isArray(body?.account_ids)
    ? body.account_ids.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id))
    : []

  const accounts: InstagramAccount[] = requestedIds.length
    ? (requestedIds.map(id => getAccountById(id)).filter(Boolean) as InstagramAccount[])
    : getAllAccounts()

  if (!accounts.length) {
    throw createError({ statusCode: 400, message: 'هیچ پیجی در لیست نیست' })
  }

  let created = 0
  let updated = 0
  const results: Array<{
    id: number
    username: string
    followers: number
    snapshot_date: string
    created: boolean
  }> = []

  for (const account of accounts) {
    const { snapshot, created: isNew } = upsertSnapshot(account.id, account.followers || 0)
    if (isNew) created++
    else updated++

    results.push({
      id: account.id,
      username: account.username,
      followers: snapshot.followers,
      snapshot_date: snapshot.snapshot_date,
      created: isNew
    })
  }

  return {
    success: true,
    data: {
      total: accounts.length,
      created,
      updated,
      snapshot_date: results[0]?.snapshot_date || null,
      results
    }
  }
})
