import ExcelJS from 'exceljs'

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
  const sheet = workbook.addWorksheet('اسنپ‌شات‌ها')
  
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