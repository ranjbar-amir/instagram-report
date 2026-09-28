<script setup lang="ts">
import { ref, onMounted } from 'vue'

const emit = defineEmits(['saved'])

interface Candidate {
  value: string
  label: string
  ok?: boolean
  latency?: number | null
  error?: string
}

const visible = ref(false)
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const messageType = ref<'ok' | 'err'>('ok')
const saved = ref<string | null>(null)
const currentDesc = ref('')
const custom = ref('')
const candidates = ref<Candidate[]>([])

const CANDIDATE_LABELS: Record<string, string> = {
  'direct': 'مستقیم (بدون پروکسی)',
  'socks5://127.0.0.1:10808': 'v2rayN / Nehring — socks (10808)',
  'http://127.0.0.1:10809': 'v2rayN / Nehring — http (10809)',
  'http://127.0.0.1:7890': 'Clash / Mihomo (7890)',
  'socks5://127.0.0.1:7891': 'Clash — socks (7891)',
  'http://127.0.0.1:8888': 'Fiddler (8888)',
  'http://127.0.0.1:8118': 'Privoxy (8118)'
}

async function loadSettings() {
  loading.value = true
  try {
    const result: any = await $fetch('/api/settings/proxy')
    saved.value = result.data.saved
    currentDesc.value = result.data.current.description
    candidates.value = result.data.candidates.map((c: string) => ({
      value: c,
      label: CANDIDATE_LABELS[c] || c
    }))
  } catch {
    message.value = 'خطا در خواندن تنظیمات'
    messageType.value = 'err'
  } finally {
    loading.value = false
  }
}

async function testCandidate(candidate: Candidate) {
  candidate.ok = undefined
  try {
    const result: any = await $fetch('/api/settings/proxy', {
      method: 'POST',
      body: { action: 'test', proxy_url: candidate.value === 'direct' ? '' : candidate.value }
    })
    candidate.ok = result.data.ok
    candidate.latency = result.data.latencyMs
    candidate.error = result.data.error
  } catch {
    candidate.ok = false
    candidate.error = 'خطا در تست'
  }
}


async function testCustom() {
  if (!custom.value.trim()) return
  try {
    const result: any = await $fetch('/api/settings/proxy', {
      method: 'POST',
      body: { action: 'test', proxy_url: custom.value.trim() }
    })
    if (result.data.ok) {
      message.value = `پروکسی کار می‌کند (${result.data.latencyMs}ms) — برای اعمال، ذخیره کنید`
      messageType.value = 'ok'
    } else {
      message.value = `پروکسی کار نمی‌کند: ${result.data.error}`
      messageType.value = 'err'
    }
  } catch (e: any) {
    message.value = e.data?.message || 'خطا در تست'
    messageType.value = 'err'
  }
}

async function save(value: string) {
  saving.value = true
  try {
    const result: any = await $fetch('/api/settings/proxy', {
      method: 'POST',
      body: { action: 'save', proxy_url: value === 'direct' ? '' : value }
    })
    saved.value = result.data.saved
    currentDesc.value = result.data.current.description
    message.value = 'ذخیره شد ✓'
    messageType.value = 'ok'
    emit('saved')
  } catch (e: any) {
    message.value = e.data?.message || 'خطا در ذخیره'
    messageType.value = 'err'
  } finally {
    saving.value = false
  }
}

async function saveCustom() {
  if (!custom.value.trim()) return
  await save(custom.value.trim())
}

onMounted(loadSettings)
</script>

<template>
  <div class="proxy-settings">
    <button @click="visible = !visible" class="toggle-btn">
      ⚙️ تنظیمات پروکسی
      <span v-if="saved" class="badge">{{ saved === 'direct' ? 'مستقیم' : saved }}</span>
    </button>

    <div v-if="visible" class="panel">
      <div class="status-line">
        وضعیت فعلی: <strong>{{ currentDesc }}</strong>
      </div>

      <div v-if="loading" class="loading">در حال بارگذاری...</div>

      <div v-else>
        <div class="section-title">پروکسی‌های شناسایی‌شده (تست کنید):</div>

        <div v-for="candidate in candidates" :key="candidate.value" class="candidate-row">
          <button @click="testCandidate(candidate)" class="btn-test">
            {{ candidate.ok === true ? '✓' : candidate.ok === false ? '✗' : 'تست' }}
          </button>

          <span class="candidate-label">
            {{ candidate.label }}
            <span v-if="candidate.ok === true" class="latency">({{ candidate.latency }}ms)</span>
            <span v-else-if="candidate.ok === false && candidate.error" class="err-text">
              ({{ candidate.error }})
            </span>
          </span>

          <button
            @click="save(candidate.value)"
            :disabled="saving"
            class="btn-save"
          >
            ذخیره
          </button>
        </div>

        <div class="section-title">یا آدرس دستی وارد کنید:</div>
        <div class="custom-row">
          <input
            v-model="custom"
            type="text"
            placeholder="socks5://127.0.0.1:10808 یا http://127.0.0.1:10809"
            class="custom-input"
            dir="ltr"
          />
          <button @click="testCustom" class="btn-test">تست</button>
          <button @click="saveCustom" :disabled="saving || !custom.trim()" class="btn-save">
            ذخیره
          </button>
        </div>
      </div>

      <div v-if="message" :class="['message', messageType]">{{ message }}</div>

      <div class="help">
        راهنما: در v2rayN پورت پیش‌فرض socks روی <code>10808</code> و http روی <code>10809</code> است.
        اگر IP محدود شده، در v2rayN کانفیگ دیگری انتخاب کنید و دوباره تست بگیرید.
      </div>
    </div>
  </div>
</template>

<style scoped>
.proxy-settings {
  margin-bottom: 16px;
}

.toggle-btn {
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.badge {
  background: #eff6ff;
  color: #3b82f6;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  direction: ltr;
}

.panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  margin-top: 12px;
}

.status-line {
  font-size: 14px;
  margin-bottom: 16px;
  color: #374151;
}

.section-title {
  font-weight: 600;
  font-size: 14px;
  margin: 12px 0 8px;
  color: #374151;
}

.candidate-row,
.custom-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
}

.candidate-label {
  flex: 1;
  font-size: 13px;
  color: #374151;
}

.latency {
  color: #10b981;
  font-size: 12px;
}

.err-text {
  color: #dc2626;
  font-size: 12px;
}

.btn-test,
.btn-save {
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-save:hover:not(:disabled) {
  background: #f0fdf4;
}

.custom-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
}

.message {
  margin-top: 12px;
  padding: 10px;
  border-radius: 8px;
  font-size: 13px;
}

.message.ok {
  background: #f0fdf4;
  color: #16a34a;
}

.message.err {
  background: #fef2f2;
  color: #dc2626;
}

.help {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.8;
}

.help code {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  direction: ltr;
  display: inline-block;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #6b7280;
  font-size: 13px;
}
</style>
