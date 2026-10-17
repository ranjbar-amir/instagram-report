/**
 * محافظت از صفحات: کاربر لاگین‌نکرده به صفحه ورود هدایت می‌شود.
 * صفحاتی که definePageMeta({ public: true }) دارند مستثنی هستند.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // فقط در سمت سرور چک می‌کنیم تا کوکی واقعی خوانده شود؛
  // در کلاینت، state قبلاً از SSR منتقل شده و نیازی به فراخوانی مجدد نیست.
  const { user, loadUser } = useAuth()

  if (to.path === '/login') {
    if (import.meta.server) {
      const u = await loadUser()
      if (u) return navigateTo('/', { redirectCode: 302, replace: true })
    } else if (user.value) {
      return navigateTo('/', { replace: true })
    }
    return
  }

  if (user.value) return

  const currentUser = await loadUser()
  if (currentUser) return

  return navigateTo('/login', { redirectCode: 302, replace: true })
})
