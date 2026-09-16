import { getSnapshotsByDateRange } from '~~/server/utils/db'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  
  const snapshots = getSnapshotsByDateRange(
    query.account_id ? parseInt(query.account_id as string) : undefined,
    query.from_date as string,
    query.to_date as string
  )
  
  return { success: true, data: snapshots }
})