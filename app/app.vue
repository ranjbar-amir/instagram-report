<script setup lang="ts">
import { onMounted } from 'vue'

const { user, loadUser, logout, can } = useAuth()

onMounted(async () => {
  await loadUser()
})
</script>

<template>
  <div>
    <nav class="navbar">
      <div class="nav-links">
        <NuxtLink v-if="can('user.list') || can('user.edit')" to="/users">کاربران</NuxtLink>
        <NuxtLink v-if="can('user.permissions')" to="/permissions">دسترسی‌ها</NuxtLink>
        <NuxtLink to="/management">مدیریت پیج‌ها</NuxtLink>
        <NuxtLink to="/report">گزارش</NuxtLink>
        <NuxtLink v-if="can('snapshot.report')" to="/snapshots">اسنپ‌شات‌ها</NuxtLink>
      </div>

      <div v-if="user" class="user-box">
        <NuxtLink to="/change-password" class="user-name">
          {{ user.fullname || user.username }}
        </NuxtLink>
        <button class="btn-logout" @click="logout">خروج</button>
      </div>
    </nav>
    <NuxtPage />
  </div>
</template>

<style>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: #1e293b;
  direction: rtl;
}

.nav-links {
  display: flex;
  gap: 16px;
}

.nav-links a {
  color: #e2e8f0;
  text-decoration: none;
  font-size: 14px;
  padding: 6px 10px;
  border-radius: 6px;
}

.nav-links a:hover,
.nav-links a.router-link-active {
  background: #334155;
}

.user-box {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-name {
  color: #e2e8f0;
  font-size: 13px;
  text-decoration: none;
}

.user-name:hover { text-decoration: underline; }

.btn-logout {
  padding: 5px 14px;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
</style>