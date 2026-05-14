<template>
  <div class="page strategy-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">AI检测配置</h1>
        <p class="page-subtitle">配置视频监控的AI检测模型和参数</p>
      </div>
      <button class="btn btn-success" @click="startStrategy">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        启动策略
      </button>
    </div>

    <!-- 已添加的视频AI配置列表 -->
    <div class="video-ai-settings">
      <div class="settings-header">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          AI检测配置
          <span class="settings-count">{{ strategyStore.strategies.length }}</span>
        </h3>
        <button class="btn btn-secondary btn-sm" @click="openAddVideoAIConfig">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          添加配置
        </button>
      </div>

      <!-- 全局配置区域 - 显示所有全局策略 -->
      <div v-if="globalStrategies.length > 0" class="config-section">
        <div class="config-section-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          全局配置
          <span class="section-tag">{{ globalStrategies.length }} 个</span>
        </div>
        <div class="video-ai-grid">
          <div v-for="strategy in globalStrategies" :key="strategy.id" class="config-card global">
            <div class="video-ai-header">
              <span class="video-name">全局配置 #{{ strategy.id }}</span>
              <div class="video-ai-actions-inline">
                <button class="btn-icon" title="编辑" @click="openEditVideoAIConfig('global', strategy)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button class="btn-icon danger" title="删除" @click="removeVideoAIConfig('global', strategy)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
            <div class="video-ai-form">
              <div class="form-group">
                <label>检测模型</label>
                <span class="config-value">{{ getYoloModelLabelByType(strategy.type) }}</span>
              </div>
              <div class="form-group">
                <label>检测目标</label>
                <div class="class-badges">
                  <span v-if="!strategy.selectIds || strategy.selectIds.length === 0 || strategy.selectIds.length === 80" class="class-badge all">所有类别</span>
                  <span v-else class="class-badge">{{ strategy.selectIds.length }} 个类别</span>
                </div>
              </div>
              <div class="form-group">
                <label>置信度阈值</label>
                <span class="config-value">{{ Math.round((strategy.objectThreshold || 0.5) * 100) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 各个视频流配置区域 -->
      <div v-if="streamStrategies.length > 0" class="config-section">
        <div class="config-section-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          视频流配置
          <span class="section-tag stream">{{ streamStrategies.length }} 个</span>
        </div>
        <div class="video-ai-grid">
          <div v-for="strategy in streamStrategies" :key="strategy.id" class="video-ai-card">
            <div class="video-ai-header">
              <span class="video-name">{{ getSourceName(strategy.streamId) }}</span>
              <div class="video-ai-actions-inline">
                <button class="btn-icon" title="编辑" @click="openEditVideoAIConfig(strategy.streamId, strategy)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button class="btn-icon danger" title="删除" @click="removeVideoAIConfig(strategy.streamId, strategy)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
            <div class="video-ai-form">
              <div class="form-group">
                <label>检测模型</label>
                <span class="config-value">{{ getYoloModelLabelByType(strategy.type) }}</span>
              </div>
              <div class="form-group">
                <label>检测目标</label>
                <div class="class-badges">
                  <span v-if="!strategy.selectIds || strategy.selectIds.length === 0 || strategy.selectIds.length === 80" class="class-badge all">所有类别</span>
                  <span v-else class="class-badge">{{ strategy.selectIds.length }} 个类别</span>
                </div>
              </div>
              <div class="form-group">
                <label>置信度阈值</label>
                <span class="config-value">{{ Math.round((strategy.objectThreshold || 0.5) * 100) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!strategyStore.strategies || strategyStore.strategies.length === 0" class="empty-config-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <h3 class="empty-title">暂无AI检测配置</h3>
        <p class="empty-desc">点击上方按钮添加配置，开始您的AI检测策略</p>
        <button class="btn btn-primary" @click="openAddVideoAIConfig">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          添加配置
        </button>
      </div>
    </div>
    
    <!-- 添加/编辑视频AI配置弹窗 -->
    <FormModal :show="showVideoAIConfigModal" :title="isEditingVideoAIConfig ? '编辑AI配置' : '添加AI配置'" @close="closeVideoAIConfigModal" modal-class="ai-config-modal">
      <div class="form-group">
        <label class="form-label">选择视频流 *</label>
        <select v-model="videoAIConfigForm.sourceId" class="select" :disabled="isEditingVideoAIConfig">
          <option value="">-- 选择视频流 --</option>
          <option value="global">全局 (所有视频流)</option>
          <option v-for="source in onlineSources" :key="source.id" :value="source.id">
            {{ source.name }}
          </option>
        </select>
        <span v-if="videoAIConfigForm.sourceId && videoAIConfigForm.sourceId !== 'global' && isSourceAlreadyConfigured" class="form-hint error">
          该视频流已配置AI模型
        </span>
      </div>
      <div class="form-group">
        <label class="form-label">AI模型 *</label>
        <select v-model="videoAIConfigForm.yoloModel" class="select">
          <option v-for="model in strategyStore.yoloModels" :key="model.value" :value="model.value">
            {{ model.label }}
          </option>
        </select>
      </div>
      <div class="form-group class-select-group">
        <label class="form-label">检测目标 (类别idx)</label>
        <div class="class-select-dropdown" :class="{ open: showClassDropdown }">
          <div class="class-select-trigger" @click="showClassDropdown = !showClassDropdown">
            <span v-if="videoAIConfigForm.yoloClass.length === 0" class="placeholder">选择类别...</span>
            <span v-else-if="videoAIConfigForm.yoloClass.length === 80" class="selected-text">所有类别 (80)</span>
            <span v-else class="selected-text">{{ videoAIConfigForm.yoloClass.length }} 个类别已选</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          <div v-if="showClassDropdown" class="class-select-dropdown-panel">
            <div class="class-select-actions">
              <label class="class-select-action">
                <input type="checkbox" :checked="videoAIConfigForm.yoloClass.length === 80" @change="toggleAllClasses">
                <span>全选/取消全选</span>
              </label>
            </div>
            <div class="class-select-grid">
              <label 
                v-for="cls in strategyStore.yoloClasses" 
                :key="cls.idx"
                class="class-option"
                :class="{ selected: videoAIConfigForm.yoloClass.includes(cls.idx) }"
              >
                <input 
                  type="checkbox" 
                  :checked="videoAIConfigForm.yoloClass.includes(cls.idx)"
                  @change="toggleClass(cls.idx)"
                >
                <span class="class-idx">{{ cls.idx }}</span>
                <span class="class-name">{{ cls.label }}</span>
              </label>
            </div>
          </div>
        </div>
        <div class="confidence-row">
          <label class="form-label-inline">置信度阈值</label>
          <div class="confidence-slider">
            <input 
              v-model.number="videoAIConfigForm.confidence" 
              type="range" 
              min="0.1" 
              max="0.95" 
              step="0.05" 
              class="slider"
            />
            <span class="confidence-value">{{ Math.round(videoAIConfigForm.confidence * 100) }}%</span>
          </div>
        </div>
        <span v-if="videoAIConfigForm.yoloClass.length > 0 && videoAIConfigForm.yoloClass.length < 80" class="form-hint">
          已选: [{{ videoAIConfigForm.yoloClass.join(', ') }}]
        </span>
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="closeVideoAIConfigModal">取消</button>
        <button 
          class="btn btn-primary" 
          @click="saveVideoAIConfigFromModal"
          :disabled="!videoAIConfigForm.sourceId || !videoAIConfigForm.yoloModel"
        >
          {{ isEditingVideoAIConfig ? '修改' : '添加' }}
        </button>
      </template>
    </FormModal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useStrategyStore } from '../stores/strategy'
import { useVideoStore } from '../stores/video'
import FormModal from '../components/common/FormModal.vue'

const strategyStore = useStrategyStore()
const videoStore = useVideoStore()

// 视频AI配置相关
const showVideoAIConfigModal = ref(false)
const isEditingVideoAIConfig = ref(false)
const editingVideoAIConfigId = ref(null)

const videoAIConfigForm = reactive({
  strategyId: null,
  sourceId: '',
  yoloModel: 'yolov8',
  yoloClass: [],
  confidence: 0.5
})

const defaultVideoAIConfigForm = {
  strategyId: null,
  sourceId: '',
  yoloModel: 'yolov8',
  yoloClass: [],
  confidence: 0.5
}

// 类别选择下拉
const showClassDropdown = ref(false)

const toggleClass = (idx) => {
  const index = videoAIConfigForm.yoloClass.indexOf(idx)
  if (index === -1) {
    videoAIConfigForm.yoloClass.push(idx)
  } else {
    videoAIConfigForm.yoloClass.splice(index, 1)
  }
}

const toggleAllClasses = () => {
  if (videoAIConfigForm.yoloClass.length === 80) {
    videoAIConfigForm.yoloClass = []
  } else {
    videoAIConfigForm.yoloClass = strategyStore.yoloClasses.map(c => c.idx)
  }
}

// 点击外部关闭下拉框
const closeClassDropdown = (e) => {
  if (!e.target.closest('.class-select-dropdown')) {
    showClassDropdown.value = false
  }
}

// 检查是否有已配置的AI配置
const hasVideoAIConfigs = computed(() => {
  return Object.keys(videoAIConfigs.value).length > 0
})

// 全局策略（streamId = -1 或 0）
const globalStrategies = computed(() => {
  if (!strategyStore.strategies || strategyStore.strategies.length === 0) return []
  return strategyStore.strategies.filter(s => s.streamId === -1 || s.streamId === 0)
})

// 视频流策略（streamId >= 1），按 streamId 排序
const streamStrategies = computed(() => {
  if (!strategyStore.strategies || strategyStore.strategies.length === 0) return []
  return strategyStore.strategies
    .filter(s => s.streamId >= 1)
    .sort((a, b) => a.streamId - b.streamId)
})

// 可用的视频源（未配置的）- 现在直接使用 onlineSources 在模板中，"global" 选项在模板中硬编码
// 此计算属性不再使用，保留以防其他地方引用
const availableSources = computed(() => {
  return videoStore.sources.filter(source => {
    // 编辑模式下可以编辑当前配置的源
    if (isEditingVideoAIConfig.value && editingVideoAIConfigId.value === source.id) {
      return true
    }
    return !videoAIConfigs.value[source.id]
  })
})

// 检查视频源是否已配置
const isSourceAlreadyConfigured = computed(() => {
  if (videoAIConfigForm.sourceId === 'global') {
    return !!videoAIConfigs.value['global']
  }
  return !!videoAIConfigs.value[videoAIConfigForm.sourceId]
})

// 在线视频源
const onlineSources = computed(() => {
  return videoStore.sources.filter(source => source.status === 'online')
})

// 获取视频源名称
const getSourceName = (sourceId) => {
  if (sourceId === 'global') return '全局配置'
  const source = videoStore.sources.find(s => s.id == sourceId)
  return source ? source.name : '未知视频'
}

// 启动策略
const startStrategy = async () => {
  if (!hasVideoAIConfigs.value) {
    alert('请先配置至少一个视频流的AI检测参数')
    return
  }
  try {
    const result = await strategyStore.startStrategyAPI()
    if (result.success) {
      alert('策略已启动！')
    } else {
      alert(result.message || '启动策略失败')
    }
  } catch (e) {
    console.error('启动策略失败:', e)
    alert('启动策略失败: ' + e.message)
  }
}

// 打开添加视频AI配置弹窗
const openAddVideoAIConfig = () => {
  isEditingVideoAIConfig.value = false
  editingVideoAIConfigId.value = null
  Object.assign(videoAIConfigForm, defaultVideoAIConfigForm)
  showVideoAIConfigModal.value = true
}

// 打开编辑视频AI配置弹窗
const openEditVideoAIConfig = (sourceId, strategy) => {
  isEditingVideoAIConfig.value = true
  editingVideoAIConfigId.value = sourceId
  console.log('[编辑] 打开编辑，sourceId:', sourceId, 'strategy:', strategy)
  // 如果传入了strategy对象（从策略列表编辑），使用strategy的数据
  if (strategy) {
    Object.assign(videoAIConfigForm, {
      strategyId: strategy.id,
      sourceId: sourceId === 'global' ? 'global' : String(strategy.streamId),
      yoloModel: strategyStore.typeModelMap ? (strategyStore.typeModelMap[strategy.type] || 'yolov8') : 'yolov8',
      yoloClass: strategy.selectIds && strategy.selectIds.length > 0 ? [...strategy.selectIds] : [],
      confidence: strategy.objectThreshold || 0.5
    })
    console.log('[编辑] 填充表单:', videoAIConfigForm)
  } else {
    const config = videoAIConfigs.value[sourceId]
    if (config) {
      Object.assign(videoAIConfigForm, {
        strategyId: null,
        sourceId: sourceId,
        yoloModel: config.yoloModel || 'yolov8',
        yoloClass: Array.isArray(config.yoloClass) ? [...config.yoloClass] : [],
        confidence: config.confidence || 0.5
      })
    }
  }
  showVideoAIConfigModal.value = true
}

// 关闭视频AI配置弹窗
const closeVideoAIConfigModal = () => {
  showVideoAIConfigModal.value = false
  isEditingVideoAIConfig.value = false
  editingVideoAIConfigId.value = null
}

// 保存视频AI配置（从弹窗）
const saveVideoAIConfigFromModal = async () => {
  if (!videoAIConfigForm.sourceId || !videoAIConfigForm.yoloModel) return
  
  const config = {
    sourceId: videoAIConfigForm.sourceId,
    yoloModel: videoAIConfigForm.yoloModel,
    yoloClass: videoAIConfigForm.yoloClass,
    confidence: videoAIConfigForm.confidence
  }
  
  let result = null
  
  console.log('[保存] 是否编辑模式:', isEditingVideoAIConfig.value, '策略ID:', videoAIConfigForm.strategyId)
  
  if (isEditingVideoAIConfig.value && videoAIConfigForm.strategyId) {
    // 编辑模式：调用修改策略 API
    console.log('[保存] 进入编辑模式，调用 changeStrategy')
    // changeStrategy(id, updates) 接受策略ID和更新数据
    const updates = {
      id: videoAIConfigForm.strategyId,
      streamId: videoAIConfigForm.sourceId === 'global' ? -1 : parseInt(videoAIConfigForm.sourceId),
      type: strategyStore.modelTypeMap ? (strategyStore.modelTypeMap[videoAIConfigForm.yoloModel] || 2) : 2,
      selectIds: videoAIConfigForm.yoloClass,
      objectThreshold: videoAIConfigForm.confidence
    }
    console.log('[保存] updates:', updates)
    result = await strategyStore.changeStrategy(videoAIConfigForm.strategyId, updates)
    console.log('[保存] 修改结果:', result)
  } else {
    // 添加模式：调用添加策略 API
    result = await strategyStore.addStrategyAPI(config)
  }
  
  if (result && result.success) {
    // 操作后重新获取配置列表
    await strategyStore.fetchStrategies()
    await strategyStore.fetchGlobalConfig()
    await strategyStore.fetchStreamConfigs()
    initVideoAIConfigs()
  }
  
  closeVideoAIConfigModal()
}

// 删除视频AI配置
const removeVideoAIConfig = async (sourceId, strategy) => {
  if (!confirm('确定要删除该视频流的AI配置吗？')) return
  
  try {
    // 调用后端删除 API
    if (strategy && strategy.id) {
      const result = await strategyStore.deleteStrategy(strategy.id)
      if (result.success) {
        console.log('[删除] 策略删除成功, ID:', strategy.id)
        // 重新获取策略列表
        await strategyStore.fetchStrategies()
        await strategyStore.fetchGlobalConfig()
        await strategyStore.fetchStreamConfigs()
        initVideoAIConfigs()
      } else {
        alert(result.message || '删除失败')
      }
    } else {
      // 如果没有 strategy id，只删除本地配置
      delete videoAIConfigs.value[sourceId]
      videoStore.removeVideoAIConfig(sourceId)
    }
  } catch (e) {
    console.error('删除配置失败:', e)
    alert('删除失败: ' + e.message)
  }
}

// 每路视频的AI配置
const videoAIConfigs = ref({})

// 初始化视频AI配置 - 优先使用后端数据，fallback到localStorage
const initVideoAIConfigs = () => {
  // 清空现有配置
  videoAIConfigs.value = {}
  
  // 优先使用从后端获取的配置（检查是否是有效配置）
  if (strategyStore.globalConfig && Object.keys(strategyStore.globalConfig).length > 0) {
    videoAIConfigs.value['global'] = strategyStore.globalConfig
  }
  if (strategyStore.streamConfigs && Object.keys(strategyStore.streamConfigs).length > 0) {
    for (const [sourceId, config] of Object.entries(strategyStore.streamConfigs)) {
      if (config && Object.keys(config).length > 0) {
        videoAIConfigs.value[sourceId] = config
      }
    }
  }
  // 如果后端没有数据，则使用本地存储
  if (Object.keys(videoAIConfigs.value).length === 0) {
    const savedConfigs = videoStore.loadVideoAIConfigs()
    videoAIConfigs.value = savedConfigs || {}
  }
}

// 保存单路视频的AI配置
const saveVideoAIConfig = async (sourceId) => {
  const config = videoAIConfigs.value[sourceId]
  if (config) {
    videoStore.updateVideoAIConfig(sourceId, config)
    // 调用后端 API 保存配置
    if (sourceId === 'global') {
      await strategyStore.saveGlobalConfig(config)
    } else {
      await strategyStore.saveStreamConfig(sourceId, config)
    }
  }
}

// 监听视频源变化，更新配置列表
watch(() => videoStore.sources, () => {
  initVideoAIConfigs()
}, { deep: true })

onMounted(async () => {
  // 获取视频源和策略配置
  await Promise.all([
    videoStore.fetchVideos(),
    strategyStore.initData()
  ])
  initVideoAIConfigs()
  document.addEventListener('click', closeClassDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeClassDropdown)
})

const getYoloModelLabel = (model) => {
  const found = strategyStore.yoloModels.find(m => m.value === model)
  return found ? found.label : 'YOLOv8'
}

// 根据类型数字获取模型标签
const getYoloModelLabelByType = (type) => {
  const typeNum = Number(type)
  const modelValue = strategyStore.typeModelMap ? strategyStore.typeModelMap[typeNum] : null
  if (modelValue) {
    return getYoloModelLabel(modelValue)
  }
  return getYoloModelLabel('yolov8')
}

const getYoloClassLabel = (cls) => {
  if (Array.isArray(cls)) {
    if (cls.length === 0) return '未选择'
    if (cls.length === 80) return '所有类别'
    return `[${cls.slice(0, 5).join(', ')}${cls.length > 5 ? '...' : ''}]`
  }
  if (cls === -1) return '所有类别'
  if (typeof cls === 'number') return `类别 ${cls}`
  return cls
}
</script>

<style scoped>
.strategy-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  padding: 20px 24px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.settings-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.settings-header h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #a855f7;
  margin: 0;
}

.settings-tag {
  padding: 2px 8px;
  background: rgba(168, 85, 247, 0.15);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #a855f7;
}

.settings-count {
  padding: 2px 8px;
  background: var(--accent-primary);
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  color: white;
}

.settings-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.settings-header .settings-tip {
  flex: 1;
  margin: 0;
}

.settings-header .btn {
  margin-left: auto;
}

.settings-tip {
  font-size: 12px;
  color: var(--text-secondary);
}

.settings-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.setting-item label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.setting-item .select {
  padding: 6px 10px;
  font-size: 13px;
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
}

/* 视频源AI配置样式 */
.video-ai-settings {
  margin-bottom: 24px;
  padding: 20px 24px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.video-ai-settings .settings-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.video-ai-settings .settings-header h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--accent-primary);
  margin: 0;
}

.video-ai-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.video-ai-card {
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  transition: all 0.2s;
}

.video-ai-card:hover {
  border-color: var(--accent-primary);
}

.video-ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.video-name {
  font-size: 14px;
  font-weight: 600;
}

.video-ai-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.video-ai-form .form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.video-ai-form .form-group label {
  font-size: 11px;
  color: var(--text-secondary);
}

.video-ai-form .select {
  padding: 6px 10px;
  font-size: 13px;
}

.confidence-slider.small .slider {
  height: 4px;
}

.confidence-slider.small .slider::-webkit-slider-thumb {
  width: 12px;
  height: 12px;
}

.confidence-slider.small .confidence-value {
  font-size: 12px;
  min-width: 38px;
}

.config-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.empty-tip {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.status-online {
  background: var(--success);
}

.status-dot.status-offline {
  background: var(--danger);
}

.strategy-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
}

.strategy-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s;
}

