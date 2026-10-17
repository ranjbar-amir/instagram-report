import { getSnapshotsByDateRange } from '~~/server/utils/db'
import { generateSnapshotsExcel } from '~~/server/utils/excel-generator'
import { requirePermission } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requirePermission(event, 'snapshot.report')
  const query = getQuery(event)
  
  const snapshots = getSnapshotsByDateRange(
    undefined,
    query.from_date as string,
    query.to_date as string
  )
  
  const buffer = await generateSnapshotsExcel(snapshots)
  
  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="instagram-snapshots-${Date.now()}.xlsx"`)
  
  return buffer
})