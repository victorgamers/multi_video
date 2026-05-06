<template>
  <div class="page ai-chat-page">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">AI 对话</h1>
        <p class="page-subtitle">RK3588 终端 - 192.168.0.101:5000</p>
      </div>
      <div class="header-right">
        <div class="model-selector">
          <select v-model="selectedModel" class="model-select" :disabled="chatStore.runningModel">
            <option value="">选择本地模型</option>
            <option value="DeepSeek-R1">DeepSeek-R1</option>
            <option value="DeepSeek-R1-Distill-Qwen-7B">DeepSeek-R1-Distill-Qwen-7B</option>
            <option value="Tiny-1.1B">Tiny-1.1B</option>
          </select>
          <button 
            class="btn btn-success" 
            @click="startModel"
            :disabled="!selectedModel || chatStore.runningModel"
          >
            启动
          </button>
          <button 
            class="btn btn-danger" 
            @click="stopModel"
            :disabled="!chatStore.runningModel"
          >
            停止
          </button>
        </div>
        <div class="connection-status" :class="{ connected: chatStore.wsConnected }">
          <span class="status-dot"></span>
          {{ chatStore.wsConnected ? '已连接' : '未连接' }}
        </div>
        <div v-if="chatStore.clientId" class="client-id">
          Client: {{ chatStore.clientId.slice(0, 8) }}...
        </div>
      </div>
    </div>
    
    <div class="chat-container">
      <!-- 侧边栏：对话列表 -->
      <aside class="chat-sidebar">
        <div class="sidebar-header">
          <button class="btn btn-primary" @click="createNewChat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            新对话
          </button>
        </div>
        
        <div class="conversation-list">
          <div 
            v-for="conv in chatStore.conversationList" 
            :key="conv.id"
            class="conversation-item"
            :class="{ active: conv.id === chatStore.currentConversationId }"
            @click="chatStore.selectConversation(conv.id)"
          >
            <div class="conv-content">
              <span class="conv-title">{{ conv.title }}</span>
              <span class="conv-meta">{{ conv.messageCount }} 条消息</span>
            </div>
            <button class="conv-delete" @click.stop="chatStore.deleteConversation(conv.id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
          
          <div v-if="!chatStore.conversationList.length" class="empty-conversations">
            <p>暂无对话记录</p>
          </div>
        </div>
      </aside>
      
      <!-- 主聊天区域 -->
      <main class="chat-main">
        <div v-if="chatStore.currentConversation" class="messages-container" ref="messagesContainer">
          <div 
            v-for="msg in chatStore.currentConversation.messages" 
            :key="msg.id"
            class="message"
            :class="msg.role"
          >
            <div class="message-avatar">
              <div v-if="msg.role === 'user'" class="avatar user-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div v-else class="avatar ai-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m9 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3"/>
                </svg>
              </div>
            </div>
            <div class="message-content">
              <div class="message-text" v-html="formatMessage(msg.content)"></div>
              <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
            </div>
          </div>
          
          <div v-if="chatStore.isLoading" class="message assistant loading">
            <div class="message-avatar">
              <div class="avatar ai-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m9 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3"/>
                </svg>
              </div>
            </div>
            <div class="message-content">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="empty-chat">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h3>开始新对话</h3>
          <p>点击左侧「新对话」开始与 AI 交流</p>
        </div>
        
        <!-- 输入区域 -->
        <div class="chat-input-area">
          <div class="chat-input-container">
            <textarea 
              v-model="inputMessage"
              @keydown.enter.exact.prevent="handleSend"
              placeholder="输入消息... (Enter 发送)"
              rows="1"
            ></textarea>
            <button 
              class="send-btn" 
              @click="handleSend"
              :disabled="!inputMessage.trim() || chatStore.isLoading"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <div class="input-hint">
            按 Enter 发送，Shift + Enter 换行
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import { useChatStore } from '../stores/chat'

const chatStore = useChatStore()

const inputMessage = ref('')
const messagesContainer = ref(null)
const selectedModel = ref('')

// 监听运行中的模型，同步下拉框显示
watch(() => chatStore.runningModel, (newModel) => {
  selectedModel.value = newModel || ''
})

// 启动模型
const startModel = () => {
  if (selectedModel.value) {
    chatStore.startModel(selectedModel.value)
  }
}

// 停止模型
const stopModel = () => {
  chatStore.stopModel()
}

// 初始化时连接 WebSocket 并创建默认对话
onMounted(() => {
  // 如果没有对话，自动创建一个
  if (!chatStore.currentConversationId) {
    chatStore.createConversation()
  }
  
  // 查询当前运行的模型
  chatStore.fetchCurrentModel()
  
  chatStore.connectWebSocket().catch(err => {
    console.error('WebSocket 连接失败:', err)
  })
})

const createNewChat = () => {
  chatStore.createConversation()
}

