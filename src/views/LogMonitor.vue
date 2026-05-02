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
        <span v-if="logData.length" class="data-info">
          共 {{ logData.length }} 条记录
        </span>
      </div>
    </div>
    
    <!-- 筛选工具栏 -->
    <div v-if="logData.length" class="filter-toolbar">
      <div class="filter-group">
        <input 
          v-model="searchText" 
          type="text" 
          class="input" 
          placeholder="搜索日志内容..."
          style="width: 240px;"
        />
      </div>
      <div class="filter-group">
        <label>日志级别:</label>
        <select v-model="filterLevel" class="select filter-select">
          <option value="">全部</option>
          <option value="INFO">INFO</option>
          <option value="WARN">WARN</option>
          <option value="ERROR">ERROR</option>
        </select>
      </div>
      <div class="filter-group">
        <label>时间范围:</label>
        <input v-model="filterDate" type="date" class="input" style="width: 150px;" />
      </div>
      <button class="btn btn-secondary btn-sm" @click="resetFilters">重置</button>
    </div>
    
    <!-- 日志表格 -->
    <div v-if="logData.length" class="log-table-wrapper">
      <table class="log-table">
        <thead>
          <tr>
            <th style="width: 180px;">时间</th>
            <th style="width: 100px;">级别</th>
            <th style="width: 120px;">来源</th>
            <th>日志内容</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(log, index) in paginatedLogs" :key="index">
            <td class="log-time">{{ log.时间 || log.time || log.timestamp || '' }}</td>
            <td>
              <span class="log-level" :class="getLevelClass(log.级别 || log.level || 'INFO')">
                {{ log.级别 || log.level || 'INFO' }}
              </span>
            </td>
            <td class="log-source">{{ log.来源 || log.source || '-' }}</td>
            <td class="log-message">{{ log.日志内容 || log.message || log.content || '' }}</td>
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
    
    <!-- 分页 -->
    <div v-if="filteredLogs.length > pageSize" class="pagination">
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
import { ref, computed } from 'vue'

const fileInput = ref(null)
const logData = ref([])
const searchText = ref('')
const filterLevel = ref('')
const filterDate = ref('')
const currentPage = ref(1)
const pageSize = 20

const filteredLogs = computed(() => {
  let result = logData.value
  
  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    result = result.filter(log => {
      const message = (log.日志内容 || log.message || log.content || '').toLowerCase()
      const source = (log.来源 || log.source || '').toLowerCase()
      return message.includes(search) || source.includes(search)
    })
  }
  
  if (filterLevel.value) {
    result = result.filter(log => {
      const level = (log.级别 || log.level || '').toUpperCase()
      return level === filterLevel.value
    })
  }
  
  if (filterDate.value) {
    result = result.filter(log => {
      const time = log.时间 || log.time || log.timestamp || ''
      return time.includes(filterDate.value)
    })
  }
  
  return result
})

const totalPages = computed(() => Math.ceil(filteredLogs.value.length / pageSize))

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredLogs.value.slice(start, start + pageSize)
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

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    // 使用 fetch API 读取文件
    const response = await fetch('http://localhost:5173/src/utils/readExcel.js', {
      method: 'POST',
      body: formData
    }).catch(() => null)
    
    // 使用 SheetJS (xlsx) 直接在前端解析
    const XLSX = window.XLSX
    if (!XLSX) {
      // 动态加载 SheetJS
      await loadSheetJS()
    }
    
    const data = await parseExcelFile(file)
    logData.value = data
    currentPage.value = 1
  } catch (error) {
    console.error('读取文件失败:', error)
    alert('文件读取失败，请确保文件格式正确')
  }
  
  event.target.value = ''
}

const loadSheetJS = () => {
  return new Promise((resolve, reject) => {
    if (window.XLSX) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
        resolve(jsonData)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

const clearData = () => {
  if (confirm('确定要清空当前日志数据吗？')) {
    logData.value = []
    searchText.value = ''
    filterLevel.value = ''
    filterDate.value = ''
    currentPage.value = 1
  }
}

const resetFilters = () => {
  searchText.value = ''
  filterLevel.value = ''
  filterDate.value = ''
  currentPage.value = 1
}

const getLevelClass = (level) => {
  const upperLevel = level.toUpperCase()
  if (upperLevel === 'ERROR') return 'level-error'
  if (upperLevel === 'WARN' || upperLevel === 'WARNING') return 'level-warn'
  return 'level-info'
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
