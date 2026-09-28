import axios from 'axios'
import * as cheerio from 'cheerio'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { SocksProxyAgent } from 'socks-proxy-agent'
import type { AxiosRequestConfig } from 'axios'
import { getSetting, setSetting } from './db'

export interface InstagramProfileData {
  username: string
  full_name: string
  bio: string
  followers: number
  last_post_date: string | null
  profile_pic_url: string
  success: boolean
  error?: string
}

// ---------- کمکی‌های عمومی ----------

const WEB_PROFILE_URL = 'https://i.instagram.com/api/v1/users/web_profile_info/?username='
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

export function cleanUsername(input: string): string {
  return input
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, '')
    .replace(/\/.*$/, '')
    .replace(/^@/, '')
    .replace(/\?.*$/, '')
    .trim()
    // نام کاربری اینستاگرام به بزرگی/کوچکی حروف حساس نیست و همیشه
    // با حروف کوچک سرو می‌شود؛ با حروف بزرگ، صفحه‌ی embed بدون پست برمی‌گردد
    .toLowerCase()
}

export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9._]{1,30}$/.test(username)
}

function randomUserAgent(): string {
  const USER_AGENTS = [
    DESKTOP_UA,
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  ]
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

function webProfileHeaders(username: string) {
  return {
    'User-Agent': randomUserAgent(),
    'X-IG-App-ID': '936619743392459',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin': 'https://www.instagram.com',
    'Referer': `https://www.instagram.com/${username}/`,
    'X-Requested-With': 'XMLHttpRequest',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin'
  }
}

function buildAgent(proxyUrl: string): any {
  if (proxyUrl.startsWith('socks')) {
    return new SocksProxyAgent(proxyUrl)
  }
  return new HttpsProxyAgent(proxyUrl)
}

/** ساخت config یک درخواست axios با یا بدون پروکسی */
function requestConfig(proxyUrl: string | null, timeoutMs = 12000): AxiosRequestConfig {
  const config: AxiosRequestConfig = {
    timeout: timeoutMs,
    maxRedirects: 5,
    validateStatus: (status) => status < 500
  }
  if (proxyUrl) {
    const agent = buildAgent(proxyUrl)
    config.httpsAgent = agent
    config.httpAgent = agent
    config.proxy = false
  }
  return config
}

function describeProxyError(error: any): string {
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return 'timeout شد (پاسخی نیامد)'
  }
  if (error.code === 'ECONNREFUSED') {
    return 'هیچ سرویسی روی این آدرس/پورت اجرا نیست'
  }
  if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
    return 'آدرس پیدا نشد (DNS)'
  }
  if (error.code === 'EPROTO' || error.message?.includes('SSL')) {
    return 'خطای پروتکل/SSL'
  }
  return error.message || 'اتصال برقرار نشد'
}

// ---------- تست و تشخیص پروکسی ----------

/** پورت‌های رایج v2rayN / Nehring / Clash روی localhost */
export function detectLocalProxies(): string[] {
  return [
    'socks5://127.0.0.1:10808',  // v2rayN / Nehring (socks)
    'http://127.0.0.1:10809',    // v2rayN / Nehring (http)
    'http://127.0.0.1:7890',     // Clash / Mihomo (mixed)
    'socks5://127.0.0.1:7891',   // Clash (socks)
    'http://127.0.0.1:10801',    // پورت‌های غیراستاندارد رایج
    'http://127.0.0.1:8888',     // Fiddler / Proxifier
    'http://127.0.0.1:8118'      // Privoxy
  ]
}

export type ProxyTestKind = 'ok' | 'blocked' | 'no-connection' | 'no-data'

export interface ProxyTestResult {
  /** یعنی این خروجی برای استخراج اینستاگرام واقعاً قابل استفاده است */
  ok: boolean
  kind: ProxyTestKind
  latencyMs: number | null
  error?: string
}

