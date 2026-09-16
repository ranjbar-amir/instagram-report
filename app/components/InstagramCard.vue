<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  account: {
    id: number
    username: string
    full_name: string
    bio: string
    followers: number
    last_post_date: string | null
    profile_pic_url: string
  }
}>()

const emit = defineEmits(['delete', 'snapshot', 'refresh'])

const refreshing = ref(false)

async function handleRefresh() {
  refreshing.value = true
  emit('refresh', props.account.id)
  refreshing.value = false
}

function formatFollowers(count: number): string {
  return count.toLocaleString('fa-IR')
}

function formatDate(date: string | null): string {
  if (!date) return 'نامشخص'
  return new Date(date).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="instagram-card">
    <div class="card-header">
      <img 
        v-if="account.profile_pic_url" 
        :src="account.profile_pic_url" 
        :alt="account.username"
        class="avatar"
      />
      <div v-else class="avatar-placeholder">
        {{ account.username.charAt(0).toUpperCase() }}
      </div>
      
      <div class="user-info">
        <strong>{{ account.full_name || account.username }}</strong>
        <span class="username">@{{ account.username }}</span>
      </div>
    </div>
    
    <div class="card-body">
      <div class="stat">
        <span class="stat-label">فالوور</span>
        <span class="stat-value">{{ formatFollowers(account.followers) }}</span>
      </div>
      
      <div class="stat">
        <span class="stat-label">آخرین پست</span>
        <span class="stat-value small">{{ formatDate(account.last_post_date) }}</span>
      </div>
      
      <div v-if="account.bio" class="bio">
        {{ account.bio }}
      </div>
    </div>
    
    <div class="card-actions">
      <button @click="handleRefresh" :disabled="refreshing" class="action-btn">
        {{ refreshing ? '...' : '🔄 بروزرسانی' }}
      </button>
      <button @click="emit('snapshot', account)" class="action-btn">
        📸 اسنپ‌شات
      </button>
      <button @click="emit('delete', account.id)" class="action-btn danger">
        🗑️ حذف
      </button>
    </div>
  </div>
</template>

<style scoped>
.instagram-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transition: transform 0.2s;
}

.instagram-card:hover {
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #3b82f6;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.username {
  color: #6b7280;
  font-size: 13px;
  direction: ltr;
  text-align: left;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  color: #6b7280;
  font-size: 13px;
}

.stat-value {
  font-weight: 600;
  font-size: 16px;
  direction: ltr;
}

.stat-value.small {
  font-size: 12px;
  font-weight: normal;
}

.bio {
  font-size: 12px;
  color: #4b5563;
  background: #f9fafb;
  padding: 8px;
  border-radius: 6px;
  direction: ltr;
  text-align: left;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.action-btn {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f9fafb;
}

.action-btn.danger {
  color: #dc2626;
  border-color: #fecaca;
}

.action-btn.danger:hover {
  background: #fef2f2;
}
</style>