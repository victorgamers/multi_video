<template>
  <div class="page alarm-page">
    <div class="page-header">
      <h1 class="page-title">预警管理</h1>
      <p class="page-subtitle">查看和处理系统预警信息</p>
    </div>
    
    <!-- 统计卡片 -->
    <div class="alarm-stats">
      <div class="alarm-stat-card" :class="{ active: filterOptions.status === 'all' }" @click="filterOptions.status = 'all'">
        <span class="stat-value">{{ alarmStore.totalCount }}</span>
        <span class="stat-label">全部预警</span>
      </div>
      <div class="alarm-stat-card pending" :class="{ active: filterOptions.status === 'pending' }" @click="filterOptions.status = 'pending'">
        <span class="stat-value">{{ alarmStore.pendingCount }}</span>
        <span class="stat-label">待处理</span>
      </div>
      <div class="alarm-stat-card resolved" :class="{ active: filterOptions.status === 'resolved' }" @click="filterOptions.status = 'resolved'">
        <span class="stat-value">{{ resolvedCount }}</span>
        <span class="stat-label">已处理</span>
      </div>
      <div class="alarm-stat-card ignored" :class="{ active: filterOptions.status === 'ignored' }" @click="filterOptions.status = 'ignored'">
        <span class="stat-value">{{ ignoredCount }}</span>
        <span class="stat-label">已忽略</span>
      </div>
    </div>
    
    <!-- 筛选工具栏 -->
    <div class="filter-toolbar">
      <div class="filter-group">
        <label>预警类型:</label>
        <select v-model="filterOptions.type" class="select filter-select">
          <option value="all">全部</option>
          <option value="motion">移动侦测</option>
          <option value="intrusion">区域入侵</option>
          <option value="offline">视频丢失</option>
          <option value="cover">画面遮挡</option>
        </select>
      </div>
      <div class="filter-group">
        <label>预警级别:</label>
        <select v-model="filterOptions.level" class="select filter-select">
          <option value="all">全部</option>
          <option value="info">提示</option>
          <option value="warning">警告</option>
          <option value="danger">危险</option>
        </select>
      </div>
      <button class="btn btn-secondary btn-sm" @click="resetFilters">重置筛选</button>
    </div>
    
    <!-- 预警列表 -->
    <div class="alarm-list">
      <div 
        v-for="alarm in paginatedAlarms" 
        :key="alarm.id" 
        class="alarm-card"
        :class="[`level-${alarm.level}`, `status-${alarm.status}`]"
      >
        <div class="alarm-main">
          <div class="alarm-icon" :class="`type-${alarm.type}`">
            <svg v-if="alarm.type === 'motion'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <svg v-else-if="alarm.type === 'intrusion'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            <svg v-else-if="alarm.type === 'offline'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="1" y1="1" x2="23" y2="23"/>
              <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
            </svg>
          </div>
          
          <div class="alarm-content">
            <div class="alarm-header">
              <h3 class="alarm-title">{{ alarm.title }}</h3>
              <span class="badge" :class="levelBadge(alarm.level)">{{ levelLabel(alarm.level) }}</span>
              <span class="badge" :class="statusBadge(alarm.status)">{{ statusLabel(alarm.status) }}</span>
            </div>
            <p class="alarm-description">{{ alarm.description }}</p>
            <div class="alarm-meta">
              <span class="meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                {{ alarm.camera }}
              </span>
              <span class="meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                {{ formatTime(alarm.time) }}
              </span>
            </div>
            <div v-if="alarm.note" class="alarm-note">
              <strong>处理备注:</strong> {{ alarm.note }}
            </div>
          </div>
        </div>
        
        <div v-if="alarm.status === 'pending'" class="alarm-actions">
          <button class="btn btn-success btn-sm" @click="handleResolve(alarm.id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            已处理
          </button>
          <button class="btn btn-secondary btn-sm" @click="handleIgnore(alarm.id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            忽略
          </button>
        </div>
        
        <div v-else class="alarm-status-info">
          <span class="status-icon" :class="alarm.status">
            <svg v-if="alarm.status === 'resolved'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </span>
          <span>{{ alarm.status === 'resolved' ? '已处理' : '已忽略' }}</span>
        </div>
      </div>
      
      <div v-if="!filteredAlarms.length" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <h4>暂无预警</h4>
        <p>当前筛选条件下没有预警记录</p>
      </div>
    </div>
    
    <!-- 分页 -->
    <div v-if="totalPages > 1" class="pagination">
      <button @click="currentPage--" :disabled="currentPage <= 1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <button 
        v-for="page in visiblePages" 
        :key="page"
        :class="{ active: page === currentPage }"
        @click="currentPage = page"
      >
        {{ page }}
      </button>
      <button @click="currentPage++" :disabled="currentPage >= totalPages">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useAlarmStore } from '../stores/alarm'

const alarmStore = useAlarmStore()

const currentPage = ref(1)
const pageSize = 10

