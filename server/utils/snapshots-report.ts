export interface SnapshotRow {
  id?: number
  account_id: number
  username: string
  followers: number
  snapshot_date: string
}

export interface SnapshotPivotRow {
  username: string
  /** مقدار هر تاریخ به ترتیب صعودی تاریخ‌ها (null = در آن روز اسنپ‌شات نداریم) */
  values: Array<{ date: string; followers: number | null }>
  first: number | null
  last: number | null
  /** آخرین منهای اولین (روند رشد مطلق) */
  change: number | null
  /** درصد رشد نسبت به اولین مقدار */
  changePercent: number | null
  /** طول دوره بر حسب روز */
  days: number
}

export interface SnapshotPivot {
  dates: string[]
  rows: SnapshotPivotRow[]
}

/**
 * تبدیل لیست اسنپ‌شات‌ها به جدول پیوت تاریخ × فالوور
 * به‌همراه روند رشد هر پیج (تغییر مطلق و درصدی).
 */
export function buildSnapshotsPivot(snapshots: SnapshotRow[]): SnapshotPivot {
  const dates = [...new Set(snapshots.map(s => s.snapshot_date))].sort()
  const usernames = [...new Set(snapshots.map(s => s.username))].sort((a, b) => a.localeCompare(b))

  // دسترسی سریع: username + date → followers
  const byKey = new Map<string, { id: number; followers: number }>()
  for (const snapshot of snapshots) {
    const key = `${snapshot.username}|${snapshot.snapshot_date}`
    const previous = byKey.get(key)
    // اگر یک پیج در یک روز چند رکورد داشت، جدیدترین (بزرگ‌ترین id) را نگه می‌داریم
    if (!previous || (snapshot.id ?? 0) >= previous.id) {
      byKey.set(key, { id: snapshot.id ?? 0, followers: snapshot.followers })
    }
  }

  const rows: SnapshotPivotRow[] = usernames.map(username => {
    const values = dates.map(date => {
      const found = byKey.get(`${username}|${date}`)
      return { date, followers: found ? found.followers : null }
    })

    const present = values.filter(v => v.followers !== null) as Array<{ date: string; followers: number }>
    const first = present.length ? present[0].followers : null
    const last = present.length ? present[present.length - 1].followers : null

    const change = first !== null && last !== null ? last - first : null
    const changePercent = first ? Math.round((((last as number) - first) / first) * 10000) / 100 : null

    const firstDate = present.length ? new Date(present[0].date).getTime() : null
    const lastDate = present.length ? new Date(present[present.length - 1].date).getTime() : null
    const days = firstDate !== null && lastDate !== null
      ? Math.round((lastDate - firstDate) / 86_400_000)
      : 0

    return { username, values, first, last, change, changePercent, days }
  })

  return { dates, rows }
}

/** تاریخ میلادی رشته‌ای (YYYY-MM-DD) → تاریخ شمسی خوانا */
export function formatJalali(date: string): string {
  const parsed = new Date(date)
  if (isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
