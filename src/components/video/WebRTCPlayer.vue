<template>
  <div class="webrtc-player">
    <video 
      ref="videoRef" 
      class="video-element"
      autoplay 
      playsinline
      muted
    ></video>

    <div v-if="connectionState === 'connected'" class="connected-indicator">
      <span class="live-dot"></span>
      <span>LIVE</span>
    </div>

    <!-- 录像中指示器 -->
    <div v-if="isRecording" class="recording-indicator">
      <span class="rec-dot"></span>
      <span>REC</span>
      <span class="rec-time">{{ formatDuration(recordingDuration) }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  url: {
    type: String,
    required: true
  },
  autoplay: {
    type: Boolean,
    default: true
  },
  zlmHost: {
    type: String,
    default: '192.168.0.102'
  },
  zlmPort: {
    type: Number,
    default: 80
  },
  zlmSecret: {
    type: String,
    default: ''
  },
  cameraName: {
    type: String,
    default: 'camera'
  },
  // AI检测配置
  aiModel: {
    type: String,
    default: 'yolov8'
  },
  aiClass: {
    type: String,
    default: 'all'
  },
  aiConfidence: {
    type: Number,
    default: 0.5
  }
})

const emit = defineEmits(['stateChange', 'error', 'debug', 'recordingComplete', 'connectionFailed'])

const videoRef = ref(null)
const connectionState = ref('new')
const debugInfo = ref('初始化...')
let peerConnection = null
let retryTimeout = null
let pcConfig = null
let ws = null

// 录像相关
let mediaRecorder = null
let recordedChunks = []
let recordingStream = null
let recordingTimer = null
const isRecording = ref(false)
const recordingDuration = ref(0)

const log = (msg, type = 'info') => {
  console.log(`[ZLM WebRTC] ${msg}`)
  debugInfo.value = msg
  emit('debug', { msg, type, time: new Date().toISOString() })
}

// 解析 WebRTC URL
const parseWebRTCUrl = (url) => {
  log(`解析 URL: ${url}`)
  
  // 支持格式: webrtc://host:port/app/stream
  const match = url.match(/webrtc:\/\/([^/]+)\/([^/]+)\/(.+)/)
  if (!match) {
    // 尝试直接解析路径格式
    const pathMatch = url.match(/\/([^/]+)\/([^/]+)/)
    if (pathMatch) {
      return {
        host: props.zlmHost,
        port: props.zlmPort,
        app: pathMatch[1],
        stream: pathMatch[2]
      }
    }
    log('URL 格式无效', 'error')
    return null
  }
  
  const [, hostPort, app, stream] = match
  const [host, port] = hostPort.includes(':') 
    ? [hostPort.split(':')[0], parseInt(hostPort.split(':')[1]) || props.zlmPort]
    : [hostPort, props.zlmPort]
  
  // 使用从 props 传入的端口（如果有）
  const finalPort = port || props.zlmPort || 80
  
  log(`解析结果: host=${host}, port=${finalPort}, app=${app}, stream=${stream}`)
  log(`WebSocket 将连接: ws://${host}:${finalPort}/index/api/webrtc`)
  return { host, port: finalPort, app, stream }
}

// 创建 RTCConfiguration
const getRTCConfiguration = () => {
  return {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.qq.com:3478' }
    ],
    iceCandidatePoolSize: 10
  }
}

