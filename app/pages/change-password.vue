<script setup lang="ts">
import { ref } from 'vue'

const { user, changePassword, logout } = useAuth()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const message = ref('')
const saving = ref(false)

async function handleSubmit() {
  error.value = ''
  message.value = ''

  if (!currentPassword.value || !newPassword.value) {
    error.value = 'همه فیلدها الزامی است'
    return
  }
  if (newPassword.value.length < 6) {
    error.value = 'رمز جدید باید حداقل ۶ کاراکتر باشد'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'رمز جدید و تکرار آن یکسان نیستند'
    return
  }

  saving.value = true
  try {
    await changePassword(currentPassword.value, newPassword.value)
    message.value = 'رمز عبور با موفقیت تغییر کرد'
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (e: any) {
    error.value = e?.data?.message || 'خطا در تغییر رمز عبور'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="change-password-page">
    <div class="card">
      <h1>تغییر رمز عبور</h1>
      <p class="hint" v-if="user">کاربر: {{ user.fullname || user.username }} (@{{ user.username }})</p>

      <form @submit.prevent="handleSubmit">
        <div class="field">
          <label>رمز عبور فعلی</label>
          <input v-model="currentPassword" type="password" autocomplete="current-password" />
        </div>
        <div class="field">
          <label>رمز عبور جدید (حداقل ۶ کاراکتر)</label>
          <input v-model="newPassword" type="password" autocomplete="new-password" />
        </div>
        <div class="field">
          <label>تکرار رمز جدید</label>
          <input v-model="confirmPassword" type="password" autocomplete="new-password" />
        </div>

        <div v-if="error" class="banner err">{{ error }}</div>
        <div v-if="message" class="banner ok">{{ message }}</div>

        <button type="submit" :disabled="saving" class="btn-primary">
          {{ saving ? 'در حال ذخیره...' : 'تغییر رمز عبور' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.change-password-page {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  direction: rtl;
}

.card {
  width: 380px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 28px;
}

h1 {
  font-size: 18px;
  margin-bottom: 4px;
}

.hint {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 18px;
}

.field {
  margin-bottom: 14px;
}

.field label {
  display: block;
  font-size: 13px;
  margin-bottom: 5px;
  color: #334155;
}

.field input {
  width: 100%;
  box-sizing: border-box;
  padding: 9px 11px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
}

.banner {
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 14px;
}

.banner.err { background: #fef2f2; color: #b91c1c; }
.banner.ok { background: #f0fdf4; color: #15803d; }

.btn-primary {
  width: 100%;
  padding: 10px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
}

.btn-primary:disabled { opacity: 0.6; }
</style>
