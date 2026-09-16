import { getAllAccounts } from '~~/server/utils/db'
import { generateReportExcel } from '~~/server/utils/excel-generator'

export default defineEventHandler(async (event) => {
  const accounts = getAllAccounts()
  const buffer = await generateReportExcel(accounts)
  
  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="instagram-report-${Date.now()}.xlsx"`)
  
  return buffer
})