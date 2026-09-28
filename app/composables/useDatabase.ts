export const useDatabase = () => {
  const getAccounts = async () => {
    return await $fetch('/api/accounts')
  }
  
  const addAccount = async (username: string, force = false) => {
    return await $fetch('/api/accounts', {
      method: 'POST',
      body: { username, force }
    })
  }
  
  const removeAccount = async (id: number) => {
    return await $fetch(`/api/accounts/${id}`, {
      method: 'DELETE'
    })
  }
  
  const createSnapshot = async (accountId: number, followers: number, date?: string) => {
    return await $fetch('/api/snapshots', {
      method: 'POST',
      body: { account_id: accountId, followers, snapshot_date: date }
    })
  }
  
  /**
   * اسنپ‌شات گروهی؛ بدون آرگومان برای همه‌ی پیج‌های لیست
   * و با آرایه‌ی شناسه‌ها برای چند پیج مشخص.
   */
  const captureAllSnapshots = async (accountIds?: number[]) => {
    return await $fetch('/api/snapshots/capture-all', {
      method: 'POST',
      body: accountIds?.length ? { account_ids: accountIds } : {}
    })
  }

  const getSnapshots = async (params?: {
    account_id?: number
    from_date?: string
    to_date?: string
  }) => {
    return await $fetch('/api/snapshots', { params })
  }
  
  return {
    getAccounts,
    addAccount,
    removeAccount,
    createSnapshot,
    captureAllSnapshots,
    getSnapshots
  }
}