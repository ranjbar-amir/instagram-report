<script setup lang="ts">
import { ref, onMounted } from 'vue'

const { can, loadUser } = useAuth()

const users = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const message = ref('')

// فرم ایجاد کاربر
const showCreate = ref(false)
const newUsername = ref('')
const newFullname = ref('')
const newPassword = ref('')
const newActive = ref(true)
const creating = ref(false)

// ویرایش کاربر
const editingId = ref<number | null>(null)
const editFullname = ref('')
const editActive = ref(true)
const editNewPassword = ref('')
const savingEdit = ref(false)

async function loadUsers() {
  loading.value = true
  error.value = ''
  try {
    const res: any = await $fetch('/api/users')
    users.value = res.data || []
  } catch (e: any) {
    error.value = e?.data?.message || 'خطا در دریافت کاربران'
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  error.value = ''
  message.value = ''
  if (!newUsername.value || !newPassword.value) {
    error.value = 'نام کاربری و رمز عبور الزامی است'
    return
  }
  if (newPassword.value.length < 6) {
    error.value = 'رمز عبور باید حداقل ۶ کاراکتر باشد'
    return
  }

  creating.value = true
  try {
    await $fetch('/api/users', {
      method: 'POST',
      body: {
        username: newUsername.value.trim(),
        password: newPassword.value,
        fullname: newFullname.value,
        userIsActive: newActive.value
      }
    })
    message.value = 'کاربر ایجاد شد'
    newUsername.value = ''
    newFullname.value = ''
    newPassword.value = ''
    newActive.value = true
    showCreate.value = false
    await loadUsers()
  } catch (e: any) {
    error.value = e?.data?.message || 'خطا در ایجاد کاربر'
  } finally {
    creating.value = false
  }
}

function startEdit(u: any) {
  editingId.value = u.id
  editFullname.value = u.fullname || ''
  editActive.value = !!u.userIsActive
  editNewPassword.value = ''
}

function cancelEdit() {
  editingId.value = null
  editNewPassword.value = ''
}

async function handleSaveEdit(u: any) {
  error.value = ''
  message.value = ''
  if (editNewPassword.value && editNewPassword.value.length < 6) {
    error.value = 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد'
    return
  }

  savingEdit.value = true
  try {
    const body: any = { fullname: editFullname.value, userIsActive: editActive.value }
    if (editNewPassword.value) body.newPassword = editNewPassword.value

    await $fetch(`/api/users/${u.id}`, { method: 'PUT', body })
    message.value = 'کاربر بروزرسانی شد'
    cancelEdit()
    await loadUsers()
  } catch (e: any) {
    error.value = e?.data?.message || 'خطا در ویرایش کاربر'
  } finally {
    savingEdit.value = false
  }
}

async function handleDelete(u: any) {
  if (!confirm(`کاربر «${u.username}» حذف شود؟ (قابل بازیابی)`)) return
  error.value = ''
  message.value = ''
  try {
    await $fetch(`/api/users/${u.id}`, { method: 'DELETE' })
    message.value = 'کاربر حذف شد'
    await loadUsers()
  } catch (e: any) {
    error.value = e?.data?.message || 'خطا در حذف کاربر'
  }
}

async function handleRestore(u: any) {
  error.value = ''
  message.value = ''
  try {
    await $fetch(`/api/users/${u.id}/restore`, { method: 'POST' })
    message.value = 'کاربر بازیابی شد'
    await loadUsers()
  } catch (e: any) {
    error.value = e?.data?.message || 'خطا در بازیابی کاربر'
  }
}

async function handlePurge(u: any) {
  if (!confirm(`کاربر «${u.username}» به صورت دائمی حذف شود؟ این عمل برگشت‌پذیر نیست!`)) return
  error.value = ''
  message.value = ''
  try {
    await $fetch(`/api/users/${u.id}/purge`, { method: 'DELETE' })
    message.value = 'کاربر دائمی حذف شد'
    await loadUsers()
  } catch (e: any) {
    error.value = e?.data?.message || 'خطا در حذف دائمی'
  }
}

onMounted(async () => {
  await loadUser()
  await loadUsers()
})
</script>

<template>
  <div class="users-page">
    <div class="header-row">
      <h1>مدیریت کاربران</h1>
      <button v-if="can('user.create')" class="btn-primary" @click="showCreate = !showCreate">
        {{ showCreate ? 'بستن فرم' : '+ کاربر جدید' }}
      </button>
    </div>

    <div v-if="error" class="banner err">{{ error }}</div>
    <div v-if="message" class="banner ok">{{ message }}</div>

    <div v-if="showCreate && can('user.create')" class="card">
      <h2>ایجاد کاربر جدید</h2>
      <div class="form-grid">
        <div class="field">
          <label>نام کاربری</label>
          <input v-model="newUsername" dir="ltr" class="ltr-input" />
        </div>
        <div class="field">
          <label>نام و نام خانوادگی</label>
          <input v-model="newFullname" />
        </div>
        <div class="field">
          <label>رمز عبور (حداقل ۶ کاراکتر)</label>
          <input v-model="newPassword" type="password" />
        </div>
        <div class="field checkbox">
          <label><input v-model="newActive" type="checkbox" /> فعال</label>
        </div>
      </div>
      <button class="btn-primary" :disabled="creating" @click="handleCreate">
        {{ creating ? 'در حال ایجاد...' : 'ایجاد کاربر' }}
      </button>
    </div>

    <div v-if="loading" class="loading">در حال بارگذاری...</div>

    <div v-else-if="users.length === 0" class="empty">کاربری وجود ندارد</div>

    <div v-else class="table-container">
      <table class="users-table">
        <thead>
          <tr>
            <th>#</th>
            <th>نام کاربری</th>
            <th>نام کامل</th>
            <th>وضعیت</th>
            <th>حذف شده</th>
            <th>تاریخ ایجاد</th>
            <th>عملیات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(u, i) in users" :key="u.id" :class="{ deleted: u.isDeleted }">
            <td>{{ i + 1 }}</td>
            <td class="ltr">@{{ u.username }}</td>

            <td v-if="editingId === u.id">
              <input v-model="editFullname" />
            </td>
            <td v-else>{{ u.fullname || '-' }}</td>

            <td v-if="editingId === u.id">
              <label><input v-model="editActive" type="checkbox" /> فعال</label>
            </td>
            <td v-else>
              <span :class="u.userIsActive ? 'badge ok' : 'badge off'">
                {{ u.userIsActive ? 'فعال' : 'غیرفعال' }}
              </span>
            </td>

            <td>{{ u.isDeleted ? 'بله' : 'خیر' }}</td>
            <td>{{ u.created_at ? new Date(u.created_at).toLocaleDateString('fa-IR') : '-' }}</td>

            <td class="actions-cell">
              <template v-if="editingId === u.id">
                <button class="btn-sm primary" :disabled="savingEdit" @click="handleSaveEdit(u)">ذخیره</button>
                <button class="btn-sm" @click="cancelEdit">انصراف</button>
              </template>
              <template v-else>
                <button v-if="can('user.edit')" class="btn-sm" @click="startEdit(u)">ویرایش / ریست رمز</button>
                <NuxtLink v-if="can('user.permissions')" :to="`/permissions?userId=${u.id}`" class="btn-sm link">
                  دسترسی‌ها
                </NuxtLink>
                <button v-if="can('user.delete') && !u.isDeleted" class="btn-sm danger" @click="handleDelete(u)">حذف</button>
                <button v-if="can('user.edit') && u.isDeleted" class="btn-sm" @click="handleRestore(u)">بازیابی</button>
                <button v-if="can('user.purge') && u.isDeleted" class="btn-sm danger" @click="handlePurge(u)">حذف دائمی</button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.users-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
  direction: rtl;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.card h2 {
  font-size: 16px;
  margin-bottom: 14px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}

.field label {
  display: block;
  font-size: 13px;
  margin-bottom: 5px;
  color: #334155;
}

.field input {
  width: 100%;
  box-sizing: border-box;
  padding: 9px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
}

.ltr-input { text-align: left; }

.btn-primary {
  padding: 9px 18px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary:disabled { opacity: 0.6; }

.banner {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 14px;
}

.banner.err { background: #fef2f2; color: #b91c1c; }
.banner.ok { background: #f0fdf4; color: #15803d; }

.table-container {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: auto;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.users-table th, .users-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #f1f5f9;
  text-align: right;
}

.users-table th {
  background: #f8fafc;
  font-size: 13px;
  color: #475569;
}

tr.deleted { opacity: 0.55; background: #fef2f2; }

.badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
}

.badge.ok { background: #dcfce7; color: #15803d; }
.badge.off { background: #fee2e2; color: #b91c1c; }

.actions-cell { white-space: nowrap; }

.btn-sm {
  padding: 5px 10px;
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  margin-left: 4px;
}

.btn-sm.primary { background: #3b82f6; color: #fff; border-color: #3b82f6; }
.btn-sm.danger { background: #fef2f2; color: #b91c1c; border-color: #fca5a5; }
.btn-sm.link { text-decoration: none; color: #3b82f6; display: inline-block; }

.loading, .empty {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}
</style>
