import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useVideoStore = defineStore('video', () => {
  const sources = ref(JSON.parse(localStorage.getItem('videoSources')) || [
    {
      id: 1,
      name: '入口大门',
      url: 'webrtc://192.168.1.10/live/stream1',
      status: 'online',
      resolution: '1080p',
      fps: 30,
      type: 'webrtc'
    },
    {
      id: 2,
      name: '停车场A区',
      url: 'webrtc://192.168.1.11/live/stream2',
      status: 'online',
      resolution: '1080p',
      fps: 25,
      type: 'webrtc'
    },
    {
      id: 3,
      name: '办公大楼',
      url: 'webrtc://192.168.1.12/live/stream3',
      status: 'offline',
      resolution: '720p',
      fps: 20,
      type: 'webrtc'
    },
    {
      id: 4,
      name: '仓库入口',
      url: 'webrtc://192.168.1.13/live/stream4',
      status: 'online',
      resolution: '1080p',
      fps: 30,
      type: 'webrtc'
    }
  ])

  const activeLayout = ref('4')

  const saveToStorage = () => {
    localStorage.setItem('videoSources', JSON.stringify(sources.value))
  }

  const addSource = (source) => {
    const newId = sources.value.length > 0 
      ? Math.max(...sources.value.map(s => s.id)) + 1 
      : 1
    sources.value.push({
      ...source,
      id: newId,
      status: 'connecting'
    })
    saveToStorage()
    
    // 模拟连接
    setTimeout(() => {
      const target = sources.value.find(s => s.id === newId)
      if (target) {
        target.status = 'online'
        saveToStorage()
      }
    }, 2000)
  }

  const removeSource = (id) => {
    sources.value = sources.value.filter(s => s.id !== id)
    saveToStorage()
  }

  const updateSource = (id, updates) => {
    const source = sources.value.find(s => s.id === id)
    if (source) {
      Object.assign(source, updates)
      saveToStorage()
    }
  }

  const onlineCount = computed(() => sources.value.filter(s => s.status === 'online').length)
  const offlineCount = computed(() => sources.value.filter(s => s.status === 'offline').length)
  const totalCount = computed(() => sources.value.length)

  return {
    sources,
    activeLayout,
    addSource,
    removeSource,
    updateSource,
    onlineCount,
    offlineCount,
    totalCount
  }
})
