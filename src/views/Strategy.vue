<template>
  <div class="page strategy-page">
    <div class="page-header flex justify-between items-center">
      <div>
        <h1 class="page-title">策略配置</h1>
        <p class="page-subtitle">配置视频监控策略和规则</p>
      </div>
      <button class="btn btn-primary" @click="openAddModal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        添加策略
      </button>
    </div>
    
    <!-- 统计概览 -->
    <div class="strategy-stats">
      <div class="stat-item">
        <span class="stat-value">{{ strategyStore.totalCount }}</span>
        <span class="stat-label">总策略数</span>
      </div>
      <div class="stat-item">
        <span class="stat-value text-success">{{ strategyStore.enabledCount }}</span>
        <span class="stat-label">已启用</span>
      </div>
      <div class="stat-item">
        <span class="stat-value text-secondary">{{ strategyStore.totalCount - strategyStore.enabledCount }}</span>
        <span class="stat-label">已禁用</span>
      </div>
    </div>

    <!-- 全局AI检测设置 -->
    <div class="global-ai-settings">
      <div class="settings-header">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          全局AI检测设置
        </h3>
        <span class="settings-tip">适用于所有AI目标检测策略的默认值</span>
      </div>
      <div class="settings-row">
        <div class="setting-item">
          <label>默认检测模型</label>
          <select v-model="globalSettings.defaultModel" class="select" @change="updateGlobalSettings">
            <option v-for="model in strategyStore.yoloModels" :key="model.value" :value="model.value">
              {{ model.label }}
            </option>
          </select>
        </div>
        <div class="setting-item">
          <label>默认置信度</label>
          <div class="confidence-slider">
            <input 
              v-model.number="globalSettings.confidence" 
              type="range" 
              min="0.1" 
              max="0.95" 
              step="0.05" 
              class="slider"
            />
            <span class="confidence-value">{{ Math.round(globalSettings.confidence * 100) }}%</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 策略列表 -->
    <div class="strategy-list">
      <div v-for="strategy in strategyStore.strategies" :key="strategy.id" class="strategy-card">
        <div class="strategy-header">
          <div class="strategy-icon" :class="`type-${strategy.type}`">
            <svg v-if="strategy.type === 'motion'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <svg v-else-if="strategy.type === 'intrusion'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            <svg v-else-if="strategy.type === 'offline'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="1" y1="1" x2="23" y2="23"/>
              <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34"/>
            </svg>
            <svg v-else-if="strategy.type === 'yolo'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
            </svg>
          </div>
          <div class="strategy-info">
            <h3 class="strategy-name">{{ strategy.name }}</h3>
            <div class="strategy-meta">
              <span class="badge" :class="typeBadge(strategy.type)">{{ strategyStore.typeLabels[strategy.type] }}</span>
              <span class="schedule-tag">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                {{ strategy.schedule }}
              </span>
            </div>
          </div>
          <div 
            class="switch" 
            :class="{ active: strategy.enabled }"
            @click="strategyStore.toggleStrategy(strategy.id)"
          ></div>
        </div>
        
        <div class="strategy-body">
          <div class="strategy-params">
            <!-- AI目标检测策略配置 -->
            <template v-if="strategy.type === 'yolo'">
              <div class="param-item">
                <span class="param-label">检测模型</span>
                <span class="param-value">{{ getYoloModelLabel(strategy.yoloModel) }}</span>
              </div>
              <div class="param-item">
                <span class="param-label">检测目标</span>
                <span class="param-value">{{ getYoloClassLabel(strategy.yoloClass) }}</span>
              </div>
              <div class="param-item">
                <span class="param-label">置信度</span>
                <div class="sensitivity-bar">
                  <div class="sensitivity-fill medium" :style="{ width: (strategy.confidence || 0.5) * 100 + '%' }"></div>
                </div>
                <span class="param-value">{{ Math.round((strategy.confidence || 0.5) * 100) }}%</span>
              </div>
              <div class="param-item">
                <span class="param-label">关联摄像头</span>
                <span class="param-value">{{ strategy.cameraIds.length }} 个</span>
              </div>
            </template>
            <!-- 其他策略配置 -->
            <template v-else>
              <div class="param-item">
                <span class="param-label">敏感度</span>
                <div class="sensitivity-bar">
                  <div class="sensitivity-fill" :class="strategy.sensitivity" :style="{ width: sensitivityWidth(strategy.sensitivity) }"></div>
                </div>
                <span class="param-value">{{ sensitivityLabel(strategy.sensitivity) }}</span>
              </div>
              <div class="param-item">
                <span class="param-label">预警级别</span>
                <span class="badge" :class="levelBadge(strategy.level)">{{ levelLabel(strategy.level) }}</span>
              </div>
              <div class="param-item">
                <span class="param-label">关联摄像头</span>
                <span class="param-value">{{ strategy.cameraIds.length }} 个</span>
              </div>
            </template>
          </div>
        </div>
        
        <div class="strategy-footer">
          <button class="btn btn-secondary btn-sm" @click="openEditModal(strategy)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            编辑
          </button>
          <button class="btn btn-danger btn-sm" @click="handleDelete(strategy.id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            删除
          </button>
        </div>
      </div>
    </div>
    
    <!-- 添加/编辑策略弹窗 -->
    <FormModal :show="showModal" :title="isEditing ? '编辑策略' : '添加策略'" @close="closeModal">
      <div class="form-group">
        <label class="form-label">策略名称 *</label>
        <input v-model="formData.name" type="text" class="input" placeholder="例如: 入口大门移动侦测" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">策略类型 *</label>
          <select v-model="formData.type" class="select">
            <option v-for="type in strategyStore.strategyTypes" :key="type" :value="type">
              {{ strategyStore.typeLabels[type] }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">执行时段</label>
          <select v-model="formData.schedule" class="select">
            <option v-for="opt in strategyStore.scheduleOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- AI目标检测策略特殊配置 -->
      <div v-if="formData.type === 'yolo'" class="form-section">
        <div class="form-label">AI模型配置</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">检测模型</label>
            <select v-model="formData.yoloModel" class="select">
              <option v-for="model in strategyStore.yoloModels" :key="model.value" :value="model.value">
                {{ model.label }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">检测目标</label>
            <select v-model="formData.yoloClass" class="select">
              <option v-for="cls in strategyStore.yoloClasses" :key="cls.value" :value="cls.value">
                {{ cls.label }}
              </option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">置信度阈值</label>
            <div class="confidence-slider">
              <input 
                v-model.number="formData.confidence" 
                type="range" 
                min="0.1" 
                max="0.95" 
                step="0.05" 
                class="slider"
              />
              <span class="confidence-value">{{ Math.round(formData.confidence * 100) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 其他策略配置 -->
      <div v-if="formData.type !== 'yolo'" class="form-row">
        <div class="form-group">
          <label class="form-label">敏感度</label>
          <select v-model="formData.sensitivity" class="select">
            <option v-for="opt in strategyStore.sensitivityOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">预警级别</label>
          <select v-model="formData.level" class="select">
            <option v-for="opt in strategyStore.levelOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">关联摄像头</label>
        <div class="camera-select">
          <label v-for="source in videoStore.sources" :key="source.id" class="camera-option">
            <input type="checkbox" :value="source.id" v-model="formData.cameraIds" />
            <span>{{ source.name }}</span>
          </label>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="closeModal">取消</button>
        <button class="btn btn-primary" @click="handleSave">{{ isEditing ? '保存' : '添加' }}</button>
      </template>
    </FormModal>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useStrategyStore } from '../stores/strategy'
import { useVideoStore } from '../stores/video'
import FormModal from '../components/common/FormModal.vue'

const strategyStore = useStrategyStore()
const videoStore = useVideoStore()

const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref(null)

// 全局AI检测设置
const globalSettings = reactive({
  defaultModel: strategyStore.globalAISettings.defaultModel,
  confidence: strategyStore.globalAISettings.confidence
})

const updateGlobalSettings = () => {
  strategyStore.updateGlobalAISettings({ ...globalSettings })
}

const defaultFormData = {
  name: '',
  type: 'motion',
  cameraIds: [],
  enabled: true,
  sensitivity: 'medium',
  level: 'warning',
  schedule: '全天',
  region: null,
  yoloModel: 'yolov8',
  yoloClass: 'all',
  confidence: 0.5
}

const formData = reactive({ ...defaultFormData })

const openAddModal = () => {
  isEditing.value = false
  Object.assign(formData, defaultFormData)
  showModal.value = true
}

const openEditModal = (strategy) => {
  isEditing.value = true
  editingId.value = strategy.id
  Object.assign(formData, {
    name: strategy.name,
    type: strategy.type,
    cameraIds: [...strategy.cameraIds],
    enabled: strategy.enabled,
    sensitivity: strategy.sensitivity || 'medium',
    level: strategy.level || 'warning',
    schedule: strategy.schedule || '全天',
    region: strategy.region,
    yoloModel: strategy.yoloModel || 'yolov8',
    yoloClass: strategy.yoloClass || 'all',
    confidence: strategy.confidence || 0.5
  })
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  isEditing.value = false
  editingId.value = null
}

const handleSave = () => {
  if (!formData.name.trim()) return
  
  if (isEditing.value) {
    strategyStore.updateStrategy(editingId.value, { ...formData })
  } else {
    strategyStore.addStrategy({ ...formData })
  }
  closeModal()
}

const handleDelete = (id) => {
  if (confirm('确定要删除这个策略吗？')) {
    strategyStore.removeStrategy(id)
  }
}

const typeBadge = (type) => {
  const map = {
    motion: 'badge-info',
    intrusion: 'badge-danger',
    offline: 'badge-warning',
    cover: 'badge-secondary',
    yolo: 'badge-danger'
  }
  return map[type] || 'badge-info'
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

const sensitivityWidth = (sensitivity) => {
  const map = { low: '33%', medium: '66%', high: '100%' }
  return map[sensitivity] || '50%'
}

const sensitivityLabel = (sensitivity) => {
  const map = { low: '低', medium: '中', high: '高' }
  return map[sensitivity] || sensitivity
}

const getYoloModelLabel = (model) => {
  const found = strategyStore.yoloModels.find(m => m.value === model)
  return found ? found.label : 'YOLOv8'
}

const getYoloClassLabel = (cls) => {
  const found = strategyStore.yoloClasses.find(c => c.value === cls)
  return found ? found.label : '所有目标'
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

.global-ai-settings {
  margin-bottom: 24px;
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(168, 85, 247, 0.02));
  border: 1px solid rgba(168, 85, 247, 0.2);
  border-radius: 12px;
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
</style>
