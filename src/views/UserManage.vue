<template>
  <div class="page user-manage">
    <div class="page-header flex justify-between items-center">
      <div>
        <h1 class="page-title">用户管理</h1>
        <p class="page-subtitle">管理系统用户和权限</p>
      </div>
      <button class="btn btn-primary" @click="openAddModal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <line x1="20" y1="8" x2="20" y2="14"/>
          <line x1="23" y1="11" x2="17" y2="11"/>
        </svg>
        添加用户
      </button>
    </div>
    
    <!-- 统计卡片 -->
    <div class="user-stats">
      <div class="stat-item">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ userStore.users.length }}</span>
          <span class="stat-label">总用户数</span>
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-icon success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-value text-success">{{ userStore.activeUsersCount }}</span>
          <span class="stat-label">活跃用户</span>
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-icon warning">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ userStore.users.length - userStore.activeUsersCount }}</span>
          <span class="stat-label">禁用用户</span>
        </div>
      </div>
    </div>
    
    <!-- 用户列表 -->
    <div class="user-grid">
      <div v-for="user in userStore.users" :key="user.id" class="user-card">
        <div class="user-header">
          <div class="user-avatar" :class="`role-${user.role}`">
            {{ user.name.slice(0, 1) }}
          </div>
          <div class="user-info">
            <h3 class="user-name">{{ user.name }}</h3>
            <span class="user-username">@{{ user.username }}</span>
          </div>
          <span class="badge" :class="roleBadge(user.role)">{{ roleLabel(user.role) }}</span>
        </div>
        
        <div class="user-body">
          <div class="user-stat">
            <span class="label">状态</span>
            <span class="value">
              <span class="status-dot" :class="user.status === 'active' ? 'status-online' : 'status-offline'"></span>
              {{ user.status === 'active' ? '启用' : '禁用' }}
            </span>
          </div>
          <div class="user-stat">
            <span class="label">最后登录</span>
            <span class="value">{{ formatTime(user.lastLogin) }}</span>
          </div>
        </div>
        
        <div class="user-footer">
          <button class="btn btn-secondary btn-sm" @click="openEditModal(user)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            编辑
          </button>
          <button 
            class="btn btn-sm" 
            :class="user.status === 'active' ? 'btn-secondary' : 'btn-success'"
            @click="toggleStatus(user)"
          >
            <svg v-if="user.status === 'active'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <circle cx="12" cy="12" r="10"/>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            {{ user.status === 'active' ? '禁用' : '启用' }}
          </button>
          <button 
            class="btn btn-danger btn-sm" 
            @click="handleDelete(user.id)"
            :disabled="user.id === userStore.currentUser?.id"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 添加/编辑用户弹窗 -->
    <FormModal :show="showModal" :title="isEditing ? '编辑用户' : '添加用户'" @close="closeModal">
      <div class="form-group">
        <label class="form-label">用户名 *</label>
        <input v-model="formData.username" type="text" class="input" placeholder="用于登录" :disabled="isEditing" />
      </div>
      <div class="form-group">
        <label class="form-label">{{ isEditing ? '新密码 (留空不修改)' : '密码 *' }}</label>
        <input v-model="formData.password" type="password" class="input" :placeholder="isEditing ? '留空保持原密码' : '请输入密码'" />
      </div>
      <div class="form-group">
        <label class="form-label">姓名 *</label>
        <input v-model="formData.name" type="text" class="input" placeholder="显示名称" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">角色</label>
          <select v-model="formData.role" class="select">
            <option value="admin">管理员</option>
            <option value="operator">操作员</option>
            <option value="viewer">访客</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">状态</label>
          <select v-model="formData.status" class="select">
            <option value="active">启用</option>
            <option value="inactive">禁用</option>
          </select>
        </div>
      </div>
      
      <div class="role-description">
        <h4>角色权限说明</h4>
        <div class="role-item">
          <span class="badge badge-danger">管理员</span>
          <span>全部权限，可管理用户、配置系统</span>
        </div>
        <div class="role-item">
          <span class="badge badge-warning">操作员</span>
          <span>视频查看、预警处理、策略查看</span>
        </div>
        <div class="role-item">
          <span class="badge badge-info">访客</span>
          <span>仅视频查看权限</span>
        </div>
      </div>
      
      <template #footer>
        <button class="btn btn-secondary" @click="closeModal">取消</button>
        <button class="btn btn-primary" @click="handleSave">{{ isEditing ? '保存' : '添加' }}</button>
      </template>
    </FormModal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '../stores/user'
