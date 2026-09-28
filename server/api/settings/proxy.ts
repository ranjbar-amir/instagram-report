import { getSetting, setSetting } from '~~/server/utils/db'
import { resolveProxy, detectLocalProxies, testProxy } from '~~/server/utils/instagram-scraper'

export default defineEventHandler(async (event) => {
  const method = event.method

  // GET: وضعیت فعلی + لیست کاندیدهای محلی برای تست
  if (method === 'GET') {
    const status = await resolveProxy()
    const candidates = ['direct', ...detectLocalProxies()]
    const saved = getSetting('proxy_url')

    return {
      success: true,
      data: {
        current: status,
        saved,
        candidates
      }
    }
  }

  // POST: تست یا ذخیره پروکسی
  if (method === 'POST') {
    const body = await readBody(event)
    const action = body?.action as 'test' | 'save'
    const proxyUrl = (body?.proxy_url as string || '').trim()

    if (action === 'test') {
      const value = proxyUrl === '' ? 'direct' : proxyUrl
      const result = await testProxy(value)
      return { success: true, data: { tested: value, ...result } }
    }

    if (action === 'save') {
      const isValidFormat =
        proxyUrl === '' ||
        proxyUrl === 'direct' ||
        proxyUrl.startsWith('http://') ||
        proxyUrl.startsWith('https://') ||
        proxyUrl.startsWith('socks')

      if (!isValidFormat) {
        throw createError({
          statusCode: 400,
          message: 'فرمت پروکسی نامعتبر است. مثال: socks5://127.0.0.1:10808 یا http://127.0.0.1:10809 یا direct'
        })
      }
      const value = proxyUrl === '' || proxyUrl === 'direct' ? 'direct' : proxyUrl
      setSetting('proxy_url', value)
      const status = await resolveProxy()
      return { success: true, data: { saved: value, current: status } }
    }

    throw createError({ statusCode: 400, message: 'action باید test یا save باشد' })
  }

  throw createError({ statusCode: 405, message: 'متد پشتیبانی نمی‌شود' })
})