.strategy-card:hover {
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.strategy-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.strategy-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.strategy-icon svg {
  width: 22px;
  height: 22px;
}

.strategy-icon.type-motion {
  background: rgba(59, 130, 246, 0.15);
  color: var(--accent-primary);
}

.strategy-icon.type-intrusion {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
}

.strategy-icon.type-offline {
  background: rgba(245, 158, 11, 0.15);
  color: var(--warning);
}

.strategy-icon.type-cover {
  background: rgba(6, 182, 212, 0.15);
  color: var(--accent-secondary);
}

.strategy-icon.type-yolo {
  background: rgba(168, 85, 247, 0.15);
  color: #a855f7;
}

.strategy-info {
  flex: 1;
  min-width: 0;
}

.strategy-name {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 6px;
}

.strategy-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.schedule-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.strategy-body {
  padding: 16px;
}

.strategy-params {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.param-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.param-label {
  width: 80px;
  font-size: 13px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.sensitivity-bar {
  flex: 1;
  height: 6px;
  background: var(--bg-secondary);
  border-radius: 3px;
  overflow: hidden;
}

.sensitivity-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.sensitivity-fill.low { background: var(--success); }
.sensitivity-fill.medium { background: var(--warning); }
.sensitivity-fill.high { background: var(--danger); }

.param-value {
  font-size: 13px;
  font-weight: 500;
  min-width: 40px;
}

.strategy-footer {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  background: var(--bg-secondary);
}

.strategy-footer .btn {
  flex: 1;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.camera-select {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.camera-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.camera-option:hover {
  border-color: var(--accent-primary);
}

.camera-option input {
  width: 16px;
  height: 16px;
  accent-color: var(--accent-primary);
}

.camera-option span {
  font-size: 13px;
}

.form-section {
  margin-top: 16px;
  padding: 16px;
  background: rgba(168, 85, 247, 0.05);
  border: 1px solid rgba(168, 85, 247, 0.2);
  border-radius: 8px;
}

.form-section > .form-label {
  display: block;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #a855f7;
}

.confidence-slider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
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

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .strategy-list {
    grid-template-columns: 1fr;
  }
}

/* 视频AI配置 - 初始空状态 */
.empty-config-container {
  padding: 40px 20px;
}

.empty-config-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: var(--bg-secondary);
  border: 2px dashed var(--border);
  border-radius: 12px;
  text-align: center;
  transition: all 0.3s;
}

.empty-config-box:hover {
  border-color: var(--accent-primary);
  background: rgba(59, 130, 246, 0.05);
}

.empty-config-box svg {
  color: var(--text-secondary);
  opacity: 0.5;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.empty-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 20px 0;
}

.video-ai-content {
  margin-bottom: 16px;
}

.video-ai-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.video-ai-actions-inline {
  display: flex;
  gap: 4px;
}

.btn-icon {
  width: 28px;
  height: 28px;
  padding: 4px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--bg-secondary);
  color: var(--accent-primary);
  border-color: var(--accent-primary);
}

.btn-icon.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
  border-color: var(--danger);
}

.global-config-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: rgba(59, 130, 246, 0.08);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.global-config-tip svg {
  flex-shrink: 0;
  color: var(--accent-primary);
}

.global-config-tip a {
  color: var(--accent-primary);
  text-decoration: none;
  font-weight: 500;
}

.global-config-tip a:hover {
  text-decoration: underline;
}

/* 表单提示 */
.form-hint {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.form-hint.error {
  color: var(--danger);
}

/* 模型选择网格 */
.model-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  margin-top: 8px;
}

.model-option {
  cursor: pointer;
}

.model-option input {
  display: none;
}

.model-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 10px;
  background: var(--bg-secondary);
  border: 2px solid var(--border);
  border-radius: 8px;
  transition: all 0.2s;
  text-align: center;
}

