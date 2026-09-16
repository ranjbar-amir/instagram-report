import { fetchInstagramProfile } from '~~/server/utils/instagram-scraper'
import { updateAccount, createSnapshot, getAccountById } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const id = parseInt(query.id as string)
  
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'شناسه الزامی است' })
  }
  
  const account = getAccountById(id)
  if (!account) {
    throw createError({ statusCode: 404, message: 'حساب یافت نشد' })
  }
  
  const profile = await fetchInstagramProfile(account.username)
  
  if (!profile.success) {
    throw createError({ statusCode: 400, message: profile.error })
  }
  
  // بروزرسانی دیتابیس
  const updated = updateAccount(id, {
    full_name: profile.full_name,
    bio: profile.bio,
    followers: profile.followers,
    last_post_date: profile.last_post_date,
    profile_pic_url: profile.profile_pic_url
  })
  
  return { success: true, data: updated }
})