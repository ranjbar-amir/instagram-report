<script setup lang="ts">
import { ref, onMounted } from 'vue'

const { getAccounts, captureAllSnapshots } = useDatabase()
const { fetchProfile, refreshAll } = useInstagram()

const accounts = ref<any[]>([])
const loading = ref(true)
const fetchingId = ref<number | null>(null)
const bulkFetching = ref(false)
const bulkSnapshotting = ref(false)
const progress = ref('')
const status = ref<{ type: 'ok' | 'err' | 'info'; text: string } | null>(null)

const fa = (value: any) => Number(value || 0).toLocaleString('fa-IR')

function setStatus(type: 'ok' | 'err' | 'info', text: string) {
  status.value = { type, text }
}

async function loadAccounts() {
  loading.value = true
  try {
    const result: any = await getAccounts()
    accounts.value = result.data || []
  } finally {
    loading.value = false
  }
}

/** تاریخ آخرین پست + فاصله‌ی زمانی (مثلاً «۳ روز پیش») */
function lastPostLabel(value: string | null | undefined): string {
  if (!value) return 'دریافت نشد'
  const date = new Date(value)
  if (isNaN(date.getTime())) return 'دریافت نشد'

  const label = date.toLocaleDateString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000)

  if (days < 0 || days > 30) return label
  if (days === 0) return `${label} (امروز)`
  if (days === 1) return `${label} (دیروز)`
  return `${label} (${fa(days)} روز پیش)`
}

function lastPostTitle(value: string | null | undefined): string {
  if (!value) {
    return 'تاریخ آخرین پست به دست نیامد. بعضی پیج‌ها را اینستاگرام بدون داده‌ی پست سرو می‌کند؛ برای بقیه پیج‌ها «دریافت کلی» را دوباره بزنید.'
  }
  const date = new Date(value)
  return isNaN(date.getTime()) ? '' : date.toLocaleString('fa-IR')
}

async function handleFetchLive(account: any) {
  fetchingId.value = account.id
  status.value = null
  try {
    const result: any = await fetchProfile(account.id)

    if (!result.success) {
      setStatus('err', `@${account.username}: ${result.error || 'دریافت اطلاعات ناموفق بود'}`)
      return
    }

    const index = accounts.value.findIndex(a => a.id === account.id)
    if (index !== -1) {
      accounts.value[index] = result.data
    }

    if (result.warning) {
      setStatus('info', `اطلاعات @${account.username} بروزرسانی شد (${fa(result.data?.followers)} فالوور) — ${result.warning}`)
    } else {
      setStatus('ok', `اطلاعات @${account.username} بروزرسانی شد (${fa(result.data?.followers)} فالوور)`)
    }
  } catch (e: any) {
    setStatus('err', e?.data?.message || 'خطا در دریافت اطلاعات')
  } finally {
    fetchingId.value = null
  }
}

/** اسنپ‌شات یک پیج (همان مسیر گروهی، برای یک شناسه) */
async function handleSnapshot(account: any) {
  try {
    const result: any = await captureAllSnapshots([account.id])
    const row = result?.data?.results?.[0]

    if (row) {
      const index = accounts.value.findIndex(a => a.id === account.id)
      if (index !== -1) accounts.value[index] = { ...accounts.value[index], followers: row.followers }
    }
    setStatus('ok', `اسنپ‌شات @${account.username} ثبت شد (${fa(row?.followers)} فالوور)`)
  } catch (e: any) {
    setStatus('err', e?.data?.message || 'خطا در ثبت اسنپ‌شات')
  }
}

/** دریافت اطلاعات همه‌ی پیج‌های لیست */
async function handleFetchAll() {
  if (bulkFetching.value) return

  bulkFetching.value = true
  status.value = null
  progress.value = 'در حال دریافت اطلاعات همه‌ی پیج‌ها... این کار بسته به تعداد پیج‌ها ممکن است چند دقیقه طول بکشد.'
  try {
    const result: any = await refreshAll()
    await loadAccounts()

    const data = result?.data
    const firstError = data?.results?.find((r: any) => !r.success)?.error

    if (data?.failed) {
      setStatus(
        data.succeeded ? 'info' : 'err',
        `دریافت کلی: ${fa(data.succeeded)} پیج موفق، ${fa(data.failed)} پیج ناموفق` +
        (firstError ? ` — نمونه خطا: ${firstError}` : '')
      )
    } else {
      setStatus(
        'ok',
        `اطلاعات ${fa(data?.total)} پیج بروزرسانی شد؛ تاریخ آخرین پست برای ${fa(data?.with_last_post)} پیج دریافت شد.`
      )
    }
  } catch (e: any) {
    setStatus('err', e?.data?.message || 'خطا در دریافت گروهی اطلاعات')
  } finally {
    bulkFetching.value = false
    progress.value = ''
  }
}

