import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 使用相对路径，通过 Vite 代理转发到后端 (避免 CORS)
const API_BASE = ''

export const useVideoStore = defineStore('video', () => {
  const sources = ref([])
  const activeLayout = ref('4')
  const loading = ref(false)
  const error = ref(null)

  // 从后端加载所有视频源
  const fetchVideos = async () => {
    loading.value = true
    error.value = null
    try {
      const url = `${API_BASE}/video/sources`
      console.log('[视频源] 请求地址:', url)
      const response = await fetch(url)
      console.log('[视频源] 响应状态:', response.status)
      if (!response.ok) throw new Error('获取视频源失败')
      const data = await response.json()
      sources.value = data.map(v => ({
        id: v.id,
        name: v.name,
        location: v.location || '',
        webrtc_url: v.webrtc_url || '',
        created_at: v.created_at || '',
        status: 'online'
      }))
    } catch (e) {
      console.error('加载视频源失败:', e)
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  // 获取指定视频源
  const fetchVideoById = async (id) => {
    try {
      const url = `${API_BASE}/video/source/${id}`
      console.log('[视频源] 获取单个请求地址:', url)
      const response = await fetch(url)
      if (!response.ok) throw new Error('获取视频源失败')
      return await response.json()
    } catch (e) {
      console.error('获取视频源失败:', e)
      return null
    }
  }

  // 添加视频源
  const addSource = async (source) => {
    try {
      const url = `${API_BASE}/video/source`
      console.log('[视频源] 添加请求地址:', url)
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: source.name,
          location: source.location || '',
          webrtc_url: source.webrtc_url || source.url || ''
        })
      })
      console.log('[视频源] 添加响应状态:', response.status)
      if (!response.ok) throw new Error('添加视频源失败')
      const data = await response.json()
      sources.value.push({
        id: data.video.id,
        name: data.video.name,
        location: data.video.location || '',
        webrtc_url: data.video.webrtc_url || '',
        created_at: data.video.created_at || '',
        status: 'online'
      })
      return { success: true }
    } catch (e) {
      console.error('添加视频源失败:', e)
      return { success: false, message: e.message }
    }
  }

  // 删除视频源
  const removeSource = async (id) => {
    try {
      const url = `${API_BASE}/video/source/${id}`
      console.log('[视频源] 删除请求地址:', url)
      const response = await fetch(url, {
        method: 'DELETE'
      })
      console.log('[视频源] 删除响应状态:', response.status)
      if (!response.ok) throw new Error('删除视频源失败')
      sources.value = sources.value.filter(s => s.id !== id)
      return { success: true }
    } catch (e) {
      console.error('删除视频源失败:', e)
      return { success: false, message: e.message }
    }
  }

  const updateSource = (id, updates) => {
    const source = sources.value.find(s => s.id === id)
    if (source) {
      Object.assign(source, updates)
    }
  }

  const onlineCount = computed(() => sources.value.filter(s => s.status === 'online').length)
  const offlineCount = computed(() => sources.value.filter(s => s.status === 'offline').length)
  const totalCount = computed(() => sources.value.length)

  return {
    sources,
    activeLayout,
    loading,
    error,
    fetchVideos,
    fetchVideoById,
    addSource,
    removeSource,
    updateSource,
    onlineCount,
    offlineCount,
    totalCount
  }
})