const handleSend = async () => {
  if (!inputMessage.value.trim() || chatStore.isLoading) return
  
  const message = inputMessage.value.trim()
  inputMessage.value = ''
  
  await chatStore.sendMessage(message)
  
  nextTick(() => {
    scrollToBottom()
  })
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const formatMessage = (content) => {
  if (!content) return ''
  // 简单的代码高亮
  return content
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}

// 监听对话变化，自动滚动
watch(() => chatStore.currentConversation?.messages.length, () => {
  nextTick(() => scrollToBottom())
})

// 监听滚动触发器，流式输出时自动滚动到底部
watch(() => chatStore.scrollTrigger, () => {
  nextTick(() => scrollToBottom())
})
</script>

<style scoped>
.ai-chat-page {
  height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.header-left {
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.model-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-select {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  cursor: pointer;
}

.model-select:focus {
  border-color: var(--accent-primary);
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 6px 12px;
  border-radius: 20px;
}

.connection-status.connected {
  color: #22c55e;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-secondary);
}

.connection-status.connected .status-dot {
  background: #22c55e;
  box-shadow: 0 0 6px #22c55e;
}

.client-id {
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 4px 10px;
  border-radius: 12px;
  font-family: 'JetBrains Mono', monospace;
}

.server-info {
  background: var(--bg-tertiary);
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.server-url {
  font-family: 'JetBrains Mono', monospace;
  color: var(--accent-primary);
  font-size: 13px;
}

.chat-container {
  flex: 1;
  display: flex;
  gap: 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  min-height: 0;
}

/* 侧边栏 */
.chat-sidebar {
  width: 280px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.sidebar-header .btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.sidebar-header .btn svg {
  width: 18px;
  height: 18px;
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.conversation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 4px;
}

.conversation-item:hover {
  background: var(--bg-hover);
}

.conversation-item.active {
  background: var(--accent-primary);
  color: white;
}

.conversation-item.active .conv-meta {
  color: rgba(255, 255, 255, 0.7);
}

.conv-content {
  flex: 1;
  min-width: 0;
}

.conv-title {
  display: block;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-meta {
  font-size: 11px;
  color: var(--text-secondary);
}

.conv-delete {
  opacity: 0;
  padding: 6px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: inherit;
  transition: opacity 0.2s;
}

.conversation-item:hover .conv-delete {
  opacity: 0.6;
}

.conv-delete:hover {
  opacity: 1 !important;
  background: rgba(255, 255, 255, 0.1);
}

.conv-delete svg {
  width: 14px;
  height: 14px;
}

.empty-conversations {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--border);
}

.settings-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.settings-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.settings-btn svg {
  width: 16px;
  height: 16px;
}

/* 主聊天区域 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.empty-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  gap: 12px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon svg {
  width: 40px;
  height: 40px;
  color: var(--accent-primary);
}

.empty-chat h3 {
  font-size: 18px;
  color: var(--text-primary);
}

.empty-chat p {
  font-size: 14px;
}

/* 消息样式 */
.message {
  display: flex;
  gap: 12px;
  max-width: 80%;
}

.message.user {
  margin-left: auto;
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar svg {
  width: 20px;
  height: 20px;
}

.user-avatar {
  background: var(--accent-primary);
  color: white;
}

.ai-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message.user .message-content {
  text-align: right;
}

.message-text {
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.message.user .message-text {
  background: var(--accent-primary);
  color: white;
  border-bottom-right-radius: 4px;
}

.message.assistant .message-text {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-bottom-left-radius: 4px;
}

.message-text pre {
  background: var(--bg-tertiary);
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 8px 0;
}

.message-text code {
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
}

.message-time {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* 加载动画 */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 16px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: var(--text-secondary);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) { animation-delay: 0s; }
.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

/* 输入区域 */
.chat-input-area {
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  background: var(--bg-card);
}

.chat-input-container {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 8px 12px;
  transition: border-color 0.2s;
}

.chat-input-container:focus-within {
  border-color: var(--accent-primary);
}

.chat-input-container textarea {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  max-height: 120px;
}

.chat-input-container textarea::placeholder {
  color: var(--text-secondary);
}

.send-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--accent-primary);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: scale(1.05);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn svg {
  width: 18px;
  height: 18px;
}

.input-hint {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 8px;
  text-align: center;
}

/* 设置弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.settings-modal {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 480px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.modal-body {
  padding: 24px;
}

.modal-body .form-group {
  margin-bottom: 20px;
}

.modal-body .form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.modal-body label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--text-secondary);
}

.modal-body .form-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 6px;
}

.modal-body select.input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
  cursor: pointer;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border);
}

/* 模型管理样式 */
.current-model {
  background: var(--bg-tertiary);
  padding: 12px 16px;
  border-radius: 8px;
  font-weight: 500;
  color: var(--accent-primary);
}

.model-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.model-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.model-name {
  font-weight: 500;
}

.model-actions {
  display: flex;
  gap: 8px;
}

.btn-success {
  background: #22c55e;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.btn-success:hover:not(:disabled) {
  background: #16a34a;
}

.btn-success:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-danger {
  background: #ef4444;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-danger:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 全局按钮禁用样式 */
button:disabled,
.btn:disabled {
  opacity: 0.4 !important;
  cursor: not-allowed !important;
  pointer-events: none;
}

/* select 禁用样式 */
select:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background-color: var(--bg-card);
}

/* 响应式 */
@media (max-width: 768px) {
  .chat-sidebar {
    display: none;
  }
  
  .message {
    max-width: 95%;
  }
}
</style>
