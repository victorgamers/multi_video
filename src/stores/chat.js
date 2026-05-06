import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// WebSocket 配置 - 连接到 RK3588 后端
const WS_BASE = 'ws://192.168.0.101:5000'
const WS_URL = `${WS_BASE}/ws`
const HTTP_BASE = 'http://192.168.0.101:5000'

export const useChatStore = defineStore('chat', () => {
  const conversations = ref([])
  const currentConversationId = ref(null)
  const isLoading = ref(false)
  const error = ref(null)
  const wsConnected = ref(false)
  const clientId = ref(null)
  const scrollTrigger = ref(0)  // 用于触发滚动
  const runningModel = ref(null)  // 当前运行的 AI 对话模型 ID
  const runningMultiModel = ref(null)  // 当前运行的多模态模型 ID
  
  // WebSocket 连接
  let ws = null
  let pendingResolve = null
  let pendingReject = null
  let streamResolver = null  // 用于结束流式输出
  
  // 本地模型配置
  const settings = ref({
    temperature: 0.7,
    maxTokens: 2000
  })
  
  // 当前对话
  const currentConversation = computed(() => {
    return conversations.value.find(c => c.id === currentConversationId.value)
  })
  
  // 所有对话列表
  const conversationList = computed(() => {
    return conversations.value.map(c => ({
      id: c.id,
      title: c.title,
      updatedAt: c.updatedAt,
      messageCount: c.messages.length
    }))
  })
  
  // 当前运行的模型名称
  const currentModel = computed(() => {
    if (!runningModel.value) return null
    return runningModel.value
  })
  
  // 当前运行的多模态模型名称
  const currentMultiModel = computed(() => {
    if (!runningMultiModel.value) return null
    return runningMultiModel.value
  })
  
  // 模型名称映射：前端ID -> 后端名称
  const modelNameMap = {
    'DeepSeek-R1': 'DeepSeek-R1',
    'DeepSeek-R1-Distill-Qwen-7B': 'DeepSeek-R1-Distill-Qwen-7B',
    'Tiny-1.1B': 'Tiny-1.1B',
    'Qwen2-VL-2B': 'Qwen2-VL-2B',
    'DeepSeek-OCR': 'DeepSeek-OCR'
  }
  
  // 加载模型
  const startModel = async (modelId, modelType = 'chat') => {
    const modelName = modelNameMap[modelId] || modelId
    // modelType: 'chat' 或 'multi'
    const loadType = modelType === 'multi' ? 'loadMultiModel' : 'loadModel'
    
    try {
      const response = await fetch(`${HTTP_BASE}/llm/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: loadType, model: modelName })
      })
      if (response.ok) {
        if (modelType === 'multi') {
          runningMultiModel.value = modelId
        } else {
          runningModel.value = modelId
        }
      }
    } catch (err) {
      console.error('加载模型失败:', err)
    }
  }
  
  // 卸载模型
  const stopModel = async (modelType = 'chat') => {
    // modelType: 'chat' 或 'multi'
    const targetModel = modelType === 'multi' ? runningMultiModel.value : runningModel.value
    const modelName = modelNameMap[targetModel] || targetModel
    const unloadType = modelType === 'multi' ? 'unloadMultiModel' : 'unloadModel'
    
    try {
      const response = await fetch(`${HTTP_BASE}/llm/unload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: unloadType, model: modelName })
      })
      if (response.ok) {
        if (modelType === 'multi') {
          runningMultiModel.value = null
        } else {
          runningModel.value = null
        }
      }
    } catch (err) {
      console.error('卸载模型失败:', err)
    }
  }
  
  // 查询当前模型
  // subType: '0' - AI对话, '1' - 多模态
  const fetchCurrentModel = async (subType = '0') => {
    try {
      const response = await fetch(`${HTTP_BASE}/llm/model?subType=${subType}`)
      if (response.ok) {
        const data = await response.json()
        if (data.model) {
          // 反向映射：后端模型名称 -> 前端模型 ID（统一大写格式）
          const reverseMap = {
            'DeepSeek-R1': 'DeepSeek-R1',
            'DeepSeek-R1-Distill-Qwen-7B': 'DeepSeek-R1-Distill-Qwen-7B',
            'Tiny-1.1B': 'Tiny-1.1B',
            'Qwen2-VL-2B': 'Qwen2-VL-2B',
            'DeepSeek-OCR': 'DeepSeek-OCR'
          }
          let modelId = reverseMap[data.model]
          
          // 如果反向映射找不到，尝试将后端名称转换为小写格式
          if (!modelId) {
            modelId = data.model.toLowerCase().replace(/\s+/g, '-')
          }
          
          console.log('查询到当前模型:', { raw: data.model, mapped: modelId, subType })
          
          // 根据 subType 分别设置对应的状态
          if (subType === '1') {
            // 多模态模型
            runningMultiModel.value = modelId
            console.log('runningMultiModel 已设置:', runningMultiModel.value)
          } else {
            // AI 对话模型
            runningModel.value = modelId
            console.log('runningModel 已设置:', runningModel.value)
          }
        } else {
          console.log('后端未返回模型')
        }
      }
    } catch (err) {
      console.error('查询模型失败:', err)
    }
  }
  
  // 创建新对话
  const createConversation = () => {
    const id = Date.now().toString()
    conversations.value.unshift({
      id,
      title: '新对话',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    currentConversationId.value = id
    return id
  }
  
  // 选择对话
  const selectConversation = (id) => {
    currentConversationId.value = id
  }
  
  // 删除对话
  const deleteConversation = (id) => {
    const index = conversations.value.findIndex(c => c.id === id)
    if (index !== -1) {
      conversations.value.splice(index, 1)
      if (currentConversationId.value === id) {
        currentConversationId.value = conversations.value[0]?.id || null
      }
    }
  }
  
  // 连接 WebSocket
  const connectWebSocket = () => {
    return new Promise((resolve, reject) => {
      // 如果已有连接，先关闭
      if (ws) {
        ws.close()
        ws = null
      }
      
      console.log('正在连接 WebSocket:', WS_URL)
      ws = new WebSocket(WS_URL)
      
      // 设置超时
      const timeoutId = setTimeout(() => {
        if (ws && ws.readyState !== WebSocket.OPEN) {
          ws.close()
          ws = null
          reject(new Error('连接超时'))
        }
      }, 10000)
      
      ws.onopen = () => {
        clearTimeout(timeoutId)
        console.log('WebSocket 已连接')
        wsConnected.value = true
        resolve()
      }
      
      ws.onclose = (event) => {
        console.log('WebSocket 已断开', event.code)
        wsConnected.value = false
        clientId.value = null
      }
      
      ws.onerror = (error) => {
        clearTimeout(timeoutId)
        console.error('WebSocket 错误:', error)
        wsConnected.value = false
        reject(new Error('连接失败'))
      }
      
      ws.onmessage = (event) => {
        handleMessage(event.data)
      }
    })
  }
  
  // 处理 WebSocket 消息
  const handleMessage = (data) => {
    // 先尝试 JSON 解析
    try {
      const message = JSON.parse(data)
      console.log('收到 JSON 消息:', message)
      
      // 连接成功后的初始化消息
      if (message.action === 'connected' || message.type === 'connected') {
        clientId.value = message.data?.client_id || message.client_id
        console.log('获取到 Client ID:', clientId.value)
        return
      }
      
      // 处理错误消息
      if (message.type === 'error') {
        console.error('后端错误:', message.message)
        if (pendingResolve) {
          pendingResolve(`【提示】${message.message || 'AI 服务暂时不可，请稍后重试'}`)
          pendingResolve = null
          pendingReject = null
        }
        return
      }
      
      // 处理 AI 对话响应 (JSON 格式)
      if (pendingResolve) {
        if (message.type === 'chat_response' || message.action === 'chat') {
          const content = message.data?.content || message.content || ''
          pendingResolve(content)
          pendingResolve = null
          pendingReject = null
          return
        }
        
        // 处理带 content 字段的响应
        if (message.content || message.response) {
          const content = message.content || message.response || ''
          pendingResolve(content)
          pendingResolve = null
          pendingReject = null
        }
      }
      
    } catch (error) {
      // JSON 解析失败，说明是纯文本 token 流
      console.log('收到纯文本 token:', data)
      
      // 检测结束标记
      if (data === '[end]' || data === '[END]') {
        console.log('收到结束标记，结束流式输出')
        if (streamResolver) {
          streamResolver()
          streamResolver = null
          pendingResolve = null
          pendingReject = null
        }
        return
      }
      
      if (pendingResolve) {
        // 直接输出原始内容
        pendingResolve(data)
      }
    }
  }
  
  // 断开 WebSocket
  const disconnectWebSocket = () => {
    if (ws) {
      ws.close()
      ws = null
    }
    wsConnected.value = false
    clientId.value = null
  }
  
  // 发送消息
  const sendMessage = async (content) => {
    if (!currentConversationId.value) {
      createConversation()
    }
    
    const conversation = conversations.value.find(c => c.id === currentConversationId.value)
    if (!conversation) return null
    
    // 添加用户消息
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    }
    conversation.messages.push(userMessage)
    
    // 更新标题（第一条消息）
    if (conversation.messages.length === 1) {
      conversation.title = content.slice(0, 30) + (content.length > 30 ? '...' : '')
    }
    
    conversation.updatedAt = new Date().toISOString()
    
    isLoading.value = true
    error.value = null
    
    // 添加助手消息占位（流式累积内容）
    conversation.messages.push({
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    })
    
    let timeoutId = null
    let accumulatedContent = ''  // 累积流式内容
    
    try {
      // 清理之前的 pending 状态
      if (pendingResolve) {
        pendingResolve(null)
        pendingResolve = null
        pendingReject = null
      }
      
      // 确保 WebSocket 已连接
      await connectWebSocket()
      
      // 构造符合后端要求的消息格式
      const payload = {
        action: 'chat',
        subAction: 'prompt',
        data: {
          role: 'user',
          prompt: content
        }
      }
      
      console.log('发送消息:', payload)
      ws.send(JSON.stringify(payload))
      
      // 流式等待响应 - 实时更新 UI
      await new Promise((resolve) => {
        let streamResolve = null
        
        streamResolve = (token) => {
          if (token) {
            accumulatedContent += token
            // 找到最后一条消息并更新内容
            const msgs = conversations.value.find(c => c.id === currentConversationId.value)?.messages
            if (msgs && msgs.length > 0) {
              const lastMsg = msgs[msgs.length - 1]
              if (lastMsg.role === 'assistant') {
                lastMsg.content = accumulatedContent
              }
            }
            // 触发滚动
            scrollTrigger.value++
          }
        }
        
        // 保存到全局，以便 handleMessage 可以调用
        pendingResolve = streamResolve
        streamResolver = resolve  // 保存 resolve 以便 [end] 时调用
        
        // 超时设置
        timeoutId = setTimeout(() => {
          streamResolver = null
          pendingResolve = null
          resolve() // 超时时结束
        }, 120000)
      })
      
      // 检查是否没有收到任何内容
      const msgs = conversations.value.find(c => c.id === currentConversationId.value)?.messages
      if (msgs && msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1]
        if (lastMsg.role === 'assistant' && !lastMsg.content) {
          lastMsg.content = '模型未返回有效响应'
        }
      }
      
    } catch (e) {
      console.error('Chat 错误:', e)
      error.value = e.message
      const msgs = conversations.value.find(c => c.id === currentConversationId.value)?.messages
      if (msgs && msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1]
        if (lastMsg.role === 'assistant') {
          lastMsg.content = `错误: ${e.message}\n\n请检查：\n1. 后端服务 192.168.0.101:5000 是否运行\n2. 网络连接是否正常`
        }
      }
    } finally {
      isLoading.value = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }
  
  // 清空当前对话
  const clearCurrentConversation = () => {
    const conversation = conversations.value.find(c => c.id === currentConversationId.value)
    if (conversation) {
      conversation.messages = []
      conversation.title = '新对话'
    }
  }
  
  // 更新设置
  const updateSettings = (newSettings) => {
    Object.assign(settings.value, newSettings)
    localStorage.setItem('chat-settings', JSON.stringify(settings.value))
  }
  
  // 加载设置
  const loadSettings = () => {
    const saved = localStorage.getItem('chat-settings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        Object.assign(settings.value, parsed)
      } catch (e) {
        console.error('加载聊天设置失败:', e)
      }
    }
  }
  
  // 初始化
  loadSettings()
  
  return {
    conversations,
    currentConversationId,
    currentConversation,
    conversationList,
    isLoading,
    error,
    wsConnected,
    clientId,
    settings,
    scrollTrigger,
    runningModel,
    runningMultiModel,
    currentModel,
    currentMultiModel,
    createConversation,
    selectConversation,
    deleteConversation,
    startModel,
    stopModel,
    fetchCurrentModel,
    sendMessage,
    clearCurrentConversation,
    updateSettings,
    loadSettings,
    connectWebSocket,
    disconnectWebSocket
  }
})
