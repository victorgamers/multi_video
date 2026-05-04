import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 使用相对路径，通过 Vite 代理转发到后端 (避免 CORS)
const API_BASE = ''

export const useUserStore = defineStore('user', () => {
  const users = ref([])
  const currentUser = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // 从后端加载所有用户
  const fetchUsers = async () => {
    loading.value = true
    error.value = null
    try {
      const url = `${API_BASE}/user/`
      console.log('[用户] 请求地址:', url)
      const response = await fetch(url)
      console.log('[用户] 响应状态:', response.status)
      if (!response.ok) throw new Error('获取用户列表失败')
      const data = await response.json()
      // 后端直接返回数组
      users.value = data.map(u => ({
        id: u.id,
        username: u.username,
        name: u.username,
        role: u.role || 'guest',
        status: u.enabled ? 'active' : 'inactive',
        lastLogin: u.last_login,
        avatar: null,
        password: ''
      }))
    } catch (e) {
      console.error('加载用户失败:', e)
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  // 获取单个用户
  const fetchUserById = async (id) => {
    try {
      const url = `${API_BASE}/user/${id}`
      console.log('[用户] 获取单个请求地址:', url)
      const response = await fetch(url)
      if (!response.ok) throw new Error('获取用户失败')
      return await response.json()
    } catch (e) {
      console.error('获取用户失败:', e)
      return null
    }
  }

  // 添加用户
  const addUser = async (user) => {
    try {
      const url = `${API_BASE}/user/`
      console.log('[用户] 添加请求地址:', url)
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          password: user.password,
          role: user.role || 'guest',
          enabled: user.status === 'active'
        })
      })
      console.log('[用户] 添加响应状态:', response.status)
      if (!response.ok) throw new Error('添加用户失败')
      await fetchUsers()
      return { success: true }
    } catch (e) {
      console.error('添加用户失败:', e)
      return { success: false, message: e.message }
    }
  }

  // 删除用户
  const removeUser = async (id) => {
    try {
      const url = `${API_BASE}/user/${id}`
      console.log('[用户] 删除请求地址:', url)
      const response = await fetch(url, {
        method: 'DELETE'
      })
      console.log('[用户] 删除响应状态:', response.status)
      if (!response.ok) throw new Error('删除用户失败')
      users.value = users.value.filter(u => u.id !== id)
      if (currentUser.value && currentUser.value.id === id) {
        logout()
      }
      return { success: true }
    } catch (e) {
      console.error('删除用户失败:', e)
      return { success: false, message: e.message }
    }
  }

  const login = async (username, password) => {
    try {
      const response = await fetch(`/api/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`, {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        currentUser.value = {
          id: data.user.id,
          username: data.user.username,
          name: data.user.username,
          role: data.user.role,
          password: ''
        }
        localStorage.setItem('currentUser', JSON.stringify(currentUser.value))
        return { success: true, message: '登录成功' }
      }
      return { success: false, message: data.error || '登录失败' }
    } catch (e) {
      console.error('登录失败:', e)
      return { success: false, message: '网络错误' }
    }
  }

  const logout = () => {
    currentUser.value = null
    localStorage.removeItem('currentUser')
  }

  const restoreSession = () => {
    const saved = localStorage.getItem('currentUser')
    if (saved) {
      currentUser.value = JSON.parse(saved)
    }
  }

  const isLoggedIn = computed(() => currentUser.value !== null)
  const isAdmin = computed(() => currentUser.value?.role === 'admin')
  const activeUsersCount = computed(() => users.value.filter(u => u.status === 'active').length)

  return {
    users,
    currentUser,
    loading,
    error,
    fetchUsers,
    fetchUserById,
    addUser,
    removeUser,
    login,
    logout,
    restoreSession,
    isLoggedIn,
    isAdmin,
    activeUsersCount
  }
})