// 创建 WebRTC 连接
const createPeerConnection = () => {
  log('创建 PeerConnection...')
  
  if (peerConnection) {
    peerConnection.close()
  }
  
  pcConfig = getRTCConfiguration()
  peerConnection = new RTCPeerConnection(pcConfig)
  
  // 收到视频轨道
  peerConnection.ontrack = (event) => {
    log(`收到轨道: ${event.track.kind}, streams: ${event.streams.length}`)
    
    if (event.streams && event.streams[0]) {
      if (videoRef.value) {
        videoRef.value.srcObject = event.streams[0]
        log('视频源已设置')
      }
      // 保存流用于录像
      recordingStream = event.streams[0]
    }
  }
  
  // ICE 候选
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      log(`ICE 候选: ${event.candidate.type} ${event.candidate.protocol} ${event.candidate.address}:${event.candidate.port}`)
      
      // 通过 WebSocket 发送 ICE 候选给 ZLM
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(event.candidate))
        } catch (e) {
          log(`发送 ICE 候选失败: ${e.message}`, 'error')
        }
      }
    }
  }
  
  // ICE 连接状态变化
  peerConnection.oniceconnectionstatechange = () => {
    const state = peerConnection.iceConnectionState
    log(`ICE 连接状态: ${state}`)
    
    if (state === 'connected' || state === 'completed') {
      connectionState.value = 'connected'
      emit('stateChange', 'connected')
    } else if (state === 'failed') {
      connectionState.value = 'failed'
      emit('stateChange', 'failed')
      emit('error', 'ICE 连接失败')
      emit('connectionFailed')
    } else if (state === 'disconnected') {
      log('连接断开，尝试重连...')
      // 不立即标记为失败，等待自动重连
    }
  }
  
  // 连接状态变化
  peerConnection.onconnectionstatechange = () => {
    const state = peerConnection.connectionState
    log(`连接状态: ${state}`)
  }
  
  // ICE gathering 状态
  peerConnection.onicegatheringstatechange = () => {
    log(`ICE 收集状态: ${peerConnection.iceGatheringState}`)
  }
  
  return peerConnection
}

// 连接到 ZLM WebRTC
const connect = async () => {
  if (!props.url) {
    log('URL 为空', 'error')
    return
  }
  
  log(`开始连接: ${props.url}`)
  connectionState.value = 'connecting'
  
  // 清理旧连接
  disconnect()
  
  const parsed = parseWebRTCUrl(props.url)
  if (!parsed) {
    connectionState.value = 'failed'
    return
  }
  
  try {
    const pc = createPeerConnection()
    
    // 添加 transceiver 用于接收音视频
    log('添加 video transceiver (recvonly)...')
    pc.addTransceiver('video', { direction: 'recvonly' })
    
    log('添加 audio transceiver (recvonly)...')
    pc.addTransceiver('audio', { direction: 'recvonly' })
    
    // 创建 Offer
    log('创建 SDP Offer...')
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    })
    
    log(`Offer SDP 长度: ${offer.sdp.length} 字符`)
    
    await pc.setLocalDescription(offer)
    log('本地 SDP 已设置')
    
    // 优先尝试 WebSocket 方式
    const wsConnected = await tryWebSocketMode(pc, parsed)
    
    if (!wsConnected) {
      // WebSocket 失败，回退到 HTTP 方式
      log('WebSocket 方式失败，尝试 HTTP 方式...')
      await tryHttpMode(pc, parsed)
    }
    
    // 设置超时
    startReconnectTimer()
    
  } catch (error) {
    log(`连接异常: ${error.message}`, 'error')
    console.error('WebRTC 错误:', error)
    connectionState.value = 'failed'
    emit('error', error.message)
  }
}