/**
 * تست واقعی یک خروجی: اول اتصال عمومی، بعد دسترسی به اینستاگرام
 * (اول API، اگر محدود بود مسیر HTML خزنده که عملاً همیشه کار می‌کند).
 * proxyUrl = null یعنی مستقیم (بدون پروکسی)
 */
export async function checkProxyForInstagram(
  proxyUrl: string | null,
  timeoutMs = 12000
): Promise<ProxyTestResult> {
  const start = Date.now()

  // مرحله ۱: آیا اتصال عمومی برقرار است؟
  try {
    await axios.get('https://www.google.com/generate_204', {
      ...requestConfig(proxyUrl, 8000),
      validateStatus: (status) => status >= 200 && status < 400
    })
  } catch (error: any) {
    return { ok: false, kind: 'no-connection', latencyMs: null, error: describeProxyError(error) }
  }

  // مرحله ۲: مسیر HTML خزنده (روش اصلی برنامه — حتی با IP محدودشده کار می‌کند)
  const htmlResult = await strategyProfileHtml('instagram', proxyUrl)
  if (htmlResult.ok) {
    return { ok: true, kind: 'ok', latencyMs: Date.now() - start }
  }

  // مرحله ۳: API وب (روش دوم) — برای گزارش دقیق‌تر وضعیت
  try {
    const response = await axios.get(`${WEB_PROFILE_URL}instagram`, {
      ...requestConfig(proxyUrl, timeoutMs),
      headers: webProfileHeaders('instagram')
    })
    const latencyMs = Date.now() - start

    if (response.status === 200 && response.data?.data?.user) {
      return { ok: true, kind: 'ok', latencyMs }
    }
    if ([401, 403, 429].includes(response.status)) {
      return {
        ok: false,
        kind: 'blocked',
        latencyMs,
        error: `API محدود شده (کد ${response.status}) و مسیر جایگزین هم جواب نداد (${htmlResult.error}) — سرور دیگری امتحان کنید`
      }
    }
    return { ok: false, kind: 'no-data', latencyMs, error: `پاسخ غیرمنتظره (کد ${response.status})` }
  } catch (error: any) {
    return {
      ok: false,
      kind: 'no-connection',
      latencyMs: null,
      error: `دسترسی به اینستاگرام برقرار نشد: ${describeProxyError(error)}`
    }
  }
}

/** تست یک پروکسی مشخص؛ مقدار 'direct' یعنی بدون پروکسی */
export async function testProxy(proxyUrl: string): Promise<ProxyTestResult> {
  return checkProxyForInstagram(proxyUrl === 'direct' ? null : proxyUrl)
}

// ---------- تشخیص خودکار ----------

export interface ProxyStatus {
  proxyUrl: string | null
  source: 'settings' | 'env' | 'auto' | 'none'
  description: string
}

/**
 * ترتیب تشخیص پروکسی:
 * 1. مقدار ذخیره‌شده در دیتابیس (از صفحه تنظیمات)
 * 2. متغیر محیطی INSTAGRAM_PROXY
 * 3. تشخیص خودکار پورت‌های رایج روی localhost (با تست واقعی اینستاگرام)
 * 4. بدون پروکسی (مستقیم)
 */
export async function resolveProxy(): Promise<ProxyStatus> {
  const saved = getSetting('proxy_url')
  if (saved === 'direct') {
    return { proxyUrl: null, source: 'settings', description: 'مستقیم (بدون پروکسی) — از تنظیمات' }
  }
  if (saved) {
    return { proxyUrl: saved, source: 'settings', description: `ذخیره‌شده در تنظیمات: ${saved}` }
  }

  const env = process.env.INSTAGRAM_PROXY
  if (env) {
    return { proxyUrl: env, source: 'env', description: `متغیر محیطی INSTAGRAM_PROXY: ${env}` }
  }

  for (const candidate of detectLocalProxies()) {
    const test = await checkProxyForInstagram(candidate)
    if (test.ok) {
      // ذخیره می‌کنیم تا دفعه‌های بعد دوباره probe نشه
      setSetting('proxy_url', candidate)
      return { proxyUrl: candidate, source: 'auto', description: `تشخیص خودکار: ${candidate}` }
    }
  }

  return { proxyUrl: null, source: 'none', description: 'هیچ پروکسی سالمی پیدا نشد — از صفحه تنظیمات به‌صورت دستی تنظیم کنید' }
}

