import { getAllAccounts } from '~~/server/utils/db'

export default defineEventHandler(() => {
  const accounts = getAllAccounts()
  return { success: true, data: accounts }
})