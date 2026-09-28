import { fetchInstagramProfile, resolveProxy } from '~~/server/utils/instagram-scraper'
import { getAccountById, updateAccount, createSnapshot } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = parseInt(getQuery(event).id as string)

  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'شناسه الزامی است' })
  }

  const account = getAccountById(id)
  if (!account) {
    throw createError({ statusCode: 404, message: 'حساب یافت نشد' })
  }

  const proxy = await resolveProxy()
  const profile = await fetchInstagramProfile(account.username)

  if (!profile.success) {
    return {
      success: false,
      error: profile.error,
      proxy: { source: proxy.source, description: proxy.description }
    }
  }

  // بروزرسانی دیتابیس
  // اگر این بار تاریخ آخرین پست به دست نیامد، مقدار قبلی را پاک نمی‌کنیم
  const updated = updateAccount(id, {
    full_name: profile.full_name,
    bio: profile.bio,
    followers: profile.followers,
    last_post_date: profile.last_post_date ?? account.last_post_date ?? null,
    profile_pic_url: profile.profile_pic_url
  })

  return {
    success: true,
    data: updated,
    // بعضی پیج‌ها را اینستاگرام بدون داده‌ی پست سرو می‌کند؛ دلیل را توضیح می‌دهیم
    warning: profile.last_post_date
      ? undefined
      : 'تاریخ آخرین پست دریافت نشد؛ اینستاگرام برای این پیج داده‌ی پست را برنمی‌گرداند (فالوور و بیو بروز شد).',
    proxy: { source: proxy.source, description: proxy.description }
  }
})