/** فهرست کاندیدهای پروکسی که fetch باید به‌ترتیب امتحان کند (null = مستقیم) */
function proxyCandidates(): (string | null)[] {
  const saved = getSetting('proxy_url')

  if (saved === 'direct') return [null]
  if (saved) return [saved, null]

  const env = process.env.INSTAGRAM_PROXY
  if (env) return [env, null]

  return [...detectLocalProxies(), null]
}

// ---------- استراتژی‌های استخراج ----------

interface StrategyResult {
  ok: boolean
  data?: Omit<InstagramProfileData, 'success' | 'error'>
  /** 401/403/429 یعنی محدود شدن IP؛ باید پروکسی/سرور عوض شود */
  blocked?: boolean
  /** پیج واقعاً وجود ندارد؛ زنجیره را قطع کن */
  notFound?: boolean
  /** شبکه اصلاً از دسترس خارج است (timeout/refused)؛ بقیه‌ی استراتژی‌های این کاندید بی‌فایده‌اند */
  transportDead?: boolean
  /** داده دریافت شد ولی نشانه‌های پروفایل خالی/سایه‌ای دارد (0 پست، فالوور خیلی کم) */
  suspicious?: boolean
  error?: string
}

/** استراتژی ۱: API وب اینستاگرام (به‌عنوان مرورگر) */
async function strategyWebProfile(username: string, proxyUrl: string | null): Promise<StrategyResult> {
  try {
    const response = await axios.get(`${WEB_PROFILE_URL}${encodeURIComponent(username)}`, {
      ...requestConfig(proxyUrl),
      headers: webProfileHeaders(username)
    })

    if ([401, 403, 429].includes(response.status)) {
      return { ok: false, blocked: true, error: `محدود شدن IP (کد ${response.status})` }
    }
    if (response.status === 404) {
      return { ok: false, notFound: true, error: 'پیج یافت نشد' }
    }

    const user = response.data?.data?.user
    if (!user) {
      return { ok: false, error: 'ساختار پاسخ اینستاگرام تغییر کرده یا پیج خصوصی است' }
    }

    return { ok: true, data: parseGraphUser(user) }
  } catch (error: any) {
    if ([401, 403, 429].includes(error.response?.status)) {
      return { ok: false, blocked: true, error: `محدود شدن IP (کد ${error.response.status})` }
    }
    if (error.response?.status === 404) {
      return { ok: false, notFound: true, error: 'پیج یافت نشد' }
    }
    return { ok: false, error: describeProxyError(error) }
  }
}

/** استراتژی ۲: endpoint عمومی instagram.com (فرمت قدیمی __a=1) */
async function strategyPublicApi(username: string, proxyUrl: string | null): Promise<StrategyResult> {
  const endpoints = [
    `https://www.instagram.com/${username}/?__a=1&__d=dis`,
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`
  ]

  for (const url of endpoints) {
    try {
      const response = await axios.get(url, {
        ...requestConfig(proxyUrl),
        headers: {
          'User-Agent': randomUserAgent(),
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'X-IG-App-ID': '936619743392459',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `https://www.instagram.com/${username}/`
        }
      })

      if ([401, 403, 429].includes(response.status)) {
        return { ok: false, blocked: true, error: `محدود شدن IP (کد ${response.status})` }
      }

      const user = response.data?.data?.user || response.data?.graphql?.user
      if (user) {
        return { ok: true, data: parseGraphUser(user) }
      }
    } catch (error: any) {
      if ([401, 403, 429].includes(error.response?.status)) {
        return { ok: false, blocked: true, error: `محدود شدن IP (کد ${error.response.status})` }
      }
      continue
    }
  }

  return { ok: false, error: 'endpoint عمومی اینستاگرام جواب نداد' }
}

