<script setup lang="ts">
import { ref, onMounted } from 'vue'

const { getAccounts, createSnapshot } = useDatabase()
const { fetchProfile } = useInstagram()

const accounts = ref<any[]>([])
const loading = ref(true)
const fetchingId = ref<number | null>(null)

async function loadAccounts() {
  loading.value = true
  try {
    const result: any = await getAccounts()
    accounts.value = result.data || []
  } finally {
    loading.value = false
  }
}

async function handleFetchLive(account: any) {
  fetchingId.value = account.id
  try {
    const result: any = await fetchProfile(account.id)
    if (result.success) {
      // بروزرسانی در لیست
      const index = accounts.value.findIndex(a => a.id === account.id)
      if (index !== -1) {
        accounts.value[index] = result.data
      }
    }
  } catch (e: any) {
    alert(e.data?.message || 'خطا در دریافت اطلاعات')
  } finally {
    fetchingId.value = null
  }
}

async function handleSnapshot(account: any) {
  try {
    await createSnapshot(account.id, account.followers)
    alert('اسنپ‌شات ثبت شد')
  } catch (e: any) {
    alert('خطا در ثبت اسنپ‌شات')
  }
}

async function handleExport() {
  try {
    const response = await fetch('/api/export/report')
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `instagram-report-${new Date().toISOString().split('T')[0]}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (e) {
    alert('خطا در خروجی گرفتن')
  }
}

onMounted(loadAccounts)
</script>

<template>
  <div class="report-page">
    <div class="header-actions">
      <h1>گزارش پیج‌ها</h1>
      <button @click="handleExport" class="btn-export">
        📥 خروجی اکسل
      </button>
    </div>
    
    <div v-if="loading" class="loading">در حال بارگذاری...</div>
    
    <div v-else-if="accounts.length === 0" class="empty">
      هنوز پیجی اضافه نشده است
    </div>
    
    <div v-else class="table-container">
      <table class="report-table">
        <thead>
          <tr>
            <th>#</th>
            <th>تصویر</th>
            <th>نام</th>
            <th>یوزرنیم</th>
            <th>بیو</th>
            <th>فالوور</th>
            <th>آخرین پست</th>
            <th>عملیات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(account, index) in accounts" :key="account.id">
            <td>{{ index + 1 }}</td>
            <td>
              <img 
                v-if="account.profile_pic_url" 
                :src="account.profile_pic_url"
                class="table-avatar"
              />
            </td>
            <td>{{ account.full_name || '-' }}</td>
            <td class="ltr">@{{ account.username }}</td>
            <td class="bio-cell ltr">{{ account.bio || '-' }}</td>
            <td class="ltr">{{ account.followers?.toLocaleString('fa-IR') }}</td>
            <td>
              {{ account.last_post_date 
                ? new Date(account.last_post_date).toLocaleDateString('fa-IR') 
                : 'نامشخص' }}
            </td>
            <td class="actions-cell">
              <button 
                @click="handleFetchLive(account)"
                :disabled="fetchingId === account.id"
                class="btn-sm"
              >
                {{ fetchingId === account.id ? '...' : 'دریافت لحظه‌ای' }}
              </button>
              <button @click="handleSnapshot(account)" class="btn-sm">
                اسنپ‌شات
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.report-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  direction: rtl;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.btn-export {
  padding: 10px 20px;
  background: #10b981;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.table-container {
  overflow-x: auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.report-table {
  width: 100%;
  border-collapse: collapse;
}

.report-table th,
.report-table td {
  padding: 12px 16px;
  text-align: right;
  border-bottom: 1px solid #f3f4f6;
  font-size: 14px;
}

.report-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.table-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.bio-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ltr {
  direction: ltr;
  text-align: left;
}

.actions-cell {
  display: flex;
  gap: 8px;
}

.btn-sm {
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-sm:hover {
  background: #f9fafb;
}

.loading, .empty {
  text-align: center;
  padding: 48px;
  color: #6b7280;
}
</style>