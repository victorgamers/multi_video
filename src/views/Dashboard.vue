<template>
  <div class="page dashboard">
    <div class="page-header">
      <h1 class="page-title">系统概览</h1>
      <p class="page-subtitle">实时监控系统运行状态和数据统计</p>
    </div>
    
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <StatCard :value="videoStore.onlineCount" label="在线摄像头" color="success">
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </template>
      </StatCard>
      
      <StatCard :value="videoStore.offlineCount" label="离线摄像头" color="danger">
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          </svg>
        </template>
      </StatCard>
      
      <StatCard :value="alarmStore.pendingCount" label="待处理预警" color="warning">
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </template>
      </StatCard>
      
      <StatCard :value="strategyStore.enabledCount" label="启用的策略" color="primary">
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </template>
      </StatCard>
    </div>
    
    <div class="dashboard-grid">
      <!-- 视频源预览 -->
      <div class="card preview-card">
        <div class="card-header">
          <h3>视频预览</h3>
          <router-link to="/video" class="view-all">查看全部</router-link>
        </div>
        <div class="preview-grid">
          <div v-for="source in previewSources" :key="source.id" class="preview-item">
            <div class="preview-thumbnail" :class="`status-${source.status}`">
              <div class="preview-gradient" :style="{ background: gradients[source.id % 4] }"></div>
              <div class="preview-scan"></div>
              <div class="preview-overlay">
                <span class="preview-name">{{ source.name }}</span>
                <span class="status-dot" :class="`status-${source.status}`"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 系统资源 -->
      <div class="card system-card">
        <div class="card-header">
          <h3>RK3588 系统状态</h3>
        </div>
        
        <!-- CPU 核心 -->
        <div class="system-stat">
          <div class="system-stat-header">
            <span>CPU 核心</span>
          </div>
          <div class="core-grid">
            <div v-for="(usage, index) in rk3588Stats.cpu" :key="'cpu-' + index" class="core-item">
              <span class="core-label">CPU{{ index }}</span>
              <div class="mini-progress">
                <div class="mini-progress-fill" :style="{ 
                  width: usage + '%',
                  background: getCoreColor(usage)
                }"></div>
              </div>
              <span class="core-value" :style="{ color: getCoreColor(usage) }">{{ usage.toFixed(1) }}%</span>
            </div>
          </div>
        </div>
        
        <!-- NPU 核心 -->
        <div class="system-stat">
          <div class="system-stat-header">
            <span>NPU 核心</span>
          </div>
          <div class="core-grid">
            <div v-for="(usage, index) in rk3588Stats.npu" :key="'npu-' + index" class="core-item">
              <span class="core-label">NPU{{ index }}</span>
              <div class="mini-progress">
                <div class="mini-progress-fill" :style="{ 
                  width: usage + '%',
                  background: getCoreColor(usage)
                }"></div>
              </div>
              <span class="core-value" :style="{ color: getCoreColor(usage) }">{{ usage }}%</span>
            </div>
          </div>
        </div>
        
        <!-- 温度 -->
        <div class="system-stat temp-stat">
          <div class="system-stat-header">
            <span>核心温度</span>
          </div>
          <div class="temp-display">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
            </svg>
            <span class="temp-value">{{ rk3588Stats.temp.toFixed(1) }}</span>
            <span class="temp-unit">°C</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useVideoStore } from '../stores/video'
import { useAlarmStore } from '../stores/alarm'
import { useStrategyStore } from '../stores/strategy'
import StatCard from '../components/common/StatCard.vue'

const videoStore = useVideoStore()
const alarmStore = useAlarmStore()
const strategyStore = useStrategyStore()

const gradients = [
  'linear-gradient(135deg, #1a1c2e 0%, #2d1f3d 50%, #1c2e4a 100%)',
  'linear-gradient(135deg, #1c2e4a 0%, #1a2f3d 50%, #2d3d1f 100%)',
  'linear-gradient(135deg, #2d1f3d 0%, #3d2d1f 50%, #1f2d3d 100%)',
  'linear-gradient(135deg, #1f3d2d 0%, #2d1f3d 50%, #3d1f2d 100%)'
]

const previewSources = computed(() => videoStore.sources.slice(0, 4))

const rk3588Stats = ref({
  cpu: [3.0, 1.0, 2.0, 2.0, 1.0, 0.0, 1.0, 1.0],
  npu: [0, 0, 0],
  temp: 30.538
})

const API_BASE = 'http://192.168.0.101:5000'

const getCoreColor = (usage) => {
  if (usage < 30) return 'var(--success)'
  if (usage < 60) return 'var(--accent-primary)'
  if (usage < 80) return 'var(--warning)'
  return 'var(--danger)'
}

let statsInterval = null

const fetchRK3588Stats = async () => {
  try {
    const response = await fetch(`${API_BASE}/status`)
    const data = await response.json()
    rk3588Stats.value = data
  } catch (error) {
    console.error('获取RK3588状态失败:', error)
  }
}

onMounted(() => {
  fetchRK3588Stats()
  statsInterval = setInterval(fetchRK3588Stats, 1000)
})

onUnmounted(() => {
  if (statsInterval) clearInterval(statsInterval)
})
</script>

<style scoped>
.dashboard {
  max-width: 1600px;
  margin: 0 auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.card-header h3 {
  font-size: 16px;
  font-weight: 600;
}

.view-all {
  font-size: 13px;
  color: var(--accent-primary);
  text-decoration: none;
}

.view-all:hover {
  text-decoration: underline;
}

.preview-card {
  grid-column: 1;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.preview-item {
  cursor: pointer;
}

.preview-thumbnail {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: 10px;
  overflow: hidden;
}

.preview-gradient {
  position: absolute;
  inset: 0;
  opacity: 0.7;
}

.preview-scan {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.5), transparent);
  animation: scan 3s linear infinite;
}

.preview-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 10px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.4) 0%, transparent 50%);
}

.preview-name {
  font-size: 13px;
  font-weight: 500;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.preview-overlay .status-dot {
  align-self: flex-end;
}

.system-card {
  grid-column: 2;
}

.system-stats {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.system-stat {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.system-stat:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.system-stat-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.core-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.core-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background: var(--bg-secondary);
  border-radius: 6px;
}

.core-label {
  font-size: 10px;
  color: var(--text-secondary);
  font-weight: 500;
}

.mini-progress {
  width: 100%;
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
}

.mini-progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease, background 0.3s ease;
}

.core-value {
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
}

.temp-stat {
  text-align: center;
}

.temp-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.temp-display svg {
  width: 24px;
  height: 24px;
  color: var(--accent-primary);
}

.temp-value {
  font-size: 36px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  color: var(--accent-primary);
}

.temp-unit {
  font-size: 16px;
  color: var(--text-secondary);
}

@media (max-width: 1280px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  
  .preview-card,
  .system-card {
    grid-column: 1;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .preview-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
