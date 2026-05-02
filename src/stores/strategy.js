import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useStrategyStore = defineStore('strategy', () => {
  const strategies = ref(JSON.parse(localStorage.getItem('strategies')) || [
    {
      id: 1,
      name: '入口大门移动侦测',
      type: 'motion',
      cameraIds: [1],
      enabled: true,
      sensitivity: 'medium',
      level: 'warning',
      schedule: '全天',
      region: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]]
    },
    {
      id: 2,
      name: '仓库区域入侵检测',
      type: 'intrusion',
      cameraIds: [4],
      enabled: true,
      sensitivity: 'high',
      level: 'danger',
      schedule: '夜间',
      region: [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]]
    },
    {
      id: 3,
      name: '视频丢失告警',
      type: 'offline',
      cameraIds: [1, 2, 3, 4],
      enabled: true,
      sensitivity: 'low',
      level: 'danger',
      schedule: '全天',
      region: null
    },
    {
      id: 4,
      name: '画面遮挡检测',
      type: 'cover',
      cameraIds: [1, 2],
      enabled: false,
      sensitivity: 'medium',
      level: 'warning',
      schedule: '全天',
      region: null
    }
  ])

  const saveToStorage = () => {
    localStorage.setItem('strategies', JSON.stringify(strategies.value))
  }

  const addStrategy = (strategy) => {
    const newId = strategies.value.length > 0 
      ? Math.max(...strategies.value.map(s => s.id)) + 1 
      : 1
    strategies.value.push({
      ...strategy,
      id: newId
    })
    saveToStorage()
  }

  const updateStrategy = (id, updates) => {
    const strategy = strategies.value.find(s => s.id === id)
    if (strategy) {
      Object.assign(strategy, updates)
      saveToStorage()
    }
  }

  const removeStrategy = (id) => {
    strategies.value = strategies.value.filter(s => s.id !== id)
    saveToStorage()
  }

  const toggleStrategy = (id) => {
    const strategy = strategies.value.find(s => s.id === id)
    if (strategy) {
      strategy.enabled = !strategy.enabled
      saveToStorage()
    }
  }

  const enabledCount = computed(() => strategies.value.filter(s => s.enabled).length)
  const totalCount = computed(() => strategies.value.length)

  const strategyTypes = ['motion', 'intrusion', 'offline', 'cover']

  const typeLabels = {
    motion: '移动侦测',
    intrusion: '区域入侵',
    offline: '视频丢失',
    cover: '画面遮挡'
  }

  const sensitivityOptions = [
    { value: 'low', label: '低' },
    { value: 'medium', label: '中' },
    { value: 'high', label: '高' }
  ]

  const levelOptions = [
    { value: 'info', label: '提示' },
    { value: 'warning', label: '警告' },
    { value: 'danger', label: '危险' }
  ]

  const scheduleOptions = [
    { value: '全天', label: '全天' },
    { value: '白天', label: '白天 (8:00-18:00)' },
    { value: '夜间', label: '夜间 (18:00-8:00)' },
    { value: '自定义', label: '自定义' }
  ]

  return {
    strategies,
    addStrategy,
    updateStrategy,
    removeStrategy,
    toggleStrategy,
    enabledCount,
    totalCount,
    strategyTypes,
    typeLabels,
    sensitivityOptions,
    levelOptions,
    scheduleOptions
  }
})