import FormModal from '../components/common/FormModal.vue'

const userStore = useUserStore()

// 挂载时从后端加载用户
onMounted(() => {
  userStore.fetchUsers()
})

const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref(null)

const defaultFormData = {
  username: '',
  password: '',
  name: '',
  role: 'operator',
  status: 'active'
}

const formData = reactive({ ...defaultFormData })

const openAddModal = () => {
  isEditing.value = false
  Object.assign(formData, defaultFormData)
  showModal.value = true
}

const openEditModal = (user) => {
  isEditing.value = true
  editingId.value = user.id
  Object.assign(formData, {
    username: user.username,
    password: '',
    name: user.name,
    role: user.role,
    status: user.status
  })
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  isEditing.value = false
  editingId.value = null
}

const handleSave = () => {
  if (!formData.username.trim() || !formData.name.trim()) return
  if (!isEditing.value && !formData.password.trim()) return
  
  if (isEditing.value) {
    const updates = { name: formData.name, role: formData.role, status: formData.status }
    if (formData.password.trim()) {
      updates.password = formData.password
    }
    userStore.updateUser(editingId.value, updates)
  } else {
    userStore.addUser({
      username: formData.username,
      password: formData.password,
      name: formData.name,
      role: formData.role,
      status: formData.status
    })
  }
  closeModal()
}

const handleDelete = (id) => {
  if (confirm('确定要删除这个用户吗？')) {
    userStore.removeUser(id)
  }
}

const toggleStatus = (user) => {
  userStore.updateUser(user.id, {
    status: user.status === 'active' ? 'inactive' : 'active'
  })
}

const roleBadge = (role) => {
  const map = {
    admin: 'badge-danger',
    operator: 'badge-warning',
    viewer: 'badge-info'
  }
  return map[role] || 'badge-info'
}

const roleLabel = (role) => {
  const map = {
    admin: '管理员',
    operator: '操作员',
    viewer: '访客'
  }
  return map[role] || role
}

const formatTime = (time) => {
  if (!time) return '从未登录'
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (hours < 1) return '刚刚'
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  return date.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.user-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  padding: 20px 24px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.15);
  color: var(--accent-primary);
}

.stat-icon.success {
  background: rgba(16, 185, 129, 0.15);
  color: var(--success);
}

.stat-icon.warning {
  background: rgba(245, 158, 11, 0.15);
  color: var(--warning);
}

.stat-icon svg {
  width: 24px;
  height: 24px;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.user-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.user-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s;
}

.user-card:hover {
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.user-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: white;
  flex-shrink: 0;
}

.user-avatar.role-admin {
  background: linear-gradient(135deg, var(--danger), #dc2626);
}

.user-avatar.role-operator {
  background: linear-gradient(135deg, var(--warning), #d97706);
}

.user-avatar.role-viewer {
  background: linear-gradient(135deg, var(--accent-primary), #2563eb);
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 2px;
}

.user-username {
  font-size: 12px;
  color: var(--text-secondary);
}

.user-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.user-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.user-stat .label {
  color: var(--text-secondary);
}

.user-stat .value {
  display: flex;
  align-items: center;
  gap: 6px;
}

.user-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  background: var(--bg-secondary);
}

.user-footer .btn {
  flex: 1;
}

.user-footer .btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.role-description {
  margin-top: 20px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.role-description h4 {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.role-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.role-item:last-child {
  margin-bottom: 0;
}

@media (max-width: 640px) {
  .user-stats {
    flex-direction: column;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .user-grid {
    grid-template-columns: 1fr;
  }
}
</style>
