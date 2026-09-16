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
  
  return {
    validateProfile,
    fetchProfile
  }
}