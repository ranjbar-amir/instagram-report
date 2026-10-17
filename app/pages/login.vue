<script setup lang="ts">
import { ref } from 'vue'

definePageMeta({ layout: false, public: true })

const { login } = useAuth()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  error.value = ''
  if (!username.value || !password.value) {
    error.value = 'نام کاربری و رمز عبور را وارد کنید'
    return
  }

  loading.value = true
  try {
    await login(username.value.trim(), password.value)
    await navigateTo('/report')
  } catch (e: any) {
    error.value = e?.data?.message || 'خطا در ورود'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h1>ورود به سامانه</h1>
      <p class="subtitle">گزارش و رشد پیج‌های اینستاگرام</p>

      <form @submit.prevent="handleSubmit">
        <div class="field">
          <label>نام کاربری</label>
          <input
            v-model="username"
            type="text"
            class="ltr-input"
            autocomplete="username"
            dir="ltr"
            placeholder="username"
          />
        </div>

        <div class="field">
          <label>رمز عبور</label>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="••••••••"
          />
        </div>

        <div v-if="error" class="error">{{ error }}</div>

        <button type="submit" :disabled="loading" class="btn-login">
          {{ loading ? 'در حال ورود...' : 'ورود' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  direction: rtl;
}

.login-card {
  width: 360px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

h1 {
  font-size: 20px;
  margin-bottom: 4px;
  text-align: center;
}

.subtitle {
  text-align: center;
  font-size: 13px;
  color: #64748b;
  margin-bottom: 24px;
}

.field {
  margin-bottom: 16px;
}

label {
  display: block;
  font-size: 13px;
  margin-bottom: 6px;
  color: #334155;
}

input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
}

input:focus {
  outline: none;
  border-color: #3b82f6;
}

.ltr-input {
  text-align: left;
}

.error {
  background: #fef2f2;
  color: #b91c1c;
  padding: 10px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;
}

.btn-login {
  width: 100%;
  padding: 11px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
}

.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
