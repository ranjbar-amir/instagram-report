import ExcelJS from 'exceljs'
import { buildSnapshotsPivot, formatJalali } from './snapshots-report'

export async function generateReportExcel(accounts: any[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('گزارش پیج‌ها')
  
  // جهت راست به چپ
  sheet.views = [{ rightToLeft: true }]
  
  // تعریف ستون‌ها
  sheet.columns = [
    { header: 'ردیف', key: 'index', width: 8 },
    { header: 'نام', key: 'full_name', width: 25 },
    { header: 'یوزرنیم', key: 'username', width: 20 },
    { header: 'بیو', key: 'bio', width: 40 },
    { header: 'تعداد فالوور', key: 'followers', width: 15 },
    { header: 'تاریخ آخرین پست', key: 'last_post_date', width: 18 },
    { header: 'لینک پروفایل', key: 'profile_url', width: 30 }
  ]
  
  // استایل هدر
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, size: 12 }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF3B82F6' }
  }
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  
  // اضافه کردن داده‌ها
  accounts.forEach((account, index) => {
    sheet.addRow({
      index: index + 1,
      full_name: account.full_name || account.username,
      username: account.username,
      bio: account.bio || '',
      followers: account.followers,
      last_post_date: account.last_post_date 
        ? new Date(account.last_post_date).toLocaleDateString('fa-IR')
        : 'نامشخص',
      profile_url: `https://instagram.com/${account.username}`
    })
  })
  
  // استایل سلول‌ها
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.alignment = { vertical: 'middle', horizontal: 'center' }
    }
  })
  
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function generateSnapshotsExcel(snapshots: any[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const pivot = buildSnapshotsPivot(snapshots)

  // ---------- شیت ۱: گزارش پیوت (تاریخ × فالوور) + روند رشد ----------
  if (pivot.dates.length > 0) {
    const sheet = workbook.addWorksheet('گزارش پیوت')
    sheet.views = [{ rightToLeft: true }]

    sheet.columns = [
      { header: 'پیج', key: 'username', width: 22 },
      ...pivot.dates.map(date => ({ header: formatJalali(date), key: date, width: 16 })),
      { header: 'آخرین مقدار', key: 'last', width: 16 },
      { header: 'تغییر', key: 'change', width: 14 },
      { header: 'درصد تغییر', key: 'changePercent', width: 14 },
      { header: 'بازه (روز)', key: 'days', width: 12 }
    ]

    const pivotHeader = sheet.getRow(1)
    pivotHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    pivotHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF8B5CF6' }
    }
    pivotHeader.alignment = { horizontal: 'center', vertical: 'middle' }

    for (const row of pivot.rows) {
      const data: Record<string, any> = { username: `@${row.username}` }
      for (const value of row.values) data[value.date] = value.followers
      data.last = row.last
      data.change = row.change
      data.changePercent = row.changePercent
      data.days = row.days

      const added = sheet.addRow(data)

      // سبز = رشد، قرمز = افت
      const color = row.change === null || row.change === 0
        ? null
        : (row.change > 0 ? 'FF047857' : 'FFB91C1C')
      if (color) {
        added.getCell('change').font = { bold: true, color: { argb: color } }
        added.getCell('changePercent').font = { bold: true, color: { argb: color } }
      }
    }
  }

  // ---------- شیت ۲: داده خام ----------
  const sheet = workbook.addWorksheet('داده خام')

  sheet.views = [{ rightToLeft: true }]
  
  sheet.columns = [
    { header: 'ردیف', key: 'index', width: 8 },
    { header: 'یوزرنیم', key: 'username', width: 20 },
    { header: 'تعداد فالوور', key: 'followers', width: 15 },
    { header: 'تاریخ اسنپ‌شات', key: 'snapshot_date', width: 18 }
  ]
  
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF10B981' }
  }
  
  snapshots.forEach((snapshot, index) => {
    sheet.addRow({
      index: index + 1,
      username: snapshot.username,
      followers: snapshot.followers,
      snapshot_date: new Date(snapshot.snapshot_date).toLocaleDateString('fa-IR')
    })
  })
  
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}