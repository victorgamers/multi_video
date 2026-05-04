<template>
  <div class="page multimodal">
    <div class="page-header">
      <h1 class="page-title">多模态分析</h1>
      <p class="page-subtitle">截图识别与智能分析</p>
    </div>

    <div class="multimodal-container">
      <!-- 左侧：图片上传和预览 -->
      <div class="image-panel">
        <div class="panel-header">
          <h3>图片输入</h3>
          <div class="input-mode-tabs">
            <button 
              :class="['tab-btn', { active: inputMode === 'upload' }]"
              @click="inputMode = 'upload'"
            >
              上传图片
            </button>
            <button 
              :class="['tab-btn', { active: inputMode === 'screenshot' }]"
              @click="switchToScreenshotMode"
            >
              选择截图
              <span v-if="totalScreenshots > 0" class="tab-badge">{{ totalScreenshots }}</span>
            </button>
          </div>
        </div>
        
        <!-- 上传模式 -->
        <template v-if="inputMode === 'upload'">
          <div 
            class="upload-area" 
            :class="{ 'has-image': previewUrl }"
            @click="triggerUpload"
            @dragover.prevent="isDragging = true"
            @dragleave="isDragging = false"
            @drop.prevent="handleDrop"
          >
            <input 
              ref="fileInput"
              type="file" 
              accept="image/*" 
              @change="handleFileSelect"
              hidden
            />
            
            <div v-if="!previewUrl" class="upload-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span>点击或拖拽上传图片</span>
              <span class="upload-hint">支持 PNG、JPG、WebP 格式</span>
            </div>
            
            <img v-else :src="previewUrl" class="preview-image" />
          </div>

          <!-- 图片操作 -->
          <div v-if="previewUrl" class="image-actions">
            <button class="btn btn-secondary" @click="clearImage">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              清除图片
            </button>
            <button class="btn btn-secondary" @click="triggerUpload">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              更换图片
            </button>
          </div>
        </template>

        <!-- 截图选择模式 -->
        <template v-else>
          <div class="screenshot-selector">
            <!-- 筛选栏 -->
            <div class="screenshot-filter">
              <select v-model="filterCamera" class="select" @change="loadScreenshots">
                <option value="">全部摄像头</option>
                <option v-for="video in videoStore.sources" :key="video.id" :value="video.id">
                  {{ video.name }}
                </option>
              </select>
              <button class="btn btn-secondary btn-sm" @click="loadScreenshots">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                刷新
              </button>
            </div>

            <!-- 截图网格 -->
            <div v-if="screenshotLoading" class="screenshot-loading">
              <div class="loading-spinner"></div>
              <span>加载中...</span>
            </div>
            <div v-else-if="allScreenshots.length === 0" class="screenshot-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span>暂无截图</span>
              <span class="empty-hint">在视频监控页面截图后会显示在这里</span>
            </div>
            <div v-else class="screenshot-grid">
              <div 
                v-for="shot in allScreenshots" 
                :key="shot.id || shot.url"
                class="screenshot-item"
                :class="{ selected: selectedScreenshotId === (shot.id || shot.url) }"
                @click="selectScreenshot(shot)"
              >
                <img :src="shot.url || shot.data" :alt="shot.camera_name" />
                <div class="screenshot-info">
                  <span class="camera-name">{{ shot.camera_name }}</span>
                  <span class="shot-time">{{ formatTime(shot.timestamp || shot.time) }}</span>
                </div>
                <div v-if="selectedScreenshotId === (shot.id || shot.url)" class="selected-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </div>
            </div>

            <!-- 分页 -->
            <div v-if="screenshotTotalPages > 1" class="screenshot-pagination">
              <button 
                class="page-btn" 
                :disabled="screenshotPage === 1"
                @click="screenshotPage--; loadScreenshots()"
              >上一页</button>
              <span>{{ screenshotPage }} / {{ screenshotTotalPages }}</span>
              <button 
                class="page-btn" 
                :disabled="screenshotPage === screenshotTotalPages"
                @click="screenshotPage++; loadScreenshots()"
              >下一页</button>
            </div>
          </div>
        </template>

        <!-- 快速选择截图 - 上传模式下显示 -->
        <div class="quick-screenshots" v-if="inputMode === 'upload' && recentScreenshots.length > 0">
          <div class="quick-header">
            <h4>最近截图</h4>
            <button class="btn-link" @click="switchToScreenshotMode">查看全部</button>
          </div>
          <div class="screenshot-list">
            <div 
              v-for="(shot, index) in recentScreenshots" 
              :key="index"
              class="screenshot-thumb"
              @click="selectScreenshot(shot)"
            >
              <img :src="shot.url || shot.data" />
              <span class="screenshot-time">{{ formatTime(shot.timestamp || shot.time) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：提示词和结果 -->
      <div class="analysis-panel">
        <div class="panel-header">
          <h3>智能分析</h3>
          <div class="model-select">
            <select v-model="selectedModel" class="select">
              <option value="vision">视觉模型</option>
              <option value="qwen-vl">通义千问 VL</option>
              <option value="claude">Claude Vision</option>
            </select>
          </div>
        </div>

        <!-- 提示词输入 -->
        <div class="prompt-section">
          <textarea 
            v-model="prompt" 
            class="textarea prompt-input"
            placeholder="请输入分析提示词，例如：描述这张图片中的内容、识别图片中的文字、分析图片中的异常..."
            rows="4"
          ></textarea>
          
          <div class="prompt-actions">
            <button 
              class="btn btn-primary btn-lg"
              :disabled="!canAnalyze"
              @click="analyzeImage"
            >
              <svg v-if="loading" class="spinner" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="30 70"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              {{ loading ? '分析中...' : '开始分析' }}
            </button>
          </div>
        </div>

        <!-- 分析结果 -->
        <div class="result-section">
          <div class="result-header">
            <h4>分析结果</h4>
            <button v-if="result" class="btn-icon" @click="copyResult" title="复制结果">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
          </div>
          
          <div v-if="loading" class="result-loading">
            <div class="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p>AI 正在分析图片，请稍候...</p>
          </div>
          
          <div v-else-if="error" class="result-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>{{ error }}</span>
          </div>
          
          <div v-else-if="result" class="result-content">
            <pre class="result-text">{{ result }}</pre>
          </div>
          
          <div v-else class="result-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span>上传图片并输入提示词后点击分析按钮</span>
          </div>
        </div>

        <!-- 历史记录 -->
        <div class="history-section" v-if="history.length > 0">
          <div class="history-header" @click="showHistory = !showHistory">
            <h4>历史记录</h4>
            <svg :class="{ rotated: showHistory }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          <div v-show="showHistory" class="history-list">
            <div 
              v-for="(item, index) in history" 
              :key="index"
              class="history-item"
              @click="loadHistory(item)"
            >
              <img :src="item.image" class="history-thumb" />
              <div class="history-info">
                <span class="history-prompt">{{ item.prompt }}</span>
                <span class="history-time">{{ formatTime(item.time) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useVideoStore } from '../stores/video'

const videoStore = useVideoStore()

const fileInput = ref(null)
const previewUrl = ref('')
const imageFile = ref(null)
const prompt = ref('')
const selectedModel = ref('vision')
const result = ref('')
const loading = ref(false)
const error = ref('')
const isDragging = ref(false)
const showHistory = ref(false)
const recentScreenshots = ref([])
const history = ref([])

// 截图选择相关
const inputMode = ref('upload')
const allScreenshots = ref([])
const screenshotLoading = ref(false)
const screenshotPage = ref(1)
const screenshotPageSize = ref(12)
const screenshotTotal = ref(0)
const filterCamera = ref('')
const selectedScreenshotId = ref(null)

const totalScreenshots = computed(() => screenshotTotal.value || recentScreenshots.value.length)
const screenshotTotalPages = computed(() => Math.ceil(screenshotTotal.value / screenshotPageSize.value) || 1)

const canAnalyze = computed(() => {
  return previewUrl.value && prompt.value.trim()
})

const triggerUpload = () => {
  fileInput.value?.click()
}

const handleFileSelect = (e) => {
  const file = e.target.files[0]
  if (file) {
    loadImage(file)
  }
}

const handleDrop = (e) => {
  isDragging.value = false
  const file = e.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) {
    loadImage(file)
  }
}

const loadImage = (file) => {
  imageFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => {
    previewUrl.value = e.target.result
    result.value = ''
    error.value = ''
  }
  reader.readAsDataURL(file)
}

const clearImage = () => {
  previewUrl.value = ''
  imageFile.value = null
  result.value = ''
  error.value = ''
  selectedScreenshotId.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const switchToScreenshotMode = async () => {
  inputMode.value = 'screenshot'
  await loadScreenshots()
}

const loadScreenshots = async () => {
  screenshotLoading.value = true
  try {
    // 先尝试从后端获取
    const params = new URLSearchParams({
      page: screenshotPage.value.toString(),
      page_size: screenshotPageSize.value.toString()
    })
    if (filterCamera.value) {
      params.append('camera_id', filterCamera.value)
    }
    
    const response = await fetch(`/api/screenshots?${params}`)
    if (response.ok) {
      const data = await response.json()
      allScreenshots.value = data.screenshots || []
      screenshotTotal.value = data.total || 0
    } else {
      throw new Error('API不可用')
    }
  } catch (e) {
    // 如果API不可用，使用本地存储
    const savedScreenshots = localStorage.getItem('recentScreenshots')
    if (savedScreenshots) {
      let list = JSON.parse(savedScreenshots)
      if (filterCamera.value) {
        list = list.filter(s => s.camera_id === filterCamera.value)
      }
      allScreenshots.value = list
      screenshotTotal.value = list.length
    } else {
      allScreenshots.value = []
      screenshotTotal.value = 0
    }
  } finally {
    screenshotLoading.value = false
  }
}

const selectScreenshot = (shot) => {
  const imageUrl = shot.url || shot.data
  previewUrl.value = imageUrl
  imageFile.value = null
  result.value = ''
  error.value = ''
  selectedScreenshotId.value = shot.id || shot.url
  
  // 切换回上传模式显示已选图片
  inputMode.value = 'upload'
}

const analyzeImage = async () => {
  if (!canAnalyze.value) return
  
  loading.value = true
  error.value = ''
  result.value = ''

  try {
    // 构建请求数据
    const requestData = {
      image: previewUrl.value,
      prompt: prompt.value,
      model: selectedModel.value
    }

    // 调用后端 API
    const response = await fetch('/api/multimodal/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error)
    }

    result.value = data.result || data.response || JSON.stringify(data, null, 2)

    // 保存到历史记录
    const historyItem = {
      image: previewUrl.value,
      prompt: prompt.value,
      result: result.value,
      time: new Date().toISOString()
    }
    history.value.unshift(historyItem)
    if (history.value.length > 20) {
      history.value = history.value.slice(0, 20)
    }
    localStorage.setItem('multimodalHistory', JSON.stringify(history.value))

  } catch (err) {
    console.error('分析失败:', err)
    error.value = err.message || '分析失败，请重试'
  } finally {
    loading.value = false
  }
}

const copyResult = async () => {
  try {
    await navigator.clipboard.writeText(result.value)
    // 可以添加 toast 提示
  } catch (err) {
    console.error('复制失败:', err)
  }
}

const loadHistory = (item) => {
  previewUrl.value = item.image
  prompt.value = item.prompt
  result.value = item.result
}

const formatTime = (isoString) => {
  const date = new Date(isoString)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(async () => {
  // 加载历史记录
  const savedHistory = localStorage.getItem('multimodalHistory')
  if (savedHistory) {
    try {
      history.value = JSON.parse(savedHistory)
    } catch (e) {
      console.error('加载历史记录失败:', e)
    }
  }

  // 加载最近截图（用于快速选择）
  const savedScreenshots = localStorage.getItem('recentScreenshots')
  if (savedScreenshots) {
    try {
      recentScreenshots.value = JSON.parse(savedScreenshots)
    } catch (e) {
      console.error('加载截图失败:', e)
    }
  }

  // 同时更新总数显示
  screenshotTotal.value = recentScreenshots.value.length
})
</script>

<style scoped>
.multimodal {
  max-width: 1400px;
  margin: 0 auto;
}

.multimodal-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  min-height: calc(100vh - 200px);
}

.image-panel,
.analysis-panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.panel-header h3 {
  font-size: 16px;
  font-weight: 600;
}

/* 上传区域 */
.upload-area {
  flex: 1;
  min-height: 300px;
  border: 2px dashed var(--border);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
}

.upload-area:hover {
  border-color: var(--accent-primary);
  background: rgba(59, 130, 246, 0.05);
}

.upload-area.has-image {
  border-style: solid;
  padding: 0;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary);
  padding: 40px;
  text-align: center;
}

.upload-placeholder svg {
  width: 48px;
  height: 48px;
  opacity: 0.5;
}

.upload-hint {
  font-size: 12px;
  opacity: 0.6;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  max-height: 400px;
}

/* 图片操作按钮 */
.image-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.image-actions .btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.image-actions .btn svg {
  width: 16px;
  height: 16px;
}

/* 快速选择截图 */
.quick-screenshots {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.quick-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.quick-header h4 {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

.btn-link {
  background: none;
  border: none;
  color: var(--accent-primary);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}

.btn-link:hover {
  text-decoration: underline;
}

.screenshot-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.screenshot-thumb {
  position: relative;
  aspect-ratio: 16/9;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.screenshot-thumb:hover {
  border-color: var(--accent-primary);
  transform: scale(1.05);
}

.screenshot-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.screenshot-time {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 6px;
  background: rgba(0, 0, 0, 0.7);
  font-size: 10px;
  color: white;
  text-align: center;
}

/* 输入模式切换 */
.input-mode-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-secondary);
  padding: 4px;
  border-radius: 8px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  background: var(--bg-card);
  color: var(--accent-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tab-badge {
  background: var(--accent-primary);
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
}

/* 截图选择器 */
.screenshot-selector {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 400px;
}

.screenshot-filter {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.screenshot-filter .select {
  flex: 1;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.screenshot-loading,
.screenshot-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-secondary);
}

.screenshot-empty svg {
  width: 48px;
  height: 48px;
  opacity: 0.5;
}

.empty-hint {
  font-size: 12px;
  opacity: 0.6;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.screenshot-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  flex: 1;
  overflow-y: auto;
}

.screenshot-item {
  position: relative;
  aspect-ratio: 16/9;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.screenshot-item:hover {
  border-color: var(--accent-primary);
  transform: scale(1.02);
}

.screenshot-item.selected {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}

.screenshot-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.screenshot-item .screenshot-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  display: flex;
  flex-direction: column;
}

.screenshot-item .camera-name {
  font-size: 12px;
  font-weight: 500;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.screenshot-item .shot-time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
}

.selected-check {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  background: var(--accent-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.selected-check svg {
  width: 14px;
  height: 14px;
  color: white;
}

.screenshot-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.page-btn {
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 提示词输入 */
.prompt-section {
  margin-bottom: 20px;
}

.prompt-input {
  width: 100%;
  resize: none;
  font-size: 14px;
  line-height: 1.6;
}

.prompt-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.btn-lg {
  padding: 12px 24px;
  font-size: 15px;
  gap: 10px;
}

.btn-lg svg {
  width: 18px;
  height: 18px;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 分析结果 */
.result-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-radius: 10px;
  min-height: 200px;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.result-header h4 {
  font-size: 14px;
  font-weight: 500;
}

.btn-icon {
  padding: 6px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.btn-icon svg {
  width: 16px;
  height: 16px;
}

.result-loading,
.result-error,
.result-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-secondary);
  padding: 40px;
  text-align: center;
}

.result-error {
  color: var(--danger);
}

.result-error svg {
  width: 40px;
  height: 40px;
}

.loading-dots {
  display: flex;
  gap: 6px;
}

.loading-dots span {
  width: 10px;
  height: 10px;
  background: var(--accent-primary);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) { animation-delay: -0.32s; }
.loading-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.result-content {
  flex: 1;
  padding: 16px;
  overflow: auto;
}

.result-text {
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-primary);
  font-family: inherit;
  margin: 0;
}

/* 历史记录 */
.history-section {
  margin-top: 20px;
  border-top: 1px solid var(--border);
  padding-top: 16px;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 8px 0;
}

.history-header h4 {
  font-size: 13px;
  color: var(--text-secondary);
}

.history-header svg {
  width: 16px;
  height: 16px;
  color: var(--text-secondary);
  transition: transform 0.3s;
}

.history-header svg.rotated {
  transform: rotate(180deg);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  margin-top: 12px;
}

.history-item {
  display: flex;
  gap: 12px;
  padding: 10px;
  background: var(--bg-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.history-item:hover {
  background: var(--bg-hover);
}

.history-thumb {
  width: 60px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}

.history-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.history-prompt {
  font-size: 12px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-time {
  font-size: 11px;
  color: var(--text-secondary);
}

@media (max-width: 1024px) {
  .multimodal-container {
    grid-template-columns: 1fr;
  }
}
</style>
