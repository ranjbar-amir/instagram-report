<script setup lang="ts">
const router = useRouter()

onMounted(() => {
  router.push('/report')
})
</script>

<template>
  <div class="loading">
    در حال بارگذاری...
  </div>
</template>

<style scoped>
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-size: 18px;
  color: #6b7280;
}
</style>