/**
 * استراتژی ۳: پارس صفحه‌ی HTML پروفایل با UA خزنده.
 * اینستاگرام به خزنده‌ها (Googlebot) صفحه‌ای با JSON کامل پروفایل
 * (follower_count، biography، ...) می‌دهد و محدودیت 429 روی آن اعمال نمی‌شود.
 */
async function strategyProfileHtml(username: string, proxyUrl: string | null): Promise<StrategyResult> {
  const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'

  try {
    const response = await axios.get(`https://www.instagram.com/${encodeURIComponent(username)}/`, {
      ...requestConfig(proxyUrl, 20000),
      headers: {
        'User-Agent': BOT_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    })

    if ([401, 403, 429].includes(response.status)) {
      return { ok: false, blocked: true, error: `محدود شدن IP (کد ${response.status})` }
    }
    if (response.status !== 200) {
      return { ok: false, error: `صفحه پروفایل پاسخ ${response.status} داد` }
    }

    const html = typeof response.data === 'string' ? response.data : ''

    // ---- مسیر ۱: JSON کامل پروفایل داخل script (خروجی خزنده) ----
    // مثال: {"require":[...{ data: { xig_user_by_igid_v2: { follower_count, biography, ... } } }]
    const userData = extractProfileJson(html)
    if (userData) {
      const followers = userData.follower_count ?? 0
      const data = {
        username: userData.username || username,
        full_name: decodeHtmlEntities(decodeJsonUnicode(userData.full_name || '')),
        bio: decodeJsonUnicode(userData.biography || ''),
        followers,
        last_post_date: null as string | null,
        profile_pic_url: (userData.profile_pic_url || '').replace(/\\/g, '')
      }
      return {
        ok: true,
        data,
        suspicious: looksLikeShadowProfile(
          followers,
          userData.following_count,
          html
        )
      }
    }

    // ---- مسیر ۲: og-tags معمولی (خروجی مرورگر) ----
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/)
    const title = titleMatch ? titleMatch[1] : ''
    const ogMatch = html.match(/og:description" content="([^"]*)"/)
    const og = ogMatch ? ogMatch[1] : ''

    // مثال og: "1.2M Followers, 85 Following, 3,456 Posts - Instagram"
    const followersMatch = og.match(/([\d.,]+\s*[KkMmBb]?)\s*Followers/i)
    if (followersMatch) {
      const followers = parseFollowerCount(followersMatch[1].replace(/\s/g, ''))
      if (followers !== null) {
        // مثال title: "NASA (@nasa) • Instagram photos and videos"
        const nameMatch = decodeHtmlEntities(title).match(/^(.*?)\s*\(@([a-zA-Z0-9._]+)\)/)
        return {
          ok: true,
          data: {
            username: nameMatch ? nameMatch[2] : username,
            full_name: nameMatch ? nameMatch[1].trim() : '',
            bio: '',
            followers,
            last_post_date: null,
            profile_pic_url: ''
          },
          suspicious: looksLikeShadowProfile(followers, undefined, og)
        }
      }
    }

    // پیج وجود ندارد؟ اینستاگرام برای پیج ناموجود صفحه "Sorry, this page isn't available" می‌دهد
    if (title.includes("Sorry, this page isn't available")) {
      return { ok: false, notFound: true, error: 'پیج یافت نشد' }
    }

    return { ok: false, error: 'اطلاعات پروفایل در صفحه‌ی HTML نبود' }
  } catch (error: any) {
    const err = { ok: false, error: describeProxyError(error) } as StrategyResult
    // timeout/refused یعنی این مسیر اصلاً در دسترس نیست؛ بقیه‌ی استراتژی‌های این کاندید هم شکست می‌خورند
    if (error.code === 'ECONNABORTED' || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      err.transportDead = true
    }
    return err
  }
}

/**
 * استخراج پروفایل از JSON داخل تگ‌های <script type="application/json">
 * در خروجی خزنده‌ی اینستاگرام، داده‌ها زیر کلیدهای xig_user_by_igid_v2
 * و مشابه آن است. با جستجوی الگوی "username"/"follower_count" همزمان،
 * خودِ آبجکت پروفایل را پیدا می‌کنیم (بدون وابستگی به نام کلید ریشه).
 */
function extractProfileJson(html: string): {
  username?: string
  full_name?: string
  biography?: string
  follower_count?: number
  following_count?: number
  profile_pic_url?: string
} | null {
  const scriptMatches = html.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)

  for (const scriptMatch of scriptMatches) {
    let jsonText = scriptMatch[1]
    try {
      // آبجکت پروفایل با الگوی JSON escape شده هم می‌آید (\\"follower_count\\":)
      const escaped = /\\"follower_count\\":(\d+)/.exec(jsonText)
      if (escaped) {
        jsonText = jsonText.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
      }

      const parsed = JSON.parse(jsonText)
      const user = findProfileObject(parsed)
      if (user && user.username && typeof user.follower_count === 'number') {
        return user
      }
    } catch {
      continue
    }
  }

  // fallback: regex مستقیم روی خود HTML (برای خروجی escape شده)
  const fc = html.match(/\\?"follower_count\\?":(\d+)/)
  const un = html.match(/\\?"username\\?":\\?"([a-zA-Z0-9._]+)\\?"/)
  const fn = html.match(/\\?"full_name\\?":\\?"((?:[^"\\]|\\.)*)\\?"/)
  const bio = html.match(/\\?"biography\\?":\\?"((?:[^"\\]|\\.)*)\\?"/)
  const ppu = html.match(/\\?"profile_pic_url\\?":\\?"((?:[^"\\]|\\.)*)\\?"/)
  const fwin = html.match(/\\?"following_count\\?":(\d+)/)

  if (fc && un) {
    return {
      username: un[1],
      full_name: fn ? fn[1] : '',
      biography: bio ? bio[1] : '',
      follower_count: parseInt(fc[1], 10),
      following_count: fwin ? parseInt(fwin[1], 10) : undefined,
      profile_pic_url: ppu ? ppu[1] : ''
    }
  }

  return null
}

