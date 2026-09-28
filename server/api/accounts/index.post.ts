import { createAccount, getAccountByUsername } from '~~/server/utils/db'
import { fetchInstagramProfile, cleanUsername, isValidUsername } from '~~/server/utils/instagram-scraper'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, force } = body || {}

  if (!username) {
    throw createError({ statusCode: 400, message: 'نام کاربری الزامی است' })
  }

  const cleaned = cleanUsername(username)
  if (!isValidUsername(cleaned)) {
    throw createError({ statusCode: 400, message: 'نام کاربری نامعتبر است' })
  }

  // بررسی وجود قبلی
  const existing = getAccountByUsername(cleaned)
  if (existing) {
    throw createError({ statusCode: 409, message: 'این پیج قبلاً اضافه شده است' })
  }

  // دریافت اطلاعات از اینستاگرام
  const profile = await fetchInstagramProfile(cleaned)

  if (!profile.success) {
    // اگر force باشد، پیج بدون اطلاعات اضافه می‌شود تا بعداً بروزرسانی شود
    if (force) {
      const account = createAccount({ username: cleaned, followers: 0 })
      return {
        success: true,
        warning: `پیج اضافه شد ولی اطلاعات دریافت نشد (${profile.error}). بعداً با «بروزرسانی» اطلاعات را بگیرید.`,
        data: account
      }
    }
    throw createError({ statusCode: 400, message: profile.error || 'خطا در دریافت اطلاعات' })
  }
  
  // ذخیره در دیتابیس
  const account = createAccount({
    username: profile.username,
    full_name: profile.full_name,
    bio: profile.bio,
    followers: profile.followers,
    last_post_date: profile.last_post_date,
    profile_pic_url: profile.profile_pic_url
  })
  
  return { success: true, data: account }
})