export interface AuthUser {
  id: number
  username: string
  fullname: string
  permissions: string[]
}

export const useAuth = () => {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const loaded = useState<boolean>('auth-loaded', () => false)

  /** دریافت اطلاعات کاربر از سرور — هنگام SSR، کوکی درخواست را همراه بفرست */
  const loadUser = async () => {
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
    try {
      const res: any = await $fetch('/api/auth/me', { headers })
      user.value = res.data || null
    } catch {
      user.value = null
    }
    loaded.value = true
    return user.value
  }

  const login = async (username: string, password: string) => {
    await $fetch('/api/auth/login', { method: 'POST', body: { username, password } })
    // بعد از لاگین، اطلاعات کاربر را دوباره از سرور بگیر
    const res: any = await $fetch('/api/auth/me')
    user.value = res.data || null
    loaded.value = true
    return user.value
  }

  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => { })
    user.value = null
    loaded.value = true
    await navigateTo('/login')
  }

  /** آیا کاربر پرمیشن مورد نظر را دارد؟ */
  const can = (code: string) => !!user.value?.permissions?.includes(code)

  /** تغییر رمز عبور خود کاربر */
  const changePassword = async (currentPassword: string, newPassword: string) => {
    return await $fetch('/api/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword }
    })
  }

  return { user, loaded, loadUser, login, logout, can, changePassword }
}