const filterOptions = reactive({
  type: 'all',
  status: 'all',
  level: 'all'
})

const resolvedCount = computed(() => alarmStore.alarms.filter(a => a.status === 'resolved').length)
const ignoredCount = computed(() => alarmStore.alarms.filter(a => a.status === 'ignored').length)

const filteredAlarms = computed(() => {
  return alarmStore.alarms.filter(alarm => {
    if (filterOptions.type !== 'all' && alarm.type !== filterOptions.type) return false
    if (filterOptions.status !== 'all' && alarm.status !== filterOptions.status) return false
    if (filterOptions.level !== 'all' && alarm.level !== filterOptions.level) return false
    return true
  })
})

const totalPages = computed(() => Math.ceil(filteredAlarms.value.length / pageSize))

const paginatedAlarms = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredAlarms.value.slice(start, start + pageSize)
})

const visiblePages = computed(() => {
  const pages = []
  const maxVisible = 5
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages.value, start + maxVisible - 1)
  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1)
  }
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

const resetFilters = () => {
  filterOptions.type = 'all'
  filterOptions.status = 'all'
  filterOptions.level = 'all'
  currentPage.value = 1
}

const handleResolve = (id) => {
  alarmStore.handleAlarm(id, 'resolved')
}

const handleIgnore = (id) => {
  alarmStore.handleAlarm(id, 'ignored')
}

const levelBadge = (level) => {
  const map = {
    info: 'badge-info',
    warning: 'badge-warning',
    danger: 'badge-danger'
  }
  return map[level] || 'badge-info'
}

const levelLabel = (level) => {
  const map = {
    info: '提示',
    warning: '警告',
    danger: '危险'
  }
  return map[level] || level
}

const statusBadge = (status) => {
  const map = {
    pending: 'badge-warning',
    resolved: 'badge-success',
    ignored: 'badge-info'
  }
  return map[status] || 'badge-info'
}

const statusLabel = (status) => {
  const map = {
    pending: '待处理',
    resolved: '已处理',
    ignored: '已忽略'
  }
  return map[status] || status
}

const formatTime = (time) => {
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  return date.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.alarm-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.alarm-stat-card {
  padding: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.alarm-stat-card:hover {
  border-color: var(--accent-primary);
}

.alarm-stat-card.active {
  border-color: var(--accent-primary);
  background: rgba(59, 130, 246, 0.05);
}

.alarm-stat-card .stat-value {
  display: block;
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 4px;
}

.alarm-stat-card.pending .stat-value { color: var(--warning); }
.alarm-stat-card.resolved .stat-value { color: var(--success); }

.alarm-stat-card .stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.filter-toolbar {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  padding: 12px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-group label {
  font-size: 13px;
  color: var(--text-secondary);
}

.filter-select {
  width: 140px;
  padding: 6px 12px;
  font-size: 13px;
}

.alarm-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.alarm-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  padding: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  border-left: 4px solid var(--border);
  transition: all 0.2s;
}

.alarm-card:hover {
  background: var(--bg-hover);
}

.alarm-card.level-warning { border-left-color: var(--warning); }
.alarm-card.level-danger { border-left-color: var(--danger); }
.alarm-card.level-info { border-left-color: var(--accent-primary); }

.alarm-card.status-resolved { opacity: 0.7; }
.alarm-card.status-ignored { opacity: 0.6; }

.alarm-main {
  display: flex;
  gap: 16px;
  flex: 1;
}

.alarm-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.alarm-icon svg {
  width: 24px;
  height: 24px;
}

.alarm-icon.type-motion {
  background: rgba(59, 130, 246, 0.15);
  color: var(--accent-primary);
}

.alarm-icon.type-intrusion {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
}

.alarm-icon.type-offline {
  background: rgba(245, 158, 11, 0.15);
  color: var(--warning);
}

.alarm-icon.type-cover {
  background: rgba(6, 182, 212, 0.15);
  color: var(--accent-secondary);
}

.alarm-content {
  flex: 1;
  min-width: 0;
}

.alarm-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.alarm-title {
  font-size: 15px;
  font-weight: 600;
}

.alarm-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.alarm-meta {
  display: flex;
  gap: 20px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.alarm-note {
  margin-top: 12px;
  padding: 10px 12px;
  background: var(--bg-secondary);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.alarm-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.alarm-status-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.status-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-icon svg {
  width: 16px;
  height: 16px;
}

.status-icon.resolved {
  background: rgba(16, 185, 129, 0.15);
  color: var(--success);
}

.status-icon.ignored {
  background: rgba(59, 130, 246, 0.15);
  color: var(--accent-primary);
}

@media (max-width: 768px) {
  .alarm-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .alarm-card {
    flex-direction: column;
  }
  
  .alarm-main {
    flex-direction: column;
  }
  
  .alarm-actions {
    flex-direction: row;
    width: 100%;
  }
  
  .alarm-actions .btn {
    flex: 1;
  }
}
</style>