// WebSocket 方式连接 ZLM
const tryWebSocketMode = (pc, parsed) => {
  return new Promise((resolve) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    // 重要：ZLM HTTP API 端口不同于 RTSP 端口，使用 zlmPort 而不是 parsed.port
    const wsHost = props.zlmHost || parsed.host
    const wsPort = props.zlmPort || 80
    const wsHostWithPort = `${wsHost}:${wsPort}`
    const secretParam = props.zlmSecret ? `&secret=${props.zlmSecret}` : ''
    const wsUrl = `${protocol}//${wsHostWithPort}/index/api/webrtc?app=${parsed.app}&stream=${parsed.stream}&type=play${secretParam}`
    
    log(`[WS模式] 连接: ${wsUrl}`)
    
    ws = new WebSocket(wsUrl)
    let wsOpen = false
    let resolved = false
    
    const finish = () => {
      if (!resolved) {
        resolved = true
        if (ws) {
          ws.close()
        }
      }
    }
    
    // 5秒超时
    const timeout = setTimeout(() => {
      log('[WS模式] 连接超时')
      finish()
      resolve(false)
    }, 5000)
    
    ws.onopen = () => {
      log('[WS模式] 已连接，发送 SDP...')
      wsOpen = true
      ws.send(pc.localDescription.sdp)
    }
    
    ws.onmessage = async (event) => {
      clearTimeout(timeout)
      log(`[WS模式] 收到消息: ${event.data.substring(0, 100)}...`)
      
      const data = event.data
      
      // 尝试解析 SDP
      if (data.includes('v=') && data.includes('o=')) {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data }))
        log('[WS模式] SDP Answer 已设置')
        finish()
        resolve(true)
      } else {
        try {
          const json = JSON.parse(data)
          if (json.sdp || json.SDP) {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: json.sdp || json.SDP }))
            log('[WS模式] JSON SDP Answer 已设置')
            finish()
            resolve(true)
          } else if (json.code !== 0) {
            log(`[WS模式] ZLM 错误: ${json.msg}`, 'error')
            finish()
            resolve(false)
          }
        } catch {
          if (data.startsWith('v=')) {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data }))
            finish()
            resolve(true)
          } else {
            log('[WS模式] 未知响应格式', 'error')
            finish()
            resolve(false)
          }
        }
      }
    }
    
    ws.onerror = (e) => {
      log('[WS模式] WebSocket 错误', 'error')
      console.error(e)
    }
    
    ws.onclose = () => {
      clearTimeout(timeout)
      if (!wsOpen) {
        log('[WS模式] 连接失败')
        resolve(false)
      }
    }
  })
}

// HTTP 方式连接 ZLM
const tryHttpMode = async (pc, parsed) => {
  const secretParam = props.zlmSecret ? `&secret=${props.zlmSecret}` : ''
  // 重要：使用 zlmHost 和 zlmPort 而不是 parsed.host 和 parsed.port
  const host = props.zlmHost || parsed.host
  const port = props.zlmPort || 80
  const apiUrl = `http://${host}:${port}/index/api/webrtc?app=${parsed.app}&stream=${parsed.stream}&type=play${secretParam}`
  
  log(`[HTTP模式] 请求: ${apiUrl}`)
  
  const contentTypes = ['application/sdp', 'text/plain']
  
  for (const contentType of contentTypes) {
    try {
      log(`[HTTP模式] 尝试 Content-Type: ${contentType}`)
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': contentType },
        body: pc.localDescription.sdp
      })
      
      if (response.ok) {
        const content = await response.text()
        log(`[HTTP模式] 收到响应 (${content.length} 字符)`)
        
        // 尝试解析 SDP
        let sdp = content
        try {
          const json = JSON.parse(content)
          sdp = json.sdp || json.SDP || content
          log('[HTTP模式] 从 JSON 提取 SDP')
        } catch {}
        
        if (sdp.includes('v=') && sdp.includes('o=')) {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }))
          log('[HTTP模式] SDP Answer 已设置')
          return true
        }
      }
    } catch (e) {
      log(`[HTTP模式] ${contentType} 失败: ${e.message}`, 'error')
    }
  }
  
  log('[HTTP模式] 所有尝试都失败', 'error')
  connectionState.value = 'failed'
  emit('error', 'ZLM 连接失败')
  emit('connectionFailed')
  return false
}



// 启动重连定时器（不再自动重连，由用户手动触发）
let reconnectTimer = null
const startReconnectTimer = () => {
  // 移除了自动重连逻辑
}

// 断开连接
const disconnect = () => {
  log('断开连接...')
  
  // 停止录像
  if (isRecording.value) {
    stopRecording()
  }
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  
  if (retryTimeout) {
    clearTimeout(retryTimeout)
    retryTimeout = null
  }
  
  // 关闭 WebSocket
  if (ws) {
    ws.close()
    ws = null
  }
  
  if (peerConnection) {
    peerConnection.close()
    peerConnection = null
  }
  
  recordingStream = null
  
  if (videoRef.value) {
    videoRef.value.srcObject = null
  }
}