/** اسنپ‌شات از کل لیست در همین لحظه */
async function handleSnapshotAll() {
  if (bulkSnapshotting.value) return

  bulkSnapshotting.value = true
  status.value = null
  try {
    const result: any = await captureAllSnapshots()
    const data = result?.data
    const dateLabel = data?.snapshot_date
      ? new Date(data.snapshot_date).toLocaleDateString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' })
      : ''

    setStatus(
      'ok',
      `اسنپ‌شات کلی گرفته شد: ${fa(data?.total)} پیج برای تاریخ ${dateLabel} ` +
      `(${fa(data?.created)} رکورد جدید، ${fa(data?.updated)} بروزرسانی)`
    )
  } catch (e: any) {
    setStatus('err', e?.data?.message || 'خطا در ثبت اسنپ‌شات گروهی')
  } finally {
    bulkSnapshotting.value = false
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
    setStatus('err', 'خطا در خروجی گرفتن')
  }
}

onMounted(loadAccounts)
</script>

<template>
  <div class="report-page">
    <div class="header-actions">
      <h1>گزارش پیج‌ها</h1>

      <div class="action-buttons">
        <button
          @click="handleSnapshotAll"
          :disabled="bulkSnapshotting || bulkFetching || accounts.length === 0"
          class="btn-bulk btn-snapshot"
          title="از تعداد فالوور فعلی همه‌ی پیج‌های لیست، به تاریخ امروز اسنپ‌شات ثبت می‌کند"
        >
          {{ bulkSnapshotting ? 'در حال ثبت...' : '📸 اسنپ‌شات کلی' }}
        </button>

        <button
          @click="handleFetchAll"
          :disabled="bulkFetching || bulkSnapshotting || accounts.length === 0"
          class="btn-bulk btn-fetch"
          title="اطلاعات همه‌ی پیج‌های لیست را از اینستاگرام دریافت و ذخیره می‌کند"
        >
          {{ bulkFetching ? 'در حال دریافت...' : '🔄 دریافت کلی' }}
        </button>

        <button @click="handleExport" class="btn-export" :disabled="accounts.length === 0">
          📥 خروجی اکسل
        </button>
      </div>
    </div>

    <div v-if="progress" class="progress-bar">
      <span class="spinner"></span>
      {{ progress }}
    </div>

    <div v-if="status" class="status-banner" :class="status.type">
      {{ status.text }}
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
            <th>آخرین بروزرسانی</th>
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
            <td class="ltr">{{ fa(account.followers) }}</td>
            <td :title="lastPostTitle(account.last_post_date)">
              {{ lastPostLabel(account.last_post_date) }}
            </td>
            <td>{{ account.updated_at ? new Date(account.updated_at).toLocaleString('fa-IR') : '-' }}</td>
            <td class="actions-cell">
              <button
                @click="handleFetchLive(account)"
                :disabled="fetchingId === account.id || bulkFetching"
                class="btn-sm"
              >
                {{ fetchingId === account.id ? '...' : 'دریافت لحظه‌ای' }}
              </button>
              <button
                @click="handleSnapshot(account)"
                :disabled="bulkSnapshotting"
                class="btn-sm"
              >
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
  gap: 16px;
  flex-wrap: wrap;
}

.action-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-bulk {
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #fff;
}

.btn-snapshot {
  background: #8b5cf6;
}

.btn-fetch {
  background: #3b82f6;
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

.btn-bulk:disabled,
.btn-export:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.progress-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 14px;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #bfdbfe;
  border-top-color: #1d4ed8;
  border-radius: 50%;
  display: inline-block;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.status-banner {
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 14px;
  line-height: 1.7;
}

.status-banner.ok {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #047857;
}

.status-banner.err {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

.status-banner.info {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #b45309;
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

.btn-sm:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.loading, .empty {
  text-align: center;
  padding: 48px;
  color: #6b7280;
}
</style>
