import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// API基础路径
const API_BASE = 'http://192.168.0.101:5000'

export const useStrategyStore = defineStore('strategy', () => {
  // 策略列表
  const strategies = ref([])
  const globalConfig = ref(null)
  const streamConfigs = ref({})
  const strategyRunning = ref(false)
  const loading = ref(false)

  // 获取所有策略
  const fetchStrategies = async () => {
    loading.value = true
    try {
      const response = await fetch(`${API_BASE}/strategy/list`)
      if (response.ok) {
        const data = await response.json()
        strategies.value = data
      }
    } catch (e) {
      console.error('获取策略列表失败:', e)
    } finally {
      loading.value = false
    }
  }

  // 类型到模型名称的映射
  const typeModelMap = {
    1: 'yolov5',      // YOLO5
    2: 'yolov8',      // YOLO8
    3: 'yolov8_pose', // YOLO8POSE
    4: 'yolov8_seg',  // YOLO8SEG
    5: 'yolov26',     // YOLO26
    6: 'ppocr',       // PPOCR
    7: 'nanotrack'    // NANOTRACK
  }

  // 获取全局配置
  const fetchGlobalConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/strategy/global`)
      if (response.ok) {
        const data = await response.json()
        console.log('[策略] 后端返回全局配置:', data)
        // 后端返回数组，streamId=-1 表示全局配置
        if (Array.isArray(data)) {
          const globalItem = data.find(item => item.streamId === -1)
          if (globalItem) {
            const typeNum = Number(globalItem.type)
            console.log('[策略] 原始type:', globalItem.type, '转换后:', typeNum, '映射结果:', typeModelMap[typeNum])
            globalConfig.value = {
              yoloModel: typeModelMap[typeNum] || 'yolov8',
              yoloClass: globalItem.selectIds || [],
              confidence: globalItem.objectThreshold || 0.5
            }
          } else {
            globalConfig.value = null
          }
        } else if (data && (data.streamId === 0 || data.streamId === -1)) {
          const typeNum = Number(data.type)
          globalConfig.value = {
            yoloModel: typeModelMap[typeNum] || 'yolov8',
            yoloClass: data.selectIds || [],
            confidence: data.objectThreshold || 0.5
          }
        } else {
          globalConfig.value = null
        }
      }
    } catch (e) {
      console.error('获取全局配置失败:', e)
    }
  }

  // 获取流配置
  const fetchStreamConfigs = async () => {
    try {
      const response = await fetch(`${API_BASE}/strategy/stream`)
      if (response.ok) {
        const data = await response.json()
        // 转换后端格式到前端格式
        const configs = {}
        if (Array.isArray(data)) {
          for (const item of data) {
            // streamId >= 1 表示具体视频流配置
            if (item.streamId >= 1) {
              const typeNum = Number(item.type)
              configs[item.streamId] = {
                yoloModel: typeModelMap[typeNum] || 'yolov8',
                yoloClass: item.selectIds || [],
                confidence: item.objectThreshold || 0.5
              }
            }
          }
        }
        streamConfigs.value = configs
      }
    } catch (e) {
      console.error('获取流配置失败:', e)
    }
  }

  // 模型类型映射
  const modelTypeMap = {
    'yolov5': 1,      // YOLO5
    'yolov8': 2,      // YOLO8
    'yolov8_pose': 3, // YOLO8POSE
    'yolov8_seg': 4,  // YOLO8SEG
    'yolov26': 5,     // YOLO26
    'ppocr': 6,       // PPOCR
    'nanotrack': 7    // NANOTRACK
  }

  // 添加策略
  const addStrategyAPI = async (strategy) => {
    try {
      // 转换数据格式以匹配后端 ModelStrategy
      const data = {
        id: strategy.id || 0,
        streamId: strategy.sourceId === 'global' ? 0 : parseInt(strategy.sourceId),
        type: modelTypeMap[strategy.yoloModel] || 2,  // 默认为 YOLO8
        selectIds: strategy.yoloClass || [],
        objectThreshold: strategy.confidence || 0.5
      }
      
      const response = await fetch(`${API_BASE}/strategy/addStrategy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (response.ok) {
        await fetchStrategies()
        return { success: true }
      }
      return { success: false, message: '添加策略失败' }
    } catch (e) {
      console.error('添加策略失败:', e)
      return { success: false, message: e.message }
    }
  }

  // 启动策略
  const startStrategyAPI = async () => {
    try {
      const response = await fetch(`${API_BASE}/strategy/startStrategy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (response.ok) {
        strategyRunning.value = true
        return { success: true }
      }
      return { success: false, message: '启动策略失败' }
    } catch (e) {
      console.error('启动策略失败:', e)
      return { success: false, message: e.message }
    }
  }

  // 修改策略
  const changeStrategy = async (id, updates) => {
    try {
      const response = await fetch(`${API_BASE}/strategy/changeStrategy/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (response.ok) {
        await fetchStrategies()
        return { success: true }
      }
      return { success: false, message: '修改策略失败' }
    } catch (e) {
      console.error('修改策略失败:', e)
      return { success: false, message: e.message }
    }
  }

  // 删除策略
  const deleteStrategy = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/strategy/deleteStrategy/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      if (response.ok) {
        await fetchStrategies()
        return { success: true }
      }
      return { success: false, message: '删除策略失败' }
    } catch (e) {
      console.error('删除策略失败:', e)
      return { success: false, message: e.message }
    }
  }

  // 保存全局配置
  const saveGlobalConfig = async (config) => {
    try {
      const response = await fetch(`${API_BASE}/strategy/global`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      if (response.ok) {
        globalConfig.value = config
        return { success: true }
      }
      return { success: false, message: '保存全局配置失败' }
    } catch (e) {
      console.error('保存全局配置失败:', e)
      return { success: false, message: e.message }
    }
  }

  // 保存流配置
  const saveStreamConfig = async (sourceId, config) => {
    try {
      const response = await fetch(`${API_BASE}/strategy/stream/${sourceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      if (response.ok) {
        streamConfigs.value[sourceId] = config
        return { success: true }
      }
      return { success: false, message: '保存流配置失败' }
    } catch (e) {
      console.error('保存流配置失败:', e)
      return { success: false, message: e.message }
    }
  }

  // 保存所有流配置
  const saveAllStreamConfigs = async (configs) => {
    try {
      const response = await fetch(`${API_BASE}/strategy/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configs)
      })
      if (response.ok) {
        streamConfigs.value = configs
        return { success: true }
      }
      return { success: false, message: '保存流配置失败' }
    } catch (e) {
      console.error('保存流配置失败:', e)
      return { success: false, message: e.message }
    }
  }

  // 初始化数据
  const initData = async () => {
    await Promise.all([
      fetchStrategies(),
      fetchGlobalConfig(),
      fetchStreamConfigs()
    ])
  }

  // ============ 保留旧版本地存储相关（兼容） ============
  const localStrategies = ref(JSON.parse(localStorage.getItem('strategies')) || [
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
    localStorage.setItem('strategies', JSON.stringify(localStrategies.value))
  }

  const addLocalStrategy = (strategy) => {
    const newId = localStrategies.value.length > 0
      ? Math.max(...localStrategies.value.map(s => s.id)) + 1
      : 1
    localStrategies.value.push({
      ...strategy,
      id: newId
    })
    saveToStorage()
  }

  const updateStrategy = (id, updates) => {
    const strategy = localStrategies.value.find(s => s.id === id)
    if (strategy) {
      Object.assign(strategy, updates)
      saveToStorage()
    }
  }

  const removeStrategy = (id) => {
    localStrategies.value = localStrategies.value.filter(s => s.id !== id)
    saveToStorage()
  }

  const toggleStrategy = (id) => {
    const strategy = localStrategies.value.find(s => s.id === id)
    if (strategy) {
      strategy.enabled = !strategy.enabled
      saveToStorage()
    }
  }

  const enabledCount = computed(() => localStrategies.value.filter(s => s.enabled).length)
  const totalCount = computed(() => localStrategies.value.length)

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

  // 模型列表
  const yoloModels = [
    { value: 'yolov5', label: 'YOLOv5' },
    { value: 'yolov8', label: 'YOLOv8' },
    { value: 'yolov8_pose', label: 'YOLOv8-Pose' },
    { value: 'yolov8_seg', label: 'YOLOv8-Seg' },
    { value: 'yolov26', label: 'YOLOv2.6' },
    { value: 'ppocr', label: 'PPOCR' },
    { value: 'nanotrack', label: 'NanoTrack' }
  ]

  // YOLO检测目标类别 (COCO 80类)
  const yoloClasses = [
    { idx: 0, label: 'person' },
    { idx: 1, label: 'bicycle' },
    { idx: 2, label: 'car' },
    { idx: 3, label: 'motorcycle' },
    { idx: 4, label: 'airplane' },
    { idx: 5, label: 'bus' },
    { idx: 6, label: 'train' },
    { idx: 7, label: 'truck' },
    { idx: 8, label: 'boat' },
    { idx: 9, label: 'traffic light' },
    { idx: 10, label: 'fire hydrant' },
    { idx: 11, label: 'stop sign' },
    { idx: 12, label: 'parking meter' },
    { idx: 13, label: 'bench' },
    { idx: 14, label: 'bird' },
    { idx: 15, label: 'cat' },
    { idx: 16, label: 'dog' },
    { idx: 17, label: 'horse' },
    { idx: 18, label: 'sheep' },
    { idx: 19, label: 'cow' },
    { idx: 20, label: 'elephant' },
    { idx: 21, label: 'bear' },
    { idx: 22, label: 'zebra' },
    { idx: 23, label: 'giraffe' },
    { idx: 24, label: 'backpack' },
    { idx: 25, label: 'umbrella' },
    { idx: 26, label: 'handbag' },
    { idx: 27, label: 'tie' },
    { idx: 28, label: 'suitcase' },
    { idx: 29, label: 'frisbee' },
    { idx: 30, label: 'skis' },
    { idx: 31, label: 'snowboard' },
    { idx: 32, label: 'sports ball' },
    { idx: 33, label: 'kite' },
    { idx: 34, label: 'baseball bat' },
    { idx: 35, label: 'baseball glove' },
    { idx: 36, label: 'skateboard' },
    { idx: 37, label: 'surfboard' },
    { idx: 38, label: 'tennis racket' },
    { idx: 39, label: 'bottle' },
    { idx: 40, label: 'wine glass' },
    { idx: 41, label: 'cup' },
    { idx: 42, label: 'fork' },
    { idx: 43, label: 'knife' },
    { idx: 44, label: 'spoon' },
    { idx: 45, label: 'bowl' },
    { idx: 46, label: 'banana' },
    { idx: 47, label: 'apple' },
    { idx: 48, label: 'sandwich' },
    { idx: 49, label: 'orange' },
    { idx: 50, label: 'broccoli' },
    { idx: 51, label: 'carrot' },
    { idx: 52, label: 'hot dog' },
    { idx: 53, label: 'pizza' },
    { idx: 54, label: 'donut' },
    { idx: 55, label: 'cake' },
    { idx: 56, label: 'chair' },
    { idx: 57, label: 'couch' },
    { idx: 58, label: 'potted plant' },
    { idx: 59, label: 'bed' },
    { idx: 60, label: 'dining table' },
    { idx: 61, label: 'toilet' },
    { idx: 62, label: 'tv' },
    { idx: 63, label: 'laptop' },
    { idx: 64, label: 'mouse' },
    { idx: 65, label: 'remote' },
    { idx: 66, label: 'keyboard' },
    { idx: 67, label: 'cell phone' },
    { idx: 68, label: 'microwave' },
    { idx: 69, label: 'oven' },
    { idx: 70, label: 'toaster' },
    { idx: 71, label: 'sink' },
    { idx: 72, label: 'refrigerator' },
    { idx: 73, label: 'book' },
    { idx: 74, label: 'clock' },
    { idx: 75, label: 'vase' },
    { idx: 76, label: 'scissors' },
    { idx: 77, label: 'teddy bear' },
    { idx: 78, label: 'hair drier' },
    { idx: 79, label: 'toothbrush' }
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
    // API相关状态
    strategies,
    globalConfig,
    streamConfigs,
    strategyRunning,
    loading,
    // 类型映射
    typeModelMap,
    modelTypeMap,
    // API方法
    fetchStrategies,
    fetchGlobalConfig,
    fetchStreamConfigs,
    addStrategyAPI,
    startStrategyAPI,
    changeStrategy,
    deleteStrategy,
    saveGlobalConfig,
    saveStreamConfig,
    saveAllStreamConfigs,
    initData,
    // 本地存储相关（兼容）
    globalAISettings,
    updateGlobalAISettings,
    localStrategies,
    addLocalStrategy,
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
    yoloClasses
  }
})
