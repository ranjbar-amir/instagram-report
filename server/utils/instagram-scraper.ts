import axios from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { SocksProxyAgent } from 'socks-proxy-agent'

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

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
]

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

function cleanUsername(input: string): string {
  return input
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, '')
    .replace(/\/$/, '')
    .replace(/^@/, '')
    .replace(/\?.*$/, '')
    .trim()
}

/**
 * ساخت agent بر اساس نوع پروکسی (http:// یا socks5://)
 */
function getProxyAgent(): any {
  const proxyUrl = process.env.INSTAGRAM_PROXY
  if (!proxyUrl) return undefined

  try {
    if (proxyUrl.startsWith('socks')) {
      return new SocksProxyAgent(proxyUrl)
    }
    return new HttpsProxyAgent(proxyUrl)
  } catch (e) {
    console.error('Invalid proxy URL:', proxyUrl, e)
    return undefined
  }
}

export async function fetchInstagramProfile(rawUsername: string): Promise<InstagramProfileData> {
  const username = cleanUsername(rawUsername)

  if (!username || !/^[a-zA-Z0-9._]+$/.test(username)) {
    return {
      username,
      full_name: '',
      bio: '',
      followers: 0,
      last_post_date: null,
      profile_pic_url: '',
      success: false,
      error: 'نام کاربری نامعتبر است'
    }
  }

  const proxyAgent = getProxyAgent()

  // اگه پروکسی تنظیم شده ولی agent ساخته نشده، هشدار بده
  if (process.env.INSTAGRAM_PROXY && !proxyAgent) {
    return {
      username,
      full_name: '',
      bio: '',
      followers: 0,
      last_post_date: null,
      profile_pic_url: '',
      success: false,
      error: 'آدرس پروکسی نامعتبر است. فرمت باید http://host:port یا socks5://host:port باشد.'
    }
  }

  try {
    const response = await axios.get(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      {
        headers: {
          'User-Agent': randomUserAgent(),
          'X-IG-App-ID': '936619743392459',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Origin': 'https://www.instagram.com',
          'Referer': `https://www.instagram.com/${username}/`,
          'X-Requested-With': 'XMLHttpRequest',
          'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin'
        },
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 500,
        // اعمال پروکسی
        ...(proxyAgent
          ? { httpsAgent: proxyAgent, httpAgent: proxyAgent, proxy: false }
          : {})
      }
    )

    if (response.status === 404) {
      return {
        username, full_name: '', bio: '', followers: 0,
        last_post_date: null, profile_pic_url: '',
        success: false, error: 'پیج یافت نشد'
      }
    }

    if ([401, 403, 429].includes(response.status)) {
      return {
        username, full_name: '', bio: '', followers: 0,
        last_post_date: null, profile_pic_url: '',
        success: false,
        error: `اینستاگرام IP پروکسی شما را محدود کرده (کد ${response.status}). لطفاً سرور پروکسی دیگری امتحان کنید.`
      }
    }

    const user = response.data?.data?.user

    if (!user) {
      return {
        username, full_name: '', bio: '', followers: 0,
        last_post_date: null, profile_pic_url: '',
        success: false,
        error: 'داده‌های پیج قابل استخراج نبود. ممکن است پیج خصوصی باشد یا ساختار پاسخ تغییر کرده باشد.'
      }
    }

    let lastPostDate: string | null = null
    try {
      const edges = user.edge_owner_to_timeline_media?.edges
      if (edges && edges.length > 0) {
        const taken = edges[0]?.node?.taken_at_timestamp
        if (taken) {
          lastPostDate = new Date(taken * 1000).toISOString()
        }
      }
    } catch (_) {}

    return {
      username: user.username || username,
      full_name: user.full_name || '',
      bio: user.biography || '',
      followers: user.edge_followed_by?.count || 0,
      last_post_date: lastPostDate,
      profile_pic_url: user.profile_pic_url_hd || user.profile_pic_url || '',
      success: true
    }
  } catch (error: any) {
    console.error('Instagram fetch error:', error.message, error.code)

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        username, full_name: '', bio: '', followers: 0,
        last_post_date: null, profile_pic_url: '',
        success: false,
        error: 'اتصال به اینستاگرام timeout شد. اتصال پروکسی/VPN خود را بررسی کنید.'
      }
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return {
        username, full_name: '', bio: '', followers: 0,
        last_post_date: null, profile_pic_url: '',
        success: false,
        error: 'اتصال به پروکسی برقرار نشد. مطمئن شوید v2ray روی پورت درست در حال اجراست.'
      }
    }

    if ([401, 403, 429].includes(error.response?.status)) {
      return {
        username, full_name: '', bio: '', followers: 0,
        last_post_date: null, profile_pic_url: '',
        success: false,
        error: `اینستاگرام IP پروکسی شما را محدود کرده (کد ${error.response.status}). پروکسی را عوض کنید.`
      }
    }

    return {
      username, full_name: '', bio: '', followers: 0,
      last_post_date: null, profile_pic_url: '',
      success: false,
      error: error.response?.data?.message || error.message || 'خطای ناشناخته در دریافت اطلاعات'
    }
  }
}