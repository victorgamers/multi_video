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
    },
    {
      id: 5,
      name: 'YOLOv8目标检测',
      type: 'yolo',
      cameraIds: [1, 2, 3, 4],
      enabled: true,
      yoloModel: 'yolov8',
      yoloClass: 'all',
      confidence: 0.5,
      schedule: '全天',
      region: null
    },
    {
      id: 6,
      name: '人体姿态检测',
      type: 'yolo',
      cameraIds: [1],
      enabled: false,
      yoloModel: 'yolov8_pose',
      yoloClass: 'person',
      confidence: 0.6,
      schedule: '夜间',
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

  const strategyTypes = ['motion', 'intrusion', 'offline', 'cover', 'yolo']

  const typeLabels = {
    motion: '移动侦测',
    intrusion: '区域入侵',
    offline: '视频丢失',
    cover: '画面遮挡',
    yolo: 'AI目标检测'
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

  // YOLO模型列表
  const yoloModels = [
    { value: 'yolov5', label: 'YOLOv5 (目标检测)' },
    { value: 'yolov8', label: 'YOLOv8 (目标检测)' },
    { value: 'yolov8_pose', label: 'YOLOv8-Pose (人体姿态)' },
    { value: 'yolov8_seg', label: 'YOLOv8-Seg (实例分割)' },
    { value: 'yolov9', label: 'YOLOv9 (目标检测)' },
    { value: 'yolov10', label: 'YOLOv10 (目标检测)' },
    { value: 'yolov26', label: 'YOLOv2.6 (目标检测)' }
  ]

  // YOLO检测目标类别
  const yoloClasses = [
    { value: 'person', label: '人' },
    { value: 'vehicle', label: '车辆' },
    { value: 'animal', label: '动物' },
    { value: 'all', label: '检测所有目标' }
  ]

  // 全局AI检测配置
  const globalAISettings = ref(JSON.parse(localStorage.getItem('globalAISettings')) || {
    defaultModel: 'yolov8',
    confidence: 0.5,
    autoRecord: false
  })

  const saveGlobalAISettings = () => {
    localStorage.setItem('globalAISettings', JSON.stringify(globalAISettings.value))
  }

  const updateGlobalAISettings = (updates) => {
    Object.assign(globalAISettings.value, updates)
    saveGlobalAISettings()
  }

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
    scheduleOptions,
    yoloModels,
    yoloClasses,
    globalAISettings,
    updateGlobalAISettings
  }
})
