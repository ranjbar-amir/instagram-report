export const useDatabase = () => {
  const getAccounts = async () => {
    return await $fetch('/api/accounts')
  }
  
  const addAccount = async (username: string) => {
    return await $fetch('/api/accounts', {
      method: 'POST',
      body: { username }
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
    getSnapshots
  }
}