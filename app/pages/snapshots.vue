<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const { getSnapshots } = useDatabase()

const fromDate = ref('')
const toDate = ref('')
const snapshots = ref<any[]>([])
const loading = ref(false)

const pivotData = computed(() => {
  const accounts = new Set(snapshots.value.map(s => s.username))
  const dates = [...new Set(snapshots.value.map(s => s.snapshot_date))].sort()

  const rows: any[] = []

  accounts.forEach(username => {
    const row: any = { username }
    dates.forEach(date => {
      const snap = snapshots.value.find(
        s => s.username === username && s.snapshot_date === date
      )
      row[date] = snap ? snap.followers : null
    })
    rows.push(row)
  })

  return { dates, rows }
})

async function loadSnapshots() {
  loading.value = true
  try {
    const params: any = {}
    if (fromDate.value) params.from_date = fromDate.value
    if (toDate.value) params.to_date = toDate.value

    const result: any = await getSnapshots(params)
    snapshots.value = result.data || []
  } finally {
    loading.value = false
  }
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

async function handleExport() {
  const params = new URLSearchParams()
  if (fromDate.value) params.append('from_date', fromDate.value)
  if (toDate.value) params.append('to_date', toDate.value)

  window.open(`/api/export/snapshots?${params.toString()}`, '_blank')
}

onMounted(loadSnapshots)
</script>

<template>
  <div class="snapshots-page">
    <h1>گزارش اسنپ‌شات‌ها</h1>

    <div class="filters">
      <div class="date-picker-group">
        <label>از تاریخ:</label>
        <ClientOnly>
          <DatePicker
            v-model="fromDate"
            format="YYYY-MM-DD"
            display-format="jYYYY-jMM-jDD"
            placeholder="انتخاب تاریخ شروع"
          />
          <template #fallback>
            <input type="text" placeholder="در حال بارگذاری..." disabled />
          </template>
        </ClientOnly>
      </div>

      <div class="date-picker-group">
        <label>تا تاریخ:</label>
        <ClientOnly>
          <DatePicker
            v-model="toDate"
            format="YYYY-MM-DD"
            display-format="jYYYY-jMM-jDD"
            placeholder="انتخاب تاریخ پایان"
          />
          <template #fallback>
            <input type="text" placeholder="در حال بارگذاری..." disabled />
          </template>
        </ClientOnly>
      </div>

      <button @click="loadSnapshots" class="btn-filter">
        🔍 فیلتر
      </button>

      <button @click="handleExport" class="btn-export">
        📥 خروجی اکسل
      </button>
    </div>

    <div v-if="loading" class="loading">در حال بارگذاری...</div>

    <div v-else-if="pivotData.dates.length === 0" class="empty">
      اسنپ‌شاتی یافت نشد
    </div>

    <div v-else class="table-container">
      <table class="pivot-table">
        <thead>
          <tr>
            <th>پیج</th>
            <th v-for="date in pivotData.dates" :key="date">
              {{ formatDate(date) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in pivotData.rows" :key="row.username">
            <td class="username-cell">@{{ row.username }}</td>
            <td v-for="date in pivotData.dates" :key="date" class="ltr">
              {{ row[date] !== null ? row[date].toLocaleString('fa-IR') : '-' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.snapshots-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  direction: rtl;
}

.filters {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  margin: 24px 0;
  flex-wrap: wrap;
}

.date-picker-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-picker-group label {
  font-size: 13px;
  color: #6b7280;
}

.btn-filter {
  padding: 10px 20px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-export {
  padding: 10px 20px;
  background: #10b981;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.table-container {
  overflow-x: auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.pivot-table {
  width: 100%;
  border-collapse: collapse;
}

.pivot-table th,
.pivot-table td {
  padding: 12px 16px;
  text-align: center;
  border-bottom: 1px solid #f3f4f6;
  font-size: 13px;
}

.pivot-table th {
  background: #f9fafb;
  font-weight: 600;
}

.username-cell {
  font-weight: 600;
  text-align: right;
  direction: ltr;
}

.ltr {
  direction: ltr;
}

.loading, .empty {
  text-align: center;
  padding: 48px;
  color: #6b7280;
}
</style>