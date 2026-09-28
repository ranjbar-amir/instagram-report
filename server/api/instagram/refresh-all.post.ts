import { fetchInstagramProfile, resolveProxy } from '~~/server/utils/instagram-scraper'
import { getAllAccounts, updateAccount } from '~~/server/utils/db'

/**
 * دریافت گروهی اطلاعات همه‌ی پیج‌های لیست.
 * درخواست‌ها ترتیبی و با فاصله انجام می‌شوند تا ریسک rate-limit پایین بماند.
 */
export default defineEventHandler(async (event) => {
  let body: any = {}
  try {
    body = (await readBody(event)) || {}
  } catch {
    body = {}
  }

  const delayMs = Number.isFinite(Number(body?.delay_ms)) && Number(body.delay_ms) >= 0
    ? Math.min(Number(body.delay_ms), 10_000)
    : 1500

  const accounts = getAllAccounts()

  const results: Array<{
    id: number
    username: string
    success: boolean
    followers?: number
    last_post_date?: string | null
    error?: string
  }> = []

  const proxy = await resolveProxy()

  for (const account of accounts) {
    const profile = await fetchInstagramProfile(account.username)

    if (profile.success) {
      updateAccount(account.id, {
        full_name: profile.full_name,
        bio: profile.bio,
        followers: profile.followers,
        // اگر این بار تاریخ آخرین پست نیامد، مقدار قبلی را پاک نمی‌کنیم
        last_post_date: profile.last_post_date ?? account.last_post_date ?? null,
        profile_pic_url: profile.profile_pic_url
      })
      results.push({
        id: account.id,
        username: account.username,
        success: true,
        followers: profile.followers,
        last_post_date: profile.last_post_date
      })
    } else {
      results.push({
        id: account.id,
        username: account.username,
        success: false,
        error: profile.error
      })
    }

    // فاصله بین درخواست‌ها برای کاهش ریسک rate-limit
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }

  return {
    success: true,
    proxy: { source: proxy.source, description: proxy.description },
    data: {
      total: results.length,
      succeeded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      with_last_post: results.filter(r => r.success && r.last_post_date).length,
      results
    }
  }
})
