export default defineNuxtConfig({
  compatibilityDate: '2026-09-16',

  devtools: { enabled: true },

  css: [
    '~/assets/css/main.css'
  ],

  runtimeConfig: {
    instagramProxy: process.env.INSTAGRAM_PROXY || '',
    public: {}
  },

  nitro: {
    experimental: {
      database: true
    }
  },

  typescript: {
    strict: true,
    typeCheck: false
  }
})