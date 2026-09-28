export const useInstagram = () => {
  const validateProfile = async (username: string) => {
    return await $fetch('/api/instagram/validate', {
      params: { username }
    })
  }
  
  const fetchProfile = async (id: number) => {
    return await $fetch('/api/instagram/fetch', {
      params: { id }
    })
  }
  
  /** دریافت اطلاعات همه‌ی پیج‌های لیست (ترتیبی و با فاصله) */
  const refreshAll = async () => {
    return await $fetch('/api/instagram/refresh-all', {
      method: 'POST',
      body: {}
    })
  }

  return {
    validateProfile,
    fetchProfile,
    refreshAll
  }
}