// 截图
const takeSnapshot = () => {
  if (!videoRef.value || !videoRef.value.srcObject) return null
  
  const canvas = document.createElement('canvas')
  canvas.width = videoRef.value.videoWidth || 1920
  canvas.height = videoRef.value.videoHeight || 1080
  const ctx = canvas.getContext('2d')
  ctx.drawImage(videoRef.value, 0, 0)
  
  return canvas.toDataURL('image/jpeg', 0.8)
}

// 录像相关方法
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// 开始录像
const startRecording = () => {
  if (!recordingStream) {
    log('无可用视频流', 'error')
    return false
  }
  
  if (isRecording.value) {
    log('正在录像中...', 'error')
    return false
  }
  
  try {
    recordedChunks = []
    recordingDuration.value = 0
    
    // 创建 MediaRecorder，支持多种格式
    const options = { mimeType: 'video/webm;codecs=vp9,opus' }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = 'video/webm;codecs=vp8,opus'
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = 'video/webm'
    }
    
    log(`录像格式: ${options.mimeType}`)
    mediaRecorder = new MediaRecorder(recordingStream, options)
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data)
      }
    }
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      
      // 自动下载录像文件
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `${props.cameraName}_${timestamp}.webm`
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      
      URL.revokeObjectURL(url)
      log(`录像已保存: ${filename}`)
      emit('recordingComplete', { 
        filename, 
        size: blob.size, 
        duration: recordingDuration.value
      })
    }
    
    mediaRecorder.onerror = (error) => {
      log(`录像错误: ${error}`, 'error')
      isRecording.value = false
    }
    
    mediaRecorder.start(1000) // 每秒保存一次数据
    isRecording.value = true
    
    // 计时器
    recordingTimer = setInterval(() => {
      recordingDuration.value++
    }, 1000)
    
    log('开始录像')
    return true
  } catch (error) {
    log(`创建录像失败: ${error.message}`, 'error')
    return false
  }
}

// 停止录像
const stopRecording = () => {
  if (!isRecording.value || !mediaRecorder) {
    return false
  }
  
  try {
    mediaRecorder.stop()
    isRecording.value = false
    
    if (recordingTimer) {
      clearInterval(recordingTimer)
      recordingTimer = null
    }
    
    log('停止录像')
    return true
  } catch (error) {
    log(`停止录像失败: ${error.message}`, 'error')
    return false
  }
}

// 检查是否正在录像
const checkRecording = () => {
  return isRecording.value
}

// 监听 URL 变化
watch(() => props.url, (newUrl) => {
  log(`URL 变化: ${newUrl}`)
  if (newUrl) {
    connect()
  } else {
    disconnect()
    connectionState.value = 'new'
  }
})

onMounted(() => {
  log('组件挂载')
  // 自动开始连接
  if (props.url) {
    connect()
  }
})

onUnmounted(() => {
  log('组件卸载')
  disconnect()
})

defineExpose({
  connect,
  disconnect,
  takeSnapshot,
  startRecording,
  stopRecording,
  checkRecording,
  connectionState,
  isRecording,
  debugInfo
})
</script>

<style scoped>
.webrtc-player {
  position: absolute;
  inset: 0;
  background: #000;
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.player-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: #9ca3af;
  padding: 20px;
  text-align: center;
}

.player-overlay.error {
  background: rgba(50, 0, 0, 0.85);
}

.player-overlay svg {
  width: 48px;
  height: 48px;
  opacity: 0.6;
}

.player-overlay.error svg {
  color: #ef4444;
}

.debug-info {
  font-size: 11px;
  font-family: 'Courier New', monospace;
  color: #6b7280;
  max-width: 100%;
  word-break: break-all;
  white-space: pre-wrap;
}

.debug-info.error {
  color: #f87171;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(59, 130, 246, 0.3);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.retry-btn {
  margin-top: 8px;
  padding: 8px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;
}

.retry-btn:hover {
  background: #2563eb;
}

.connected-indicator {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(239, 68, 68, 0.9);
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  color: white;
  z-index: 10;
}

.live-dot {
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 录像指示器 */
.recording-indicator {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(239, 68, 68, 0.9);
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  color: white;
  z-index: 10;
}

.rec-dot {
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  animation: rec-blink 1s ease-in-out infinite;
}

.rec-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
}

@keyframes rec-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
