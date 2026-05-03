<template>
  <div class="video-card" :class="[`status-${connectionState}`]">
    <div class="video-container">
      <!-- WebRTC 播放器 -->
      <WebRTCPlayer 
        v-if="source.url && source.status !== 'offline'"
        ref="playerRef"
        :url="source.url"
        :zlm-host="source.zlmHost || '192.168.0.101'"
        :zlm-port="source.zlmPort || 80"
        :zlm-secret="source.zlmSecret || ''"
        @stateChange="handleStateChange"
        @error="handleError"
        @debug="handleDebug"
      />
      
      <!-- 离线状态 -->
      <div v-else class="video-placeholder offline">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="1" y1="1" x2="23" y2="23"/>
          <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56"/>
        </svg>
        <span>离线</span>
      </div>
      
      <!-- 连接中状态 -->
      <div v-if="connectionState === 'connecting'" class="connecting-overlay">
        <div class="loading-spinner"></div>
        <span>连接中...</span>
      </div>
      
      <div class="video-overlay">
        <div class="video-info">
          <span class="camera-name">{{ source.name }}</span>
          <div class="status-indicator">
            <span class="status-dot" :class="`status-${connectionState}`"></span>
            <span class="status-text">{{ statusText }}</span>
          </div>
        </div>
        <div class="video-actions">
          <button class="action-btn" title="全屏" @click="$emit('fullscreen', source)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 3 21 3 21 9"/>
              <polyline points="9 21 3 21 3 15"/>
              <line x1="21" y1="3" x2="14" y2="10"/>
              <line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
          </button>
          <button class="action-btn" title="截图" @click="takeScreenshot">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>
          <button class="action-btn" title="详情" @click="$emit('detail', source)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    <div class="video-footer">
      <span class="resolution">{{ source.resolution }}</span>
      <span class="fps">{{ source.fps }} fps</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useVideoStore } from '../../stores/video'
import WebRTCPlayer from './WebRTCPlayer.vue'

const videoStore = useVideoStore()

const props = defineProps({
  source: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['fullscreen', 'detail', 'screenshot'])

const playerRef = ref(null)
const connectionState = ref('new')

const statusText = computed(() => {
  const statusMap = {
    new: '等待连接',
    connecting: '连接中',
    connected: '在线',
    disconnected: '断开',
    failed: '连接失败',
    closed: '已关闭',
    offline: '离线'
  }
  return statusMap[connectionState.value] || '未知'
})

const handleStateChange = (state) => {
  connectionState.value = state
  // 同步更新 videoStore 中的状态
  if (state === 'connected') {
    videoStore.updateSource(props.source.id, { status: 'online' })
  } else if (state === 'failed' || state === 'closed') {
    videoStore.updateSource(props.source.id, { status: 'offline' })
  }
}

const handleError = (error) => {
  console.error('视频播放错误:', error)
  connectionState.value = 'failed'
}

const handleDebug = (info) => {
  console.log(`[${info.time}] ${info.msg}`)
}

const takeScreenshot = () => {
  let imageData = null
  if (playerRef.value && connectionState.value === 'connected') {
    imageData = playerRef.value.takeSnapshot()
  }
  
  emit('screenshot', {
    name: props.source.name,
    time: new Date().toISOString(),
    image: imageData
  })
}

watch(() => props.source.status, (newStatus) => {
  if (newStatus === 'offline') {
    connectionState.value = 'offline'
  }
}, { immediate: true })
</script>

<style scoped>
.video-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.video-card:hover {
  border-color: var(--accent-primary);
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
}

.video-card.status-connected {
  border-color: rgba(16, 185, 129, 0.3);
}

.video-card.status-connected:hover {
  border-color: var(--success);
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
}

.video-card.status-offline,
.video-card.status-failed {
  border-color: rgba(239, 68, 68, 0.3);
}

.video-container {
  position: relative;
  aspect-ratio: 16 / 9;
  background: var(--bg-secondary);
  overflow: hidden;
}

.video-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-secondary);
}

.video-placeholder svg {
  width: 48px;
  height: 48px;
  opacity: 0.5;
}

.video-placeholder.offline {
  background: linear-gradient(135deg, #1a1a2e, #2d1f3d);
}

.video-placeholder.offline svg {
  color: var(--danger);
  opacity: 0.8;
}

.connecting-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.5);
  color: var(--text-secondary);
  z-index: 5;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(59, 130, 246, 0.3);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.video-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.video-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.6) 0%, transparent 40%, transparent 60%, rgba(0, 0, 0, 0.8) 100%);
  opacity: 0;
  transition: opacity 0.3s;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px;
}

.video-card:hover .video-overlay {
  opacity: 1;
}

.video-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.camera-name {
  font-size: 13px;
  font-weight: 600;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.video-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(4px);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--accent-primary);
  transform: scale(1.1);
}

.action-btn svg {
  width: 100%;
  height: 100%;
}

.video-footer {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--bg-secondary);
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-secondary);
}
</style>
