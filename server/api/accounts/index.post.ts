import { createAccount, getAccountByUsername } from '~~/server/utils/db'
import { fetchInstagramProfile } from '~~/server/utils/instagram-scraper'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username } = body
  
  if (!username) {
    throw createError({ statusCode: 400, message: 'نام کاربری الزامی است' })
  }
  
  // بررسی وجود قبلی
  const existing = getAccountByUsername(username)
  if (existing) {
    throw createError({ statusCode: 409, message: 'این پیج قبلاً اضافه شده است' })
  }
  
  // دریافت اطلاعات از اینستاگرام
  const profile = await fetchInstagramProfile(username)
  
  if (!profile.success) {
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