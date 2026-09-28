import { fetchInstagramProfile, resolveProxy } from '~~/server/utils/instagram-scraper'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const username = query.username as string
  
  if (!username) {
    throw createError({
      statusCode: 400,
      message: 'نام کاربری الزامی است'
    })
  }

  const proxy = await resolveProxy()
  const profile = await fetchInstagramProfile(username)

  return {
    success: profile.success,
    error: profile.error,
    proxy: { source: proxy.source, description: proxy.description },
    data: profile.success ? {
      username: profile.username,
      full_name: profile.full_name,
      bio: profile.bio,
      followers: profile.followers,
      last_post_date: profile.last_post_date,
      profile_pic_url: profile.profile_pic_url
    } : null
  }
})