/**
 * تشخیص پروفایل «سایه‌ای/خالی»: وقتی اینستاگرام برای IP دیتاسنتر نسخه‌ی
 * تهی‌شده‌ی یک پیج معروف را برمی‌گرداند (0 پست، 0 فالوئینگ، فالوور خیلی کم).
 * برای پیج‌های واقعاً کوچک این تشخیص غیرفعال است (فقط وقتی following_count=0
 * و bio خالی و فالوور < 100 باشد مشکوک تلقی می‌شود).
 */
function looksLikeShadowProfile(
  followers: number,
  followingCount: number | undefined,
  contextText: string
): boolean {
  if (followers > 100) return false
  // 0 Posts در og:description نشانه‌ی قوی نسخه‌ی سایه‌ای است
  if (/0\s*Posts/i.test(contextText)) return true
  if (followingCount === 0 && followers <= 50) return true
  return false
}

/** جستجوی بازگشتی در آبجکت parsed برای پیدا کردن آبجکت پروفایل */
function findProfileObject(obj: any, depth = 0): any {
  if (depth > 12 || !obj || typeof obj !== 'object') return null

  if (
    typeof obj.username === 'string' &&
    typeof obj.follower_count === 'number' &&
    ('biography' in obj || 'full_name' in obj)
  ) {
    return obj
  }

  for (const key of Object.keys(obj)) {
    const found = findProfileObject(obj[key], depth + 1)
    if (found) return found
  }

  return null
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#064;|&#[xX]0?40;/g, '@')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
}

/** استراتژی ۴: سایت‌های mirror عمومی (آخرین راه) */
async function strategyMirror(username: string, proxyUrl: string | null): Promise<StrategyResult> {
  try {
    const response = await axios.get(`https://imginn.com/${encodeURIComponent(username)}/`, {
      ...requestConfig(proxyUrl, 15000),
      headers: {
        'User-Agent': randomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://imginn.com/'
      },
      validateStatus: (status) => status < 400
    })

    if (response.status !== 200) {
      return { ok: false, error: `mirror پاسخ ${response.status} داد` }
    }

    const $ = cheerio.load(response.data)
    const name = $('.usename').first().text().trim()
    const statsText = $('.followeds').first().text() || $('body').text()
    const followersMatch = statsText.match(/([\d.,]+\s*[KMBkmb])\s*Followers/i) || statsText.match(/([\d.,]+\s*[KMBkmb])/)
    const avatar = $('.avatar img').attr('src') || ''

    const followers = followersMatch ? parseFollowerCount(followersMatch[1].replace(/\s/g, '')) : null
    if (followers === null) {
      return { ok: false, error: 'داده در mirror پیدا نشد' }
    }

    return {
      ok: true,
      data: {
        username,
        full_name: name || username,
        bio: '',
        followers,
        last_post_date: null,
        profile_pic_url: avatar
      }
    }
  } catch (error: any) {
    return { ok: false, error: describeProxyError(error) }
  }
}

/**
 * استراتژی ۵ (و منبع اصلی «تاریخ آخرین پست»): صفحه‌ی embed پروفایل.
 * آدرس instagram.com/<user>/embed/ با UA خزنده، لیست آخرین پست‌ها را همراه
 * taken_at_timestamp برمی‌گرداند و برخلاف API وب برای IPهای دیتاسنتر
 * محدود نمی‌شود (کد 429 نمی‌دهد).
 */
async function strategyEmbed(username: string, proxyUrl: string | null): Promise<StrategyResult> {
  const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'

  try {
    const response = await axios.get(`https://www.instagram.com/${encodeURIComponent(username)}/embed/`, {
      ...requestConfig(proxyUrl, 20000),
      headers: {
        'User-Agent': BOT_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    })

    if ([401, 403, 429].includes(response.status)) {
      return { ok: false, blocked: true, error: `محدود شدن IP (کد ${response.status})` }
    }
    if (response.status !== 200 || typeof response.data !== 'string') {
      return { ok: false, error: `صفحه‌ی embed پاسخ ${response.status} داد` }
    }

    const parsed = parseEmbedProfile(response.data)
    if (!parsed || (parsed.followers === null && !parsed.last_post_date)) {
      return { ok: false, error: 'اطلاعات پروفایل/پست‌ها در صفحه‌ی embed نبود' }
    }

    return {
      ok: true,
      data: {
        username: parsed.username || username,
        full_name: parsed.full_name,
        bio: '',
        followers: parsed.followers ?? 0,
        last_post_date: parsed.last_post_date,
        profile_pic_url: parsed.profile_pic_url
      }
    }
  } catch (error: any) {
    const err: StrategyResult = { ok: false, error: describeProxyError(error) }
    if (error.code === 'ECONNABORTED' || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      err.transportDead = true
    }
    return err
  }
}

/**
 * پارس صفحه‌ی embed: فالوور، جدیدترین تاریخ پست، نام و تصویر پروفایل.
 * داده‌های این صفحه JSON دوباره‌escape‌شده است (\\" و \\/).
 */
export function parseEmbedProfile(html: string): {
  username: string | null
  full_name: string
  profile_pic_url: string
  followers: number | null
  last_post_date: string | null
} | null {
  const followers = numberOrNull(
    html.match(/edge_followed_by\\*"?\s*:\s*\{\\*"?\s*count\\*"?\s*:\s*(\d+)/)?.[1]
  )
  const lastPostDate = extractLatestPostDate(html)

  const userRaw = html.match(/\\*"username\\*"\s*:\s*\\*"([a-zA-Z0-9._]{1,30})\\*"/)?.[1]
  const nameRaw = html.match(/\\*"full_name\\*"\s*:\s*\\*"((?:[^"\\]|\\.)*?)\\*"\s*,/)?.[1]
  const picRaw = html.match(/\\*"profile_pic_url\\*"\s*:\s*\\*"((?:[^"\\]|\\.)*?)\\*"\s*,/)?.[1]

  if (followers === null && !lastPostDate && !userRaw) return null

  return {
    username: userRaw ? unescapeIgJson(userRaw) : null,
    full_name: nameRaw ? decodeHtmlEntities(unescapeIgJson(nameRaw)) : '',
    profile_pic_url: picRaw ? unescapeIgJson(picRaw) : '',
    followers,
    last_post_date: lastPostDate
  }
}

