<template>
  <div class="page screenshot-list-page">
    <div class="page-header flex justify-between items-center">
      <div>
        <h1 class="page-title">截图列表</h1>
        <p class="page-subtitle">管理所有监控截图</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="refreshList" :disabled="loading">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          刷新
        </button>
      </div>
    </div>

    <!-- 筛选工具栏 -->
    <div class="filter-toolbar">
      <div class="filter-group">
        <label>摄像头:</label>
        <select v-model="filterCamera" class="select">
          <option value="">全部</option>
          <option v-for="video in videoStore.sources" :key="video.id" :value="video.id">
            {{ video.name }}
          </option>
        </select>
      </div>
      <div class="filter-group">
        <label>时间范围:</label>
        <select v-model="filterTime" class="select">
          <option value="">全部时间</option>
          <option value="today">今天</option>
          <option value="week">本周</option>
          <option value="month">本月</option>
        </select>
      </div>
      <div class="filter-stats">
        共 {{ total }} 张截图
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>加载中...</span>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!screenshots.length" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
      <h4>暂无截图</h4>
      <p>在视频监控页面点击截图按钮来保存截图</p>
    </div>

    <!-- 截图网格 -->
    <div v-else class="screenshot-grid">
      <div 
        v-for="screenshot in screenshots" 
        :key="screenshot.id"
        class="screenshot-card"
        @click="showDetail(screenshot)"
      >
        <div class="screenshot-image">
          <img :src="screenshot.url" :alt="screenshot.camera_name" />
          <div class="screenshot-overlay">
            <button class="overlay-btn" title="查看" @click.stop="showDetail(screenshot)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
            <button class="overlay-btn" title="下载" @click.stop="downloadScreenshot(screenshot)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
            <button class="overlay-btn danger" title="删除" @click.stop="confirmDelete(screenshot)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="screenshot-info">
          <div class="camera-name">{{ screenshot.camera_name }}</div>
          <div class="screenshot-time">{{ formatTime(screenshot.timestamp) }}</div>
          <div class="screenshot-size">{{ formatSize(screenshot.size) }}</div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="pagination">
      <button 
        class="page-btn" 
        :disabled="currentPage === 1"
        @click="changePage(currentPage - 1)"
      >
        上一页
      </button>
      <span class="page-info">
        第 {{ currentPage }} / {{ totalPages }} 页
      </span>
      <button 
        class="page-btn" 
        :disabled="currentPage === totalPages"
        @click="changePage(currentPage + 1)"
      >
        下一页
      </button>
    </div>

    <!-- 详情弹窗 -->
    <FormModal 
      v-if="selectedScreenshot" 
      :show="showModal" 
      :title="selectedScreenshot.camera_name"
      @close="closeModal"
    >
      <div class="screenshot-detail">
        <img :src="selectedScreenshot.url" :alt="selectedScreenshot.camera_name" />
        <div class="detail-info">
          <div class="detail-row">
            <span class="label">摄像头:</span>
            <span>{{ selectedScreenshot.camera_name }}</span>
          </div>
          <div class="detail-row">
            <span class="label">时间:</span>
            <span>{{ formatFullTime(selectedScreenshot.timestamp) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">大小:</span>
            <span>{{ formatSize(selectedScreenshot.size) }}</span>
          </div>
          <div v-if="selectedScreenshot.width" class="detail-row">
            <span class="label">分辨率:</span>
            <span>{{ selectedScreenshot.width }} × {{ selectedScreenshot.height }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="downloadScreenshot(selectedScreenshot)">
          下载
        </button>
        <button class="btn btn-danger" @click="confirmDelete(selectedScreenshot)">
          删除
        </button>
        <button class="btn btn-secondary" @click="closeModal">
          关闭
        </button>
      </template>
    </FormModal>

    <!-- 删除确认 -->
    <FormModal 
      v-if="deleteTarget" 
      :show="showDeleteConfirm" 
      title="确认删除"
      @close="showDeleteConfirm = false"
    >
      <p>确定要删除这张截图吗？此操作无法撤销。</p>
      <template #footer>
        <button class="btn btn-secondary" @click="showDeleteConfirm = false">
          取消
        </button>
        <button class="btn btn-danger" @click="deleteScreenshot">
          确认删除
        </button>
      </template>
    </FormModal>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useVideoStore } from '../stores/video'
import FormModal from '../components/common/FormModal.vue'

const videoStore = useVideoStore()

const screenshots = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const filterCamera = ref('')
const filterTime = ref('')
const showModal = ref(false)
const selectedScreenshot = ref(null)
const showDeleteConfirm = ref(false)
const deleteTarget = ref(null)

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const fetchScreenshots = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: currentPage.value.toString(),
      page_size: pageSize.value.toString()
    })
    
    if (filterCamera.value) {
      params.append('camera_id', filterCamera.value)
    }
    if (filterTime.value) {
      params.append('time_range', filterTime.value)
    }

    const response = await fetch(`/api/screenshots?${params}`)
    if (!response.ok) throw new Error('获取截图列表失败')
    
    const data = await response.json()
    screenshots.value = data.screenshots || []
    total.value = data.total || 0
  } catch (error) {
    console.error('获取截图失败:', error)
    // 如果API不可用，使用本地存储的截图
    loadLocalScreenshots()
  } finally {
    loading.value = false
  }
}

const loadLocalScreenshots = () => {
  const savedScreenshots = localStorage.getItem('recentScreenshots')
  if (savedScreenshots) {
    try {
      screenshots.value = JSON.parse(savedScreenshots)
      total.value = screenshots.value.length
    } catch (e) {
      console.error('加载本地截图失败:', e)
    }
  }
}

const refreshList = () => {
  fetchScreenshots()
}

const changePage = (page) => {
  currentPage.value = page
  fetchScreenshots()
}

const showDetail = (screenshot) => {
  selectedScreenshot.value = screenshot
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedScreenshot.value = null
}

const confirmDelete = (screenshot) => {
  deleteTarget.value = screenshot
  showDeleteConfirm.value = true
  if (showModal.value) {
    closeModal()
  }
}

const deleteScreenshot = async () => {
  if (!deleteTarget.value) return
  
  try {
    const response = await fetch(`/api/screenshots/${deleteTarget.value.id}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) throw new Error('删除失败')
    
    // 从列表中移除
    screenshots.value = screenshots.value.filter(s => s.id !== deleteTarget.value.id)
    total.value--
    
    showDeleteConfirm.value = false
    deleteTarget.value = null
  } catch (error) {
    console.error('删除截图失败:', error)
    // 如果API不可用，从本地存储删除
    deleteLocalScreenshot(deleteTarget.value.id)
  }
}

const deleteLocalScreenshot = (id) => {
  const savedScreenshots = localStorage.getItem('recentScreenshots')
  if (savedScreenshots) {
    let list = JSON.parse(savedScreenshots)
    list = list.filter(s => s.id !== id)
    localStorage.setItem('recentScreenshots', JSON.stringify(list))
    screenshots.value = list
    total.value = list.length
  }
  showDeleteConfirm.value = false
  deleteTarget.value = null
}

const downloadScreenshot = (screenshot) => {
  const link = document.createElement('a')
  link.href = screenshot.url
  link.download = `screenshot_${screenshot.camera_name}_${screenshot.timestamp}.png`
  link.click()
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatFullTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const formatSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// 监听筛选变化
watch([filterCamera, filterTime], () => {
  currentPage.value = 1
  fetchScreenshots()
})

onMounted(() => {
  fetchScreenshots()
})
</script>

<style scoped>
.screenshot-list-page {
  max-width: 1400px;
  margin: 0 auto;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.filter-toolbar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  margin-bottom: 20px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group label {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.filter-group .select {
  min-width: 140px;
}

.filter-stats {
  margin-left: auto;
  font-size: 13px;
  color: var(--text-secondary);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 60px;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 40px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  text-align: center;
}

.empty-state svg {
  width: 64px;
  height: 64px;
  color: var(--text-secondary);
  opacity: 0.5;
}

.empty-state h4 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.empty-state p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.screenshot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.screenshot-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.screenshot-card:hover {
  border-color: var(--accent-primary);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.15);
}

.screenshot-image {
  position: relative;
  aspect-ratio: 16/9;
  background: var(--bg-secondary);
  overflow: hidden;
}

.screenshot-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.screenshot-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  opacity: 0;
  transition: opacity 0.3s;
}

.screenshot-card:hover .screenshot-overlay {
  opacity: 1;
}

.overlay-btn {
  width: 40px;
  height: 40px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(4px);
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.overlay-btn:hover {
  background: var(--accent-primary);
  transform: scale(1.1);
}

.overlay-btn.danger:hover {
  background: var(--danger);
}

.overlay-btn svg {
  width: 100%;
  height: 100%;
}

.screenshot-info {
  padding: 16px;
}

.camera-name {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.screenshot-time {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.screenshot-size {
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.7;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px;
}

.page-btn {
  padding: 8px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
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

.page-info {
  font-size: 13px;
  color: var(--text-secondary);
}

.screenshot-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.screenshot-detail img {
  width: 100%;
  border-radius: 8px;
  background: var(--bg-secondary);
}

.detail-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  gap: 12px;
  font-size: 14px;
}

.detail-row .label {
  color: var(--text-secondary);
  min-width: 70px;
}

@media (max-width: 768px) {
  .filter-toolbar {
    flex-wrap: wrap;
  }
  
  .filter-stats {
    width: 100%;
    text-align: center;
    margin-top: 12px;
  }
  
  .screenshot-grid {
    grid-template-columns: 1fr;
  }
}
</style>
