/**
 * WebSocket 网络类 - 连接 FastAPI 后端
 */
class WebSocketClient {
  constructor() {
    this.ws = null
    this.url = ''
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 3000
    this.pingInterval = null
    this.pingIntervalTime = 30000 // 30秒 ping 一次
    
    // 事件回调
    this.eventHandlers = {
      open: [],
      close: [],
      error: [],
      message: [],
      connected: [],
      stats: [],
      videos: [],
      alarms: [],
      strategies: [],
      video_added: [],
      video_removed: [],
      alarm_updated: [],
      new_alarm: [],
      strategy_updated: []
    }
    
    // 消息队列（连接未就绪时）
    this.messageQueue = []
    this.isConnected = false
  }

  /**
   * 连接到 WebSocket 服务器
   * @param {string} url - WebSocket URL，如 ws://localhost:8000/ws
   */
  connect(url) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('WebSocket 已连接')
      return
    }
    
    this.url = url
    console.log(`正在连接 WebSocket: ${url}`)
    
    try {
      this.ws = new WebSocket(url)
      this._setupEventListeners()
    } catch (error) {
      console.error('WebSocket 连接失败:', error)
      this._scheduleReconnect()
    }
  }

  /**
   * 设置事件监听器
   */
  _setupEventListeners() {
    this.ws.onopen = () => {
      console.log('WebSocket 连接已建立')
      this.isConnected = true
      this.reconnectAttempts = 0
      this._startPing()
      this._triggerEvent('open', { url: this.url })
      
      // 发送队列中的消息
      this._flushMessageQueue()
    }

    this.ws.onclose = (event) => {
      console.log(`WebSocket 连接已关闭: ${event.code} - ${event.reason}`)
      this.isConnected = false
      this._stopPing()
      this._triggerEvent('close', { code: event.code, reason: event.reason })
      
      // 尝试重连
      this._scheduleReconnect()
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket 错误:', error)
      this._triggerEvent('error', error)
    }

    this.ws.onmessage = (event) => {
      this._handleMessage(event.data)
    }
  }

  /**
   * 处理接收到的消息
   */
  _handleMessage(data) {
    try {
      const message = JSON.parse(data)
      console.log('收到消息:', message)
      
      // 触发通用消息回调
      this._triggerEvent('message', message)
      
      // 根据消息类型触发特定回调
      const type = message.type
      if (type && this.eventHandlers[type]) {
        this._triggerEvent(type, message.data)
      }
      
      // 特殊处理连接成功消息
      if (type === 'connected') {
        this._triggerEvent('connected', {
          clientId: message.data?.client_id,
          stats: message.data?.stats
        })
      }
    } catch (error) {
      console.error('解析消息失败:', error)
    }
  }

  /**
   * 发送消息
   */
  send(type, data = {}) {
    const message = {
      type,
      data,
      timestamp: new Date().toISOString()
    }
    
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      // 加入队列，等待连接就绪后发送
      this.messageQueue.push(message)
      console.warn('WebSocket 未连接，消息已加入队列')
    }
  }

  /**
   * 发送队列中的消息
   */
  _flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      this.ws.send(JSON.stringify(message))
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    this._stopPing()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
    this.messageQueue = []
    this.reconnectAttempts = this.maxReconnectAttempts // 防止自动重连
  }

  /**
   * 调度重连
   */
  _scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('已达到最大重连次数，不再尝试')
      return
    }
    
    this.reconnectAttempts++
    const delay = this.reconnectDelay * this.reconnectAttempts
    
    console.log(`${delay/1000}秒后尝试第 ${this.reconnectAttempts} 次重连...`)
    
    setTimeout(() => {
      if (!this.isConnected && this.url) {
        this.connect(this.url)
      }
    }, delay)
  }

  /**
   * 开始心跳检测
   */
  _startPing() {
    this._stopPing()
    this.pingInterval = setInterval(() => {
      this.send('ping')
    }, this.pingIntervalTime)
  }

  /**
   * 停止心跳检测
   */
  _stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  /**
   * 注册事件监听器
   * @param {string} event - 事件名
   * @param {Function} handler - 回调函数
   */
  on(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].push(handler)
    }
    return () => this.off(event, handler) // 返回取消订阅函数
  }

  /**
   * 移除事件监听器
   */
  off(event, handler) {
    if (this.eventHandlers[event]) {
      if (handler) {
        const index = this.eventHandlers[event].indexOf(handler)
        if (index > -1) {
          this.eventHandlers[event].splice(index, 1)
        }
      } else {
        this.eventHandlers[event] = []
      }
    }
  }

  /**
   * 触发事件
   */
  _triggerEvent(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`事件 ${event} 处理出错:`, error)
        }
      })
    }
  }

  // ==================== 便捷方法 ====================

  /**
   * 获取系统统计
   */
  getStats() {
    this.send('get_stats')
  }

  /**
   * 获取视频列表
   */
  getVideos() {
    this.send('get_videos')
  }

  /**
   * 添加视频
   */
  addVideo(video) {
    this.send('add_video', video)
  }

  /**
   * 删除视频
   */
  removeVideo(videoId) {
    this.send('remove_video', { video_id: videoId })
  }

  /**
   * 获取预警列表
   */
  getAlarms() {
    this.send('get_alarms')
  }

  /**
   * 处理预警
   */
  processAlarm(alarmId) {
    this.send('process_alarm', { alarm_id: alarmId })
  }

  /**
   * 获取策略列表
   */
  getStrategies() {
    this.send('get_strategies')
  }

  /**
   * 切换策略状态
   */
  toggleStrategy(strategyId) {
    this.send('toggle_strategy', { strategy_id: strategyId })
  }

  /**
   * 订阅事件
   * @param {string[]} events - 要订阅的事件数组
   */
  subscribe(events) {
    this.send('subscribe', { events })
  }
}

// 导出单例
export const wsClient = new WebSocketClient()
export default WebSocketClient
