<template>
  <div class="page video-monitor">
    <div class="page-header flex justify-between items-center">
      <div>
        <h1 class="page-title">视频监控</h1>
        <p class="page-subtitle">管理多路 WebRTC 视频源</p>
      </div>
      <button class="btn btn-primary" @click="showAddModal = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        添加视频源
      </button>
    </div>
    
    <!-- 布局控制 -->
    <div class="toolbar">
      <div class="layout-controls">
        <span class="toolbar-label">布局:</span>
        <div class="layout-buttons">
          <button 
            v-for="layout in layouts" 
            :key="layout.value"
            :class="['layout-btn', { active: videoStore.activeLayout === layout.value }]"
            @click="videoStore.activeLayout = layout.value"
            :title="layout.label"
          >
            <div class="layout-preview" :class="`layout-${layout.value}`">
              <span v-for="n in parseInt(layout.value)" :key="n"></span>
            </div>
          </button>
        </div>
      </div>
      <div class="source-count">
        <span class="count-badge">
          <span class="status-dot status-online"></span>
          {{ videoStore.onlineCount }} 在线
        </span>
        <span class="count-badge">
          <span class="status-dot status-offline"></span>
          {{ videoStore.offlineCount }} 离线
        </span>
      </div>
    </div>
    
    <!-- 视频网格 -->
    <div class="video-grid" :class="`layout-${videoStore.activeLayout}`">
      <VideoCard 
        v-for="source in videoStore.sources" 
        :key="source.id" 
        :source="source"
        @fullscreen="handleFullscreen"
        @detail="handleDetail"
        @screenshot="handleScreenshot"
      />
      <div v-if="!videoStore.sources.length" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        <h4>暂无视频源</h4>
        <p>点击上方"添加视频源"按钮开始配置</p>
      </div>
    </div>
    
    <!-- 添加视频源弹窗 -->
    <FormModal :show="showAddModal" title="添加视频源" @close="showAddModal = false">
      <div class="form-group">
        <label class="form-label">视频源名称 *</label>
        <input v-model="newSource.name" type="text" class="input" placeholder="例如: 入口大门" />
      </div>
      <div class="form-group">
        <label class="form-label">位置</label>
        <input v-model="newSource.location" type="text" class="input" placeholder="例如: A区-1" />
      </div>
      <div class="form-group">
        <label class="form-label">WebRTC URL *</label>
        <input v-model="newSource.webrtc_url" type="text" class="input" placeholder="webrtc://192.168.0.101/live/0" />
        <p class="form-hint">
          ZLMediaKit 格式: <code>webrtc://服务器IP:端口/live/流名称</code>
        </p>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">ZLM 主机</label>
          <input v-model="newSource.zlmHost" type="text" class="input" placeholder="192.168.0.102" />
        </div>
        <div class="form-group">
          <label class="form-label">ZLM 端口</label>
          <input v-model.number="newSource.zlmPort" type="number" class="input" placeholder="80" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">ZLM 密钥 (可选)</label>
        <input v-model="newSource.zlmSecret" type="password" class="input" placeholder="留空则不使用密钥" />
        <p class="form-hint">在 ZLM 配置文件中设置的 WebAPI 密钥</p>
      </div>
      
      <!-- AI检测配置 -->
      <div class="form-section ai-config-section">
        <div class="form-section-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <span>AI检测配置</span>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">检测模型</label>
            <select v-model="newSource.yoloModel" class="select">
              <option v-for="model in strategyStore.yoloModels" :key="model.value" :value="model.value">
                {{ model.label }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">检测目标</label>
            <select v-model="newSource.yoloClass" class="select">
              <option v-for="cls in strategyStore.yoloClasses" :key="cls.value" :value="cls.value">
                {{ cls.label }}
              </option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">置信度阈值</label>
          <div class="confidence-slider">
            <input 
              v-model.number="newSource.confidence" 
              type="range" 
              min="0.1" 
              max="0.95" 
              step="0.05" 
              class="slider"
            />
            <span class="confidence-value">{{ Math.round(newSource.confidence * 100) }}%</span>
          </div>
        </div>
      </div>
      
      <template #footer>
        <button class="btn btn-secondary" @click="showAddModal = false">取消</button>
        <button class="btn btn-primary" @click="handleAddSource" :disabled="!canAdd">添加</button>
      </template>
    </FormModal>
    
    <!-- 视频详情弹窗 -->
    <FormModal :show="showDetailModal" :title="selectedSource?.name || '视频详情'" @close="showDetailModal = false">
      <div v-if="selectedSource" class="source-detail">
        <div class="detail-row">
          <span class="detail-label">状态</span>
          <span class="badge" :class="statusBadge(selectedSource.status)">
            {{ statusText(selectedSource.status) }}
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">WebRTC URL</span>
          <code class="detail-value">{{ selectedSource.url }}</code>
        </div>
        <div class="detail-row">
          <span class="detail-label">分辨率</span>
          <span class="detail-value">{{ selectedSource.resolution }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">帧率</span>
          <span class="detail-value">{{ selectedSource.fps }} fps</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">视频类型</span>
          <span class="detail-value">WebRTC</span>
        </div>
        
        <!-- AI检测配置显示 -->
        <div class="detail-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          AI检测配置
        </div>
        <div class="detail-row">
          <span class="detail-label">检测模型</span>
          <span class="detail-value ai-model">{{ getYoloModelLabel(selectedSource.id) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">检测目标</span>
          <span class="detail-value">{{ getYoloClassLabel(selectedSource.id) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">置信度</span>
          <span class="detail-value confidence">{{ Math.round(getVideoConfidence(selectedSource.id) * 100) }}%</span>
        </div>
        
        <!-- 编辑AI配置 -->
        <div class="edit-ai-config">
          <div class="form-label">修改AI配置</div>
          <div class="form-row">
            <div class="form-group">
              <select v-model="editAIConfig.yoloModel" class="select">
                <option v-for="model in strategyStore.yoloModels" :key="model.value" :value="model.value">
                  {{ model.label }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <select v-model="editAIConfig.yoloClass" class="select">
                <option v-for="cls in strategyStore.yoloClasses" :key="cls.value" :value="cls.value">
                  {{ cls.label }}
                </option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <div class="confidence-slider">
              <input 
                v-model.number="editAIConfig.confidence" 
                type="range" 
                min="0.1" 
                max="0.95" 
                step="0.05" 
                class="slider"
              />
              <span class="confidence-value">{{ Math.round(editAIConfig.confidence * 100) }}%</span>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" @click="saveAIConfig">
            保存AI配置
          </button>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-danger" @click="handleDelete">删除</button>
        <button class="btn btn-secondary" @click="showDetailModal = false">关闭</button>
      </template>
    </FormModal>
    
    <!-- 截图提示 -->
    <Transition name="toast">
      <div v-if="showToast" class="toast">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span>截图已保存</span>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useVideoStore } from '../stores/video'
import { useStrategyStore } from '../stores/strategy'
import VideoCard from '../components/video/VideoCard.vue'
import FormModal from '../components/common/FormModal.vue'

const videoStore = useVideoStore()
const strategyStore = useStrategyStore()

// 挂载时从后端加载视频源
onMounted(() => {
  videoStore.fetchVideos()
})

const showAddModal = ref(false)
const showDetailModal = ref(false)
const selectedSource = ref(null)
const showToast = ref(false)

// 编辑AI配置
const editAIConfig = ref({
  yoloModel: 'yolov8',
  yoloClass: 'all',
  confidence: 0.5
})

const getYoloModelLabel = (videoId) => {
  const config = videoStore.getVideoAIConfig(videoId)
  const found = strategyStore.yoloModels.find(m => m.value === config.yoloModel)
  return found ? found.label : 'YOLOv8'
}

const getYoloClassLabel = (videoId) => {
  const config = videoStore.getVideoAIConfig(videoId)
  const found = strategyStore.yoloClasses.find(c => c.value === config.yoloClass)
  return found ? found.label : '检测所有目标'
}

const getVideoConfidence = (videoId) => {
  const config = videoStore.getVideoAIConfig(videoId)
  return config.confidence
}

const saveAIConfig = () => {
  if (selectedSource.value) {
    videoStore.updateVideoAIConfig(selectedSource.value.id, { ...editAIConfig.value })
    showToast.value = true
    setTimeout(() => {
      showToast.value = false
    }, 2000)
  }
}

const layouts = [
  { value: '1', label: '单画面' },
  { value: '4', label: '四画面' },
  { value: '9', label: '九画面' },
  { value: '16', label: '十六画面' }
]

const newSource = ref({
  name: '',
  location: '',
  webrtc_url: '',
  type: 'webrtc',
  zlmHost: '192.168.0.101',
  zlmPort: 80,
  zlmSecret: '',
  // AI配置
  yoloModel: 'yolov8',
  yoloClass: 'all',
  confidence: 0.5
})

const canAdd = computed(() => {
  return newSource.value.name.trim() && newSource.value.webrtc_url.trim()
})

const handleAddSource = () => {
  if (!canAdd.value) return
  
  const sourceData = { ...newSource.value }
  const aiConfig = {
    yoloModel: sourceData.yoloModel,
    yoloClass: sourceData.yoloClass,
    confidence: sourceData.confidence
  }
  
  videoStore.addSource({ ...sourceData })
  
  // 保存AI配置（需要等视频源添加后获取ID）
  setTimeout(() => {
    const addedSource = videoStore.sources[videoStore.sources.length - 1]
    if (addedSource) {
      videoStore.updateVideoAIConfig(addedSource.id, aiConfig)
    }
  }, 100)
  
  newSource.value = {
    name: '',
    location: '',
    webrtc_url: '',
    type: 'webrtc',
    zlmHost: '192.168.0.101',
    zlmPort: 80,
    zlmSecret: '',
    yoloModel: 'yolov8',
    yoloClass: 'all',
    confidence: 0.5
  }
  showAddModal.value = false
}

const handleFullscreen = (source) => {
  videoStore.activeLayout = '1'
}

const handleDetail = (source) => {
  selectedSource.value = source
  // 加载当前AI配置
  const aiConfig = videoStore.getVideoAIConfig(source.id)
  editAIConfig.value = { ...aiConfig }
  showDetailModal.value = true
}

const handleDelete = () => {
  if (selectedSource.value) {
    videoStore.removeSource(selectedSource.value.id)
    showDetailModal.value = false
    selectedSource.value = null
  }
}

const handleScreenshot = (info) => {
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 2000)
}

const statusBadge = (status) => {
  const map = {
    online: 'badge-success',
    offline: 'badge-danger',
    connecting: 'badge-warning'
  }
  return map[status] || 'badge-info'
}

const statusText = (status) => {
  const map = {
    online: '在线',
    offline: '离线',
    connecting: '连接中'
  }
  return map[status] || '未知'
}

watch(() => videoStore.activeLayout, (newLayout) => {
  localStorage.setItem('videoLayout', newLayout)
})

// 恢复布局设置
const savedLayout = localStorage.getItem('videoLayout')
if (savedLayout) {
  videoStore.activeLayout = savedLayout
}
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 12px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.toolbar-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-right: 12px;
}

.layout-controls {
  display: flex;
  align-items: center;
}

.layout-buttons {
  display: flex;
  gap: 8px;
}

.layout-btn {
  padding: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.layout-btn:hover {
  border-color: var(--accent-primary);
}

.layout-btn.active {
  background: rgba(59, 130, 246, 0.1);
  border-color: var(--accent-primary);
}

.layout-preview {
  display: grid;
  gap: 2px;
  width: 32px;
  height: 24px;
}

.layout-preview span {
  background: var(--text-secondary);
  border-radius: 2px;
}

.layout-btn.active .layout-preview span {
  background: var(--accent-primary);
}

.layout-1 {
  grid-template-columns: 1fr;
}

.layout-1 span {
  grid-column: span 1;
  grid-row: span 1;
}

.layout-4 {
  grid-template-columns: repeat(2, 1fr);
}

.layout-9 {
  grid-template-columns: repeat(3, 1fr);
}

.layout-16 {
  grid-template-columns: repeat(4, 1fr);
}

.source-count {
  display: flex;
  gap: 16px;
}

.count-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.video-grid {
  display: grid;
  gap: 16px;
}

.video-grid.layout-1 {
  grid-template-columns: 1fr;
}

.video-grid.layout-4 {
  grid-template-columns: repeat(2, 1fr);
}

.video-grid.layout-9 {
  grid-template-columns: repeat(3, 1fr);
}

.video-grid.layout-16 {
  grid-template-columns: repeat(4, 1fr);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-section {
  margin-top: 16px;
  padding: 16px;
  background: rgba(168, 85, 247, 0.05);
  border: 1px solid rgba(168, 85, 247, 0.2);
  border-radius: 8px;
}

.form-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #a855f7;
}

.ai-config-section .form-group {
  margin-bottom: 12px;
}

.confidence-slider {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  background: var(--bg-secondary);
  border-radius: 3px;
  outline: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #a855f7;
  border-radius: 50%;
  cursor: pointer;
}

.confidence-value {
  min-width: 45px;
  font-size: 13px;
  font-weight: 600;
  color: #a855f7;
  text-align: right;
}

.source-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.detail-label {
  width: 100px;
  font-size: 13px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.detail-value {
  font-size: 14px;
  word-break: break-all;
}

.detail-value.ai-model {
  color: #a855f7;
  font-weight: 500;
}

.detail-value.confidence {
  color: #a855f7;
  font-weight: 600;
}

.detail-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 20px 0 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  font-size: 13px;
  font-weight: 600;
  color: #a855f7;
}

.edit-ai-config {
  margin-top: 16px;
  padding: 16px;
  background: rgba(168, 85, 247, 0.05);
  border: 1px solid rgba(168, 85, 247, 0.2);
  border-radius: 8px;
}

.edit-ai-config .form-label {
  display: block;
  margin-bottom: 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.edit-ai-config .form-row {
  margin-bottom: 12px;
}

.edit-ai-config .btn-sm {
  padding: 6px 16px;
  font-size: 12px;
}

code.detail-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  padding: 4px 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
}

.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: var(--success);
  color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
  z-index: 2000;
}

.toast svg {
  width: 20px;
  height: 20px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

@media (max-width: 1280px) {
  .video-grid.layout-9,
  .video-grid.layout-16 {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 1024px) {
  .video-grid.layout-4,
  .video-grid.layout-9,
  .video-grid.layout-16 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .toolbar {
    flex-direction: column;
    gap: 12px;
  }
  
  .video-grid.layout-1,
  .video-grid.layout-4,
  .video-grid.layout-9,
  .video-grid.layout-16 {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