/** جدیدترین taken_at_timestamp موجود در HTML → تاریخ ISO */
function extractLatestPostDate(html: string): string | null {
  const stamps = [...html.matchAll(/taken_at_timestamp\\*"?\s*:\s*(\d{9,11})/g)].map(m => Number(m[1]))
  if (!stamps.length) return null

  const latest = Math.max(...stamps)
  const date = new Date(latest * 1000)
  return isNaN(date.getTime()) ? null : date.toISOString()
}

/**
 * تبدیل escape‌های JSON اینستاگرام به متن واقعی.
 * صفحه‌ی embed بعضی بخش‌ها را دو بار escape می‌کند (\"https:\\\\\\/\\\/...\")،
 * پس تا جایی که رشته تغییر کند این تبدیل را تکرار می‌کنیم.
 */
function unescapeIgJson(text: string): string {
  let result = text

  for (let pass = 0; pass < 3; pass++) {
    const next = result
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
      .replace(/\\(.)/gs, (_, char) => (char === 'n' ? '\n' : char === 'r' ? '' : char === 't' ? ' ' : char))

    if (next === result) break
    result = next
  }

  return result
}

function numberOrNull(value?: string): number | null {
  if (!value) return null
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * اگر تاریخ آخرین پست را نداریم، از صفحه‌ی embed کاملش می‌کنیم.
 * (صفحه‌ی HTML پروفایل بیو و فالوور می‌دهد ولی پست‌ها را نه.)
 */
async function enrichWithLastPost(
  data: Omit<InstagramProfileData, 'success' | 'error'>,
  username: string,
  proxyUrl: string | null
): Promise<Omit<InstagramProfileData, 'success' | 'error'>> {
  if (data.last_post_date) return data

  const embed = await strategyEmbed(username, proxyUrl)
  if (!embed.ok || !embed.data) return data

  return {
    ...data,
    last_post_date: embed.data.last_post_date ?? null,
    followers: data.followers || embed.data.followers,
    full_name: data.full_name || embed.data.full_name,
    profile_pic_url: data.profile_pic_url || embed.data.profile_pic_url
  }
}

function parseGraphUser(user: any): Omit<InstagramProfileData, 'success' | 'error'> {
  let lastPostDate: string | null = null
  try {
    const edges = user.edge_owner_to_timeline_media?.edges
    if (edges && edges.length > 0) {
      const taken = edges[0]?.node?.taken_at_timestamp
      if (taken) lastPostDate = new Date(taken * 1000).toISOString()
    }
  } catch (_) { /* ignore */ }

  return {
    username: user.username,
    full_name: user.full_name || '',
    bio: user.biography || '',
    followers: user.edge_followed_by?.count || 0,
    last_post_date: lastPostDate,
    profile_pic_url: user.profile_pic_url_hd || user.profile_pic_url || ''
  }
}

/** تبدیل \n و \uXXXX داخل رشته‌های JSON به کاراکتر واقعی */
function decodeJsonUnicode(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
}

/** تبدیل «123K» یا «1,234» یا «1.2M» به عدد */
function parseFollowerCount(text: string): number | null {
  if (!text) return null
  const cleaned = text.replace(/,/g, '').trim()

  const kMatch = cleaned.match(/^([\d.]+)[Kk]$/)
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000)

  const mMatch = cleaned.match(/^([\d.]+)[Mm]$/)
  if (mMatch) return Math.round(parseFloat(mMatch[1]) * 1_000_000)

  const bMatch = cleaned.match(/^([\d.]+)[Bb]$/)
  if (bMatch) return Math.round(parseFloat(bMatch[1]) * 1_000_000_000)

  const nMatch = cleaned.match(/^\d+$/)
  if (nMatch) return parseInt(cleaned, 10)

  return null
}

// ---------- اجرای زنجیره ----------

export async function fetchInstagramProfile(rawUsername: string): Promise<InstagramProfileData> {
  const username = cleanUsername(rawUsername)

  if (!username || !isValidUsername(username)) {
    return fail(username, 'نام کاربری نامعتبر است')
  }

  const candidates = proxyCandidates()
  // اول HTML خزنده (مقاوم‌ترین به محدودیت IP)، بعد API ها، و در آخر embed و mirror
  const strategies = [
    strategyProfileHtml,
    strategyWebProfile,
    strategyPublicApi,
    strategyEmbed,
    strategyMirror
  ]

  let lastError = 'خطای ناشناخته در دریافت اطلاعات'
  let ipWasBlocked = false
  /** بهترین نتیجه‌ی suspicious — فقط اگر چیز بهتری نیامد استفاده می‌شود */
  let fallback: InstagramProfileData | null = null

  for (const proxyUrl of candidates) {
    // برای هر کاندید حداکثر 40 ثانیه
    const deadline = Date.now() + 40_000

    for (const strategy of strategies) {
      if (Date.now() > deadline) break

      const result = await strategy(username, proxyUrl)

      if (result.transportDead && !result.ok) {
        // این کاندید پروکسی به اینستاگرام نمی‌رسد؛ برو کاندید بعدی
        if (result.error) lastError = result.error
        break
      }

      if (result.ok && result.data) {
        if (!result.suspicious) {
          // تاریخ آخرین پست از صفحه‌ی embed کامل می‌شود (اگر در همین استراتژی نیامده باشد)
          const complete = await enrichWithLastPost(result.data, username, proxyUrl)
          return { ...complete, success: true }
        }
        // داده‌ی مشکوک (نسخه‌ی سایه‌ای): نگه می‌داریم و ادامه می‌دهیم
        if (!fallback) {
          fallback = { ...result.data, success: true }
        }
        continue
      }

      if (result.error) lastError = result.error

      // پیج واقعاً وجود ندارد → زنجیره را قطع کن
      if (result.notFound) {
        return fail(username, 'پیج یافت نشد')
      }

      if (result.blocked) {
        ipWasBlocked = true
        // استراتژی‌های دیگر (مثل HTML) ممکن است از محدودیت API عبور کنند
        continue
      }
    }
  }

  // اگر فقط نتیجه‌ی مشکوک داشتیم، همان را برگردان (بهتر از هیچی است)
  if (fallback) {
    return fallback
  }

  if (ipWasBlocked) {
    return fail(
      username,
      'اینستاگرام IP شما را محدود کرده است (کد 401/403/429). ' +
      'در v2rayN یک کانفیگ/سرور خارجی دیگر انتخاب کنید، سپس در صفحه «تنظیمات پروکسی» گزینه‌ی سالم را تست و ذخیره کنید.'
    )
  }

  return fail(username, lastError)
}

function fail(username: string, error: string): InstagramProfileData {
  return {
    username,
    full_name: '',
    bio: '',
    followers: 0,
    last_post_date: null,
    profile_pic_url: '',
    success: false,
    error
  }
}
