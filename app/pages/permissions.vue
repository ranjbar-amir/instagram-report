<script setup lang="ts">
import { ref, onMounted } from 'vue'

const route = useRoute()

const userId = ref<number | null>(null)
const users = ref<any[]>([])
const permissions = ref<any[]>([])
const selected = ref<number[]>([])
const loading = ref(true)
const error = ref('')
const message = ref('')
const saving = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res: any = await $fetch('/api/users')
    users.value = (res.data || []).filter((u: any) => !u.isDeleted)

    // کاربر انتخاب‌شده از query یا اولین کاربر
    const fromQuery = route.query.userId ? Number(route.query.userId) : null
    userId.value = fromQuery && users.value.some(u => u.id === fromQuery)
      ? fromQuery
      : (users.value[0]?.id ?? null)

    if (userId.value) await loadPermissions()
  } catch (e: any) {
    error.value = e?.data?.message || 'خطا در دریافت کاربران'
  } finally {
    loading.value = false
  }
}

async function loadPermissions() {
  error.value = ''
  message.value = ''
  try {
    const res: any = await $fetch('/api/permissions', { params: { userId: userId.value } })
    permissions.value = res.data.permissions || []
    selected.value = res.data.userPermissions || []
  } catch (e: any) {
    error.value = e?.data?.message || 'خطا در دریافت دسترسی‌ها'
  }
}

function onUserChange() {
  if (userId.value) loadPermissions()
}

function toggle(id: number) {
  const i = selected.value.indexOf(id)
  if (i === -1) selected.value.push(id)
  else selected.value.splice(i, 1)
}

async function handleSave() {
  if (!userId.value) return
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    await $fetch('/api/permissions', {
      method: 'POST',
      body: { userId: userId.value, permissionIds: selected.value }
    })
    message.value = 'دسترسی‌ها ذخیره شد'
  } catch (e: any) {
    error.value = e?.data?.message || 'خطا در ذخیره دسترسی‌ها'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="permissions-page">
    <h1>دسترسی کاربران</h1>

    <div v-if="error" class="banner err">{{ error }}</div>
    <div v-if="message" class="banner ok">{{ message }}</div>

    <div v-if="loading" class="loading">در حال بارگذاری...</div>

    <template v-else>
      <div class="picker">
        <label>کاربر:</label>
        <select v-model="userId" @change="onUserChange">
          <option v-for="u in users" :key="u.id" :value="u.id">
            {{ u.username }} {{ u.fullname ? `— ${u.fullname}` : '' }}
          </option>
        </select>
      </div>

      <div v-if="userId" class="card">
        <h2>دسترسی‌ها</h2>
        <div class="perm-grid">
          <label v-for="p in permissions" :key="p.id" class="perm-item">
            <input type="checkbox" :checked="selected.includes(p.id)" @change="toggle(p.id)" />
            <span>{{ p.permisionTitle }}</span>
            <code class="ltr">{{ p.permisionCode }}</code>
          </label>
        </div>
        <button class="btn-primary" :disabled="saving" @click="handleSave">
          {{ saving ? 'در حال ذخیره...' : 'ذخیره دسترسی‌ها' }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.permissions-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
  direction: rtl;
}

.picker {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.picker select {
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  min-width: 260px;
}

.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
}

.card h2 {
  font-size: 16px;
  margin-bottom: 14px;
}

.perm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.perm-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
}

.perm-item input { cursor: pointer; }

.perm-item code {
  margin-right: auto;
  font-size: 11px;
  color: #64748b;
  direction: ltr;
}

.btn-primary {
  padding: 9px 18px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary:disabled { opacity: 0.6; }

.banner {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 14px;
}

.banner.err { background: #fef2f2; color: #b91c1c; }
.banner.ok { background: #f0fdf4; color: #15803d; }

.loading {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}
</style>
