# 视频监控系统后端 API

基于 FastAPI 的多路视频管理系统后端，支持 WebSocket 实时通信。

## 功能特性

- **WebSocket 实时通信**：支持双向实时消息推送
- **RESTful API**：完整的 CRUD 操作
- **模拟数据**：内置示例视频源、预警、策略、用户数据
- **Excel 日志导入**：支持解析 Excel 文件作为日志数据
- **后台预警模拟**：定时生成模拟预警数据

## 快速开始

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 启动服务

```bash
python main.py
# 或使用 uvicorn
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

服务将在 `http://localhost:8000` 启动

### 3. API 文档

启动后访问:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API 端点

### WebSocket

**连接地址**: `ws://localhost:8000/ws`

**消息格式**:
```json
{
  "type": "get_videos",
  "data": {},
  "timestamp": "2024-01-01T00:00:00"
}
```

**支持的消息类型**:

| 类型 | 说明 | 响应 |
|------|------|------|
| `ping` | 心跳检测 | `pong: true` |
| `get_stats` | 获取系统统计 | 统计数据 |
| `get_videos` | 获取视频列表 | 视频列表 |
| `add_video` | 添加视频源 | 成功/失败 |
| `remove_video` | 删除视频源 | 成功/失败 |
| `get_alarms` | 获取预警列表 | 预警列表 |
| `process_alarm` | 处理预警 | 成功/失败 |
| `get_strategies` | 获取策略列表 | 策略列表 |
| `toggle_strategy` | 切换策略状态 | 更新后的策略 |

### REST API

#### 统计
- `GET /api/stats` - 获取系统统计

#### 视频源
- `GET /api/videos` - 获取所有视频源
- `POST /api/videos` - 添加视频源
- `DELETE /api/videos/{video_id}` - 删除视频源

#### 预警
- `GET /api/alarms` - 获取预警列表 (支持 status/level 筛选)
- `PUT /api/alarms/{alarm_id}/process` - 处理预警

#### 策略
- `GET /api/strategies` - 获取所有策略
- `POST /api/strategies` - 添加策略
- `PUT /api/strategies/{strategy_id}/toggle` - 切换策略状态

#### 用户
- `GET /api/users` - 获取用户列表
- `POST /api/login?username=xxx&password=xxx` - 用户登录

#### 日志
- `GET /api/logs` - 获取日志列表 (支持 level/keyword 筛选和分页)
- `POST /api/logs/upload` - 上传 Excel 文件
- `DELETE /api/logs` - 清空日志

## 数据模型

### 视频源 (VideoSource)
```json
{
  "id": "uuid",
  "name": "入口大门",
  "location": "A区-1",
  "status": "online|offline|error",
  "webrtc_url": "webrtc://...",
  "created_at": "2024-01-01T00:00:00"
}
```

### 预警 (Alarm)
```json
{
  "id": "uuid",
  "camera_id": "v1",
  "camera_name": "入口大门",
  "type": "motion|intrusion|loss|occlusion",
  "level": "info|warning|error|critical",
  "message": "检测到移动物体",
  "status": "pending|processed|ignored",
  "created_at": "2024-01-01T00:00:00",
  "processed_at": null
}
```

### 策略 (Strategy)
```json
{
  "id": "uuid",
  "name": "移动侦测",
  "type": "motion_detection|area_invasion|video_loss|video_occlusion",
  "enabled": true,
  "camera_ids": ["v1", "v2"],
  "config": {},
  "created_at": "2024-01-01T00:00:00"
}
```

### 用户 (User)
```json
{
  "id": "uuid",
  "username": "admin",
  "role": "admin|operator|guest",
  "enabled": true,
  "last_login": "2024-01-01T00:00:00",
  "created_at": "2024-01-01T00:00:00"
}
```

## 模拟数据

默认包含:
- 4 个视频源 (2 在线, 1 离线, 1 错误)
- 4 个监控策略
- 5 条预警记录
- 4 个用户 (admin/admin123, operator/op123456, guest/guest)

## 前端集成

在前端使用 WebSocket:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onopen = () => {
  console.log('已连接');
  // 获取视频列表
  ws.send(JSON.stringify({ type: 'get_videos', data: {} }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log('收到消息:', msg);
  
  switch (msg.type) {
    case 'connected':
      console.log('连接成功:', msg.data);
      break;
    case 'get_videos_response':
      console.log('视频列表:', msg.data.videos);
      break;
    case 'video_added':
      console.log('新视频源:', msg.data.video);
      break;
    case 'new_alarm':
      console.log('新预警:', msg.data.alarm);
      break;
  }
};
```
