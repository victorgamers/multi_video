import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAlarmStore = defineStore('alarm', () => {
  const alarms = ref(JSON.parse(localStorage.getItem('alarms')) || [
    {
      id: 1,
      type: 'motion',
      title: '移动侦测告警',
      description: '检测到异常移动行为',
      camera: '入口大门',
      cameraId: 1,
      level: 'warning',
      status: 'pending',
      time: new Date(Date.now() - 5 * 60000).toISOString()
    },
    {
      id: 2,
      type: 'intrusion',
      title: '区域入侵告警',
      description: '检测到未授权人员进入禁区',
      camera: '仓库入口',
      cameraId: 4,
      level: 'danger',
      status: 'pending',
      time: new Date(Date.now() - 15 * 60000).toISOString()
    },
    {
      id: 3,
      type: 'offline',
      title: '视频丢失告警',
      description: '摄像头连接中断',
      camera: '办公大楼',
      cameraId: 3,
      level: 'danger',
      status: 'resolved',
      time: new Date(Date.now() - 30 * 60000).toISOString()
    },
    {
      id: 4,
      type: 'motion',
      title: '移动侦测告警',
      description: '检测到异常移动行为',
      camera: '停车场A区',
      cameraId: 2,
      level: 'info',
      status: 'resolved',
      time: new Date(Date.now() - 60 * 60000).toISOString()
    },
    {
      id: 5,
      type: 'cover',
      title: '画面遮挡告警',
      description: '摄像头被异常遮挡',
      camera: '入口大门',
      cameraId: 1,
      level: 'warning',
      status: 'ignored',
      time: new Date(Date.now() - 120 * 60000).toISOString()
    }
  ])

  const filterOptions = ref({
    type: 'all',
    status: 'all',
    level: 'all'
  })

  const saveToStorage = () => {
    localStorage.setItem('alarms', JSON.stringify(alarms.value))
  }

  const addAlarm = (alarm) => {
    const newId = alarms.value.length > 0 
      ? Math.max(...alarms.value.map(a => a.id)) + 1 
      : 1
    alarms.value.unshift({
      ...alarm,
      id: newId,
      time: new Date().toISOString()
    })
    saveToStorage()
  }

  const handleAlarm = (id, status, note = '') => {
    const alarm = alarms.value.find(a => a.id === id)
    if (alarm) {
      alarm.status = status
      if (note) alarm.note = note
      saveToStorage()
    }
  }

  const filteredAlarms = computed(() => {
    return alarms.value.filter(alarm => {
      if (filterOptions.value.type !== 'all' && alarm.type !== filterOptions.value.type) {
        return false
      }
      if (filterOptions.value.status !== 'all' && alarm.status !== filterOptions.value.status) {
        return false
      }
      if (filterOptions.value.level !== 'all' && alarm.level !== filterOptions.value.level) {
        return false
      }
      return true
    })
  })

  const pendingCount = computed(() => alarms.value.filter(a => a.status === 'pending').length)
  const totalCount = computed(() => alarms.value.length)

  const alarmStats = computed(() => {
    const stats = {
      motion: 0,
      intrusion: 0,
      offline: 0,
      cover: 0
    }
    alarms.value.forEach(a => {
      if (stats[a.type] !== undefined) {
        stats[a.type]++
      }
    })
    return stats
  })

  return {
    alarms,
    filterOptions,
    addAlarm,
    handleAlarm,
    filteredAlarms,
    pendingCount,
    totalCount,
    alarmStats
  }
})
