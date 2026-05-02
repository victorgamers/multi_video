import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const users = ref(JSON.parse(localStorage.getItem('users')) || [
    {
      id: 1,
      username: 'admin',
      password: 'admin123',
      name: '系统管理员',
      role: 'admin',
      status: 'active',
      lastLogin: new Date(Date.now() - 2 * 3600000).toISOString(),
      avatar: null
    },
    {
      id: 2,
      username: 'operator1',
      password: 'pass123',
      name: '张伟',
      role: 'operator',
      status: 'active',
      lastLogin: new Date(Date.now() - 24 * 3600000).toISOString(),
      avatar: null
    },
    {
      id: 3,
      username: 'viewer1',
      password: 'view123',
      name: '李明',
      role: 'viewer',
      status: 'active',
      lastLogin: new Date(Date.now() - 48 * 3600000).toISOString(),
      avatar: null
    },
    {
      id: 4,
      username: 'operator2',
      password: 'pass123',
      name: '王芳',
      role: 'operator',
      status: 'inactive',
      lastLogin: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
      avatar: null
    }
  ])

  const currentUser = ref(JSON.parse(localStorage.getItem('currentUser')) || null)

  const saveToStorage = () => {
    localStorage.setItem('users', JSON.stringify(users.value))
    if (currentUser.value) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser.value))
    } else {
      localStorage.removeItem('currentUser')
    }
  }

  const login = (username, password) => {
    const user = users.value.find(u => u.username === username && u.password === password)
    if (user) {
      if (user.status === 'inactive') {
        return { success: false, message: '账号已被禁用' }
      }
      user.lastLogin = new Date().toISOString()
      currentUser.value = { ...user }
      saveToStorage()
      return { success: true, message: '登录成功' }
    }
    return { success: false, message: '用户名或密码错误' }
  }

  const logout = () => {
    currentUser.value = null
    saveToStorage()
  }

  const addUser = (user) => {
    const newId = users.value.length > 0 
      ? Math.max(...users.value.map(u => u.id)) + 1 
      : 1
    users.value.push({
      ...user,
      id: newId,
      status: 'active',
      lastLogin: null,
      avatar: null
    })
    saveToStorage()
  }

  const updateUser = (id, updates) => {
    const user = users.value.find(u => u.id === id)
    if (user) {
      Object.assign(user, updates)
      if (currentUser.value && currentUser.value.id === id) {
        Object.assign(currentUser.value, updates)
      }
      saveToStorage()
    }
  }

  const removeUser = (id) => {
    users.value = users.value.filter(u => u.id !== id)
    if (currentUser.value && currentUser.value.id === id) {
      logout()
    }
    saveToStorage()
  }

  const isLoggedIn = computed(() => currentUser.value !== null)

  const isAdmin = computed(() => currentUser.value?.role === 'admin')

  const activeUsersCount = computed(() => users.value.filter(u => u.status === 'active').length)

  return {
    users,
    currentUser,
    login,
    logout,
    addUser,
    updateUser,
    removeUser,
    isLoggedIn,
    isAdmin,
    activeUsersCount
  }
})
