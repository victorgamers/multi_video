<template>
  <div class="page log-monitor">
    <div class="page-header">
      <h1 class="page-title">日志监控</h1>
      <p class="page-subtitle">查看和管理系统运行日志</p>
    </div>
    
    <!-- 操作栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <button class="btn btn-primary" @click="triggerFileInput">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          导入 Excel
        </button>
        <input 
          ref="fileInput" 
          type="file" 
          accept=".xlsx,.xls" 
          style="display: none"
          @change="handleFileUpload"
        />
        <button 
          v-if="logData.length" 
          class="btn btn-secondary" 
          @click="clearData"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          清空数据
        </button>
      </div>
      <div class="toolbar-right">
        <!-- Sheet 选择器 -->
        <div v-if="sheetNames.length > 1" class="sheet-selector">
          <label>选择 Sheet:</label>
          <select v-model="selectedSheet" class="filter-select" @change="changeSheet">
            <option v-for="sheet in sheetNames" :key="sheet" :value="sheet">
              {{ sheet }}
            </option>
          </select>
        </div>
        <span v-if="logData.length" class="data-info">
          共 {{ logData.length }} 条记录
        </span>
      </div>
    </div>
    
    <!-- 数据表格 -->
    <div v-if="logData.length" class="log-table-wrapper">
      <table class="log-table">
        <thead>
          <tr>
            <th v-for="col in columns" :key="col">{{ col }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in logData" :key="index">
            <td v-for="col in columns" :key="col">{{ getCellValue(row, col) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
      <h4>暂无日志数据</h4>
      <p>点击"导入 Excel"按钮上传日志文件</p>
      <p class="text-sm" style="margin-top: 8px; color: var(--text-secondary);">
        支持 .xlsx 和 .xls 格式
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const fileInput = ref(null)
const logData = ref([])
const XLSX = ref(null)
const workbook = ref(null)
const sheetNames = ref([])
const selectedSheet = ref('')

// 获取表格列名
const columns = computed(() => {
  if (logData.value.length === 0) return []
  return Object.keys(logData.value[0])
})

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  try {
    // 加载 SheetJS
    if (!XLSX.value) {
      await loadSheetJS()
    }
    
    const data = await parseExcelFile(file)
    logData.value = data
  } catch (error) {
    console.error('读取文件失败:', error)
    alert('文件读取失败: ' + error.message)
  }
  
  event.target.value = ''
}

const loadSheetJS = () => {
  return new Promise((resolve, reject) => {
    if (window.XLSX) {
      XLSX.value = window.XLSX
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
    script.onload = () => {
      XLSX.value = window.XLSX
      resolve()
    }
    script.onerror = () => reject(new Error('加载 SheetJS 失败'))
    document.head.appendChild(script)
  })
}

const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    if (!XLSX.value) {
      reject(new Error('SheetJS 未加载'))
      return
    }
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const wb = XLSX.value.read(data, { type: 'array', cellDates: true })
        workbook.value = wb
        sheetNames.value = wb.SheetNames
        selectedSheet.value = wb.SheetNames[0]
        
        const worksheet = wb.Sheets[wb.SheetNames[0]]
        const jsonData = XLSX.value.utils.sheet_to_json(worksheet, { defval: '' })
        resolve(jsonData)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// 切换 Sheet
const changeSheet = () => {
  if (!workbook.value || !selectedSheet.value) return
  const worksheet = workbook.value.Sheets[selectedSheet.value]
  logData.value = XLSX.value.utils.sheet_to_json(worksheet, { defval: '' })
}

const clearData = () => {
  if (confirm('确定要清空数据吗？')) {
    logData.value = []
    workbook.value = null
    sheetNames.value = []
    selectedSheet.value = ''
  }
}

// 获取单元格值
const getCellValue = (row, col) => {
  const value = row[col]
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    if (value instanceof Date) return value.toLocaleString()
    return JSON.stringify(value)
  }
  return String(value)
}
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.toolbar-left {
  display: flex;
  gap: 12px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.sheet-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sheet-selector label {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.sheet-selector select {
  min-width: 120px;
}

.data-info {
  font-size: 14px;
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', monospace;
}

.filter-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-group label {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.filter-select {
  width: 120px;
  padding: 6px 12px;
  font-size: 13px;
}

.log-table-wrapper {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.log-table {
  width: 100%;
  border-collapse: collapse;
}

.log-table th,
.log-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.log-table th {
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  background: var(--bg-secondary);
}

.log-table tbody tr:hover {
  background: var(--bg-hover);
}

.log-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--text-secondary);
}

.log-level {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
}

.level-info {
  background: rgba(59, 130, 246, 0.15);
  color: var(--accent-primary);
}

.level-warn {
  background: rgba(245, 158, 11, 0.15);
  color: var(--warning);
}

.level-error {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
}

.log-source {
  font-size: 13px;
  color: var(--text-secondary);
}

.log-message {
  font-size: 14px;
  word-break: break-all;
}

.empty-state {
  padding: 80px 20px;
}

@media (max-width: 1024px) {
  .filter-toolbar {
    flex-wrap: wrap;
  }
  
  .log-table-wrapper {
    overflow-x: auto;
  }
  
  .log-table {
    min-width: 800px;
  }
}

@media (max-width: 640px) {
  .toolbar {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .toolbar-left {
    justify-content: center;
  }
}
</style>
