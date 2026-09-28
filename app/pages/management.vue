<script setup lang="ts">
import { ref, onMounted } from 'vue'

const { getAccounts, removeAccount, createSnapshot } = useDatabase()
const { fetchProfile } = useInstagram()

const accounts = ref<any[]>([])
const loading = ref(true)
const refreshingId = ref<number | null>(null)
const refreshingAll = ref(false)
const refreshSummary = ref('')

async function loadAccounts() {
  loading.value = true
  try {
    const result: any = await getAccounts()
    accounts.value = result.data || []
  } finally {
    loading.value = false
  }
}

async function handleRefreshAll() {
  if (!confirm('همه پیج‌ها بروزرسانی شوند؟ ممکن است چند دقیقه طول بکشد.')) return

  refreshingAll.value = true
  refreshSummary.value = ''
  try {
    const result: any = await $fetch('/api/instagram/refresh-all', { method: 'POST' })
    refreshSummary.value = `${result.data.succeeded} موفق، ${result.data.failed} ناموفق`
    await loadAccounts()
  } catch (e: any) {
    refreshSummary.value = e.data?.message || 'خطا در بروزرسانی گروهی'
  } finally {
    refreshingAll.value = false
  }
}

async function handleRefresh(id: number) {
  refreshingId.value = id
  try {
    await fetchProfile(id)
    await loadAccounts()
  } finally {
    refreshingId.value = null
  }
}

async function handleDelete(id: number) {
  if (!confirm('آیا از حذف این پیج مطمئن هستید؟')) return
  
  try {
    await removeAccount(id)
    await loadAccounts()
  } catch (e: any) {
    alert(e.data?.message || 'خطا در حذف')
  }
}

async function handleSnapshot(account: any) {
  try {
    await createSnapshot(account.id, account.followers)
    alert('اسنپ‌شات با موفقیت ثبت شد')
  } catch (e: any) {
    alert(e.data?.message || 'خطا در ثبت اسنپ‌شات')
  }
}

onMounted(loadAccounts)
</script>

<template>
  <div class="management-page">
    <h1>مدیریت پیج‌ها</h1>

    <ProxySettings @saved="() => {}" />

    <div class="bulk-row">
      <button
        @click="handleRefreshAll"
        :disabled="refreshingAll || accounts.length === 0"
        class="btn-bulk"
      >
        {{ refreshingAll ? '⏳ در حال بروزرسانی همه...' : '🔄 بروزرسانی همه پیج‌ها' }}
      </button>
      <span v-if="refreshSummary" class="bulk-summary">{{ refreshSummary }}</span>
    </div>

    <AddAccountForm @added="loadAccounts" />
    
    <div v-if="loading" class="loading">در حال بارگذاری...</div>
    
    <div v-else-if="accounts.length === 0" class="empty">
      هنوز پیجی اضافه نشده است
    </div>
    
    <div v-else class="accounts-grid">
      <InstagramCard
        v-for="account in accounts"
        :key="account.id"
        :account="account"
        @delete="handleDelete"
        @snapshot="handleSnapshot"
        @refresh="handleRefresh"
      />
    </div>
  </div>
</template>

<style scoped>
.management-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  direction: rtl;
}

h1 {
  margin-bottom: 24px;
}

.bulk-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0;
}

.btn-bulk {
  padding: 10px 20px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.btn-bulk:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.bulk-summary {
  font-size: 13px;
  color: #374151;
}

.accounts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 24px;
}

.loading, .empty {
  text-align: center;
  padding: 48px;
  color: #6b7280;
}
</style>