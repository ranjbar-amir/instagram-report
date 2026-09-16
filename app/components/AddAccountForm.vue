<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits(['added'])

const username = ref('')
const loading = ref(false)
const validating = ref(false)
const error = ref('')
const previewData = ref<any>(null)

const { validateProfile, } = useInstagram()
const { addAccount } = useDatabase()

async function handleValidate() {
  if (!username.value.trim()) {
    error.value = 'نام کاربری را وارد کنید'
    return
  }
  
  validating.value = true
  error.value = ''
  previewData.value = null
  
  try {
    const result: any = await validateProfile(username.value.trim())
    
    if (result.success) {
      previewData.value = result.data
    } else {
      error.value = result.error || 'پیج یافت نشد'
    }
  } catch (e: any) {
    error.value = e.data?.message || 'خطا در بررسی پیج'
  } finally {
    validating.value = false
  }
}

async function handleAdd() {
  if (!previewData.value) {
    error.value = 'ابتدا اطلاعات پیج را دریافت کنید'
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    await addAccount(username.value.trim())
    emit('added')
    
    // ریست فرم
    username.value = ''
    previewData.value = null
  } catch (e: any) {
    error.value = e.data?.message || 'خطا در افزودن پیج'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="add-account-form">
    <h3>افزودن پیج جدید</h3>
    
    <div class="input-group">
      <input
        v-model="username"
        type="text"
        placeholder="نام کاربری اینستاگرام (مثلاً: @username)"
        class="input"
        @keyup.enter="handleValidate"
      />
      <button 
        @click="handleValidate" 
        :disabled="validating"
        class="btn btn-secondary"
      >
        {{ validating ? 'در حال بررسی...' : 'بررسی پیج' }}
      </button>
    </div>
    
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    
    <div v-if="previewData" class="preview-card">
      <div class="preview-header">
        <img 
          v-if="previewData.profile_pic_url" 
          :src="previewData.profile_pic_url" 
          alt="پروفایل"
          class="preview-avatar"
        />
        <div class="preview-info">
          <strong>{{ previewData.full_name || previewData.username }}</strong>
          <span>@{{ previewData.username }}</span>
        </div>
      </div>
      
      <div class="preview-details">
        <div class="detail-row">
          <span>تعداد فالوور:</span>
          <strong>{{ previewData.followers?.toLocaleString() || '0' }}</strong>
        </div>
        <div class="detail-row">
          <span>بیو:</span>
          <p>{{ previewData.bio || 'ندارد' }}</p>
        </div>
        <div class="detail-row">
          <span>آخرین پست:</span>
          <span>{{ previewData.last_post_date ? new Date(previewData.last_post_date).toLocaleDateString('fa-IR') : 'نامشخص' }}</span>
        </div>
      </div>
      
      <button 
        @click="handleAdd" 
        :disabled="loading"
        class="btn btn-primary"
      >
        {{ loading ? 'در حال افزودن...' : 'افزودن به لیست' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.add-account-form {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.input-group {
  display: flex;
  gap: 8px;
  margin: 16px 0;
}

.input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  direction: ltr;
  text-align: left;
}

.error-message {
  color: #dc2626;
  background: #fef2f2;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}

.preview-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.preview-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
}

.preview-info {
  display: flex;
  flex-direction: column;
}

.preview-info span {
  color: #6b7280;
  font-size: 14px;
}

.preview-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.detail-row p {
  margin: 0;
  max-width: 60%;
  text-align: left;
  direction: ltr;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: #fff;
  width: 100%;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}
</style>