.model-card svg {
  color: var(--text-secondary);
}

.model-card span {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.model-card small {
  font-size: 10px;
  color: var(--text-secondary);
}

.model-option:hover .model-card {
  border-color: var(--accent-primary);
  background: rgba(59, 130, 246, 0.05);
}

.model-option.selected .model-card {
  border-color: var(--accent-primary);
  background: rgba(59, 130, 246, 0.1);
}

.model-option.selected .model-card svg {
  color: var(--accent-primary);
}

/* 数字输入框 */
.input-number {
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-primary);
  width: 100%;
  outline: none;
  transition: border-color 0.2s;
}

.input-number:focus {
  border-color: var(--accent-primary);
}

.input-number.small {
  padding: 6px 10px;
  font-size: 13px;
}

.input-number::placeholder {
  color: var(--text-secondary);
  font-size: 12px;
}

/* AI配置弹窗样式 */
:deep(.ai-config-modal) {
  max-width: 650px;
  width: 90vw;
}

:deep(.ai-config-modal .modal-body) {
  max-height: 70vh;
  overflow-y: auto;
}

.class-select-group {
  min-height: 460px;
}

.confidence-row {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.form-label-inline {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

/* 类别选择下拉框 */
.class-select-dropdown {
  position: relative;
  width: 100%;
}

.class-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.class-select-trigger:hover {
  border-color: var(--accent-primary);
}

.class-select-dropdown.open .class-select-trigger {
  border-color: var(--accent-primary);
}

.class-select-trigger .placeholder {
  color: var(--text-secondary);
  font-size: 13px;
}

.class-select-trigger .selected-text {
  font-size: 13px;
  color: var(--text-primary);
}

.class-select-trigger svg {
  color: var(--text-secondary);
  transition: transform 0.2s;
}

.class-select-dropdown.open .class-select-trigger svg {
  transform: rotate(180deg);
}

.class-select-dropdown-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  min-height: 420px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  z-index: 100;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.class-select-actions {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.class-select-action {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
}

.class-select-action input {
  accent-color: var(--accent-primary);
}

.class-select-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2px;
  padding: 8px;
  overflow-y: auto;
  flex: 1;
}

.class-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 13px;
}

.class-option:hover {
  background: var(--bg-secondary);
}

.class-option.selected {
  background: rgba(59, 130, 246, 0.1);
}

.class-option input {
  accent-color: var(--accent-primary);
  width: 14px;
  height: 14px;
}

.class-option .class-idx {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent-primary);
  min-width: 24px;
}

.class-option .class-name {
  font-size: 12px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 类别徽章 */
.class-badges {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.class-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  background: rgba(59, 130, 246, 0.15);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--accent-primary);
}

.class-badge.all {
  background: rgba(34, 197, 94, 0.15);
  color: var(--success);
}

.class-badge.empty {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.class-idx-list {
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-secondary);
  word-break: break-all;
}

/* 配置分区样式 */
.config-section {
  margin-bottom: 24px;
}

.config-section:last-child {
  margin-bottom: 0;
}

.config-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.config-section-header svg {
  color: var(--text-secondary);
}

.section-tag {
  padding: 2px 8px;
  background: rgba(168, 85, 247, 0.15);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #a855f7;
}

.section-tag.stream {
  background: rgba(59, 130, 246, 0.15);
  color: var(--accent-primary);
}

.config-card.global {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(168, 85, 247, 0.02));
  border: 1px solid rgba(168, 85, 247, 0.15);
}

.config-card.global .video-name {
  color: #a855f7;
}

.config-card.global:hover {
  border-color: rgba(168, 85, 247, 0.3);
}
</style>
