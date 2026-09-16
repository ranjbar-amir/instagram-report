<script setup lang="ts">
import { ref, onMounted } from 'vue'

const { getAccounts, removeAccount, createSnapshot } = useDatabase()
const { fetchProfile } = useInstagram()

const accounts = ref<any[]>([])
const loading = ref(true)
const refreshingId = ref<number | null>(null)

async function loadAccounts() {
  loading.value = true
  try {
    const result: any = await getAccounts()
    accounts.value = result.data || []
  } finally {
    loading.value = false
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