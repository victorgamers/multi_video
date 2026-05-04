"""
多路视频管理系统 - FastAPI 后端
支持 WebSocket 实时通信
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import json
import asyncio
import random
import uuid
import os
import base64
from pathlib import Path

# 截图存储目录
SCREENSHOTS_DIR = Path(__file__).parent / "screenshots"
SCREENSHOTS_DIR.mkdir(exist_ok=True)

app = FastAPI(
    title="视频监控系统 API",
    description="多路视频管理系统后端服务，支持 WebSocket 实时通信",
    version="1.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== 枚举定义 ====================
class VideoStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    ERROR = "error"

class AlarmLevel(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class AlarmStatus(str, Enum):
    PENDING = "pending"
    PROCESSED = "processed"
    IGNORED = "ignored"

class StrategyType(str, Enum):
    MOTION_DETECTION = "motion_detection"
    AREA_INVASION = "area_invasion"
    VIDEO_LOSS = "video_loss"
    VIDEO_OCCLUSION = "video_occlusion"

class UserRole(str, Enum):
    ADMIN = "admin"
    OPERATOR = "operator"
    GUEST = "guest"

class LogLevel(str, Enum):
    INFO = "INFO"
    WARN = "WARN"
    ERROR = "ERROR"

# ==================== 数据模型 ====================
class VideoSource(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    location: str
    status: VideoStatus = VideoStatus.OFFLINE
    webrtc_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

class Strategy(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: StrategyType
    enabled: bool = True
    camera_ids: List[str] = []
    config: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.now)

class Alarm(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    camera_id: str
    camera_name: str
    type: str
    level: AlarmLevel
    message: str
    status: AlarmStatus = AlarmStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.now)
    processed_at: Optional[datetime] = None
    processed_by: Optional[str] = None

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password: str  # 实际应用中应加密存储
    role: UserRole = UserRole.GUEST
    enabled: bool = True
    last_login: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)

class LogEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime
    level: LogLevel
    source: str
    message: str
    details: Optional[Dict[str, Any]] = None

class Screenshot(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    camera_name: str
    camera_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)
    size: int = 0
    width: Optional[int] = None
    height: Optional[int] = None
    thumbnail: Optional[str] = None

class WebSocketMessage(BaseModel):
    type: str
    data: Dict[str, Any] = {}
    timestamp: datetime = Field(default_factory=datetime.now)

# ==================== 模拟数据存储 ====================
class DataStore:
    def __init__(self):
        # 视频源
        self.videos: Dict[str, VideoSource] = {
            "v1": VideoSource(id="v1", name="入口大门", location="A区-1", status=VideoStatus.ONLINE),
            "v2": VideoSource(id="v2", name="停车场", location="B区-1", status=VideoStatus.ONLINE),
            "v3": VideoSource(id="v3", name="办公大楼", location="C区-1", status=VideoStatus.ONLINE),
            "v4": VideoSource(id="v4", name="仓库入口", location="D区-1", status=VideoStatus.OFFLINE),
        }
        
        # 策略
        self.strategies: Dict[str, Strategy] = {
            "s1": Strategy(id="s1", name="移动侦测-入口", type=StrategyType.MOTION_DETECTION, enabled=True, camera_ids=["v1"]),
            "s2": Strategy(id="s2", name="区域入侵-仓库", type=StrategyType.AREA_INVASION, enabled=True, camera_ids=["v4"]),
            "s3": Strategy(id="s3", name="视频丢失监测", type=StrategyType.VIDEO_LOSS, enabled=False, camera_ids=["v1", "v2", "v3", "v4"]),
            "s4": Strategy(id="s4", name="画面遮挡检测", type=StrategyType.VIDEO_OCCLUSION, enabled=True, camera_ids=["v3"]),
        }
        
        # 预警
        self.alarms: Dict[str, Alarm] = {
            f"a{i}": Alarm(
                id=f"a{i}",
                camera_id=random.choice(list(self.videos.keys())),
                camera_name=random.choice(list(self.videos.values())).name,
                type=random.choice(["motion", "intrusion", "loss", "occlusion"]),
                level=random.choice(list(AlarmLevel)),
                message=f"检测到异常事件 {i}",
                status=random.choice(list(AlarmStatus))
            )
            for i in range(1, 6)
        }
        
        # 用户
        self.users: Dict[str, User] = {
            "u1": User(id="u1", username="admin", password="admin123", role=UserRole.ADMIN),
            "u2": User(id="u2", username="operator", password="op123456", role=UserRole.OPERATOR),
            "u3": User(id="u3", username="guest", password="guest", role=UserRole.GUEST),
            "u4": User(id="u4", username="viewer", password="view123", role=UserRole.GUEST),
        }
        
        # 日志
        self.logs: List[LogEntry] = []
        
        # 截图索引
        self.screenshots: Dict[str, Screenshot] = {}
        
        # WebSocket 连接管理
        self.connections: Dict[str, WebSocket] = {}
        
    def get_stats(self) -> Dict[str, Any]:
        online_count = sum(1 for v in self.videos.values() if v.status == VideoStatus.ONLINE)
        pending_alarms = sum(1 for a in self.alarms.values() if a.status == AlarmStatus.PENDING)
        enabled_strategies = sum(1 for s in self.strategies.values() if s.enabled)
        
        return {
            "total_cameras": len(self.videos),
            "online_cameras": online_count,
            "offline_cameras": len(self.videos) - online_count,
            "pending_alarms": pending_alarms,
            "enabled_strategies": enabled_strategies,
            "total_strategies": len(self.strategies),
            "total_alarms": len(self.alarms),
            "processed_alarms": sum(1 for a in self.alarms.values() if a.status == AlarmStatus.PROCESSED),
            "total_users": len(self.users),
        }

data_store = DataStore()

# ==================== WebSocket 连接管理器 ====================
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"WebSocket 连接已建立，当前连接数: {len(self.active_connections)}")
        
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"WebSocket 连接已断开，当前连接数: {len(self.active_connections)}")
        
    async def send_message(self, message: Dict[str, Any], websocket: WebSocket):
        await websocket.send_json(message)
        
    async def broadcast(self, message: Dict[str, Any]):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        # 清理断开的连接
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()

# ==================== WebSocket 路由 ====================
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket 端点 - 支持实时双向通信"""
    client_id = str(uuid.uuid4())
    await manager.connect(websocket)
    
    try:
        # 发送连接成功消息
        await manager.send_message({
            "type": "connected",
            "data": {
                "client_id": client_id,
                "message": "连接成功",
                "stats": data_store.get_stats()
            },
            "timestamp": datetime.now().isoformat()
        }, websocket)
        
        while True:
            # 接收客户端消息
            data = await websocket.receive_text()
            message = json.loads(data)
            
            await handle_websocket_message(client_id, message, websocket)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print(f"客户端 {client_id} 断开连接")
    except Exception as e:
        print(f"WebSocket 错误: {e}")
        manager.disconnect(websocket)

async def handle_websocket_message(client_id: str, message: Dict, websocket: WebSocket):
    """处理 WebSocket 消息"""
    msg_type = message.get("type", "")
    data = message.get("data", {})
    
    response = {
        "type": f"{msg_type}_response",
        "timestamp": datetime.now().isoformat()
    }
    
    if msg_type == "ping":
        response["data"] = {"pong": True}
        
    elif msg_type == "get_stats":
        response["data"] = data_store.get_stats()
        
    elif msg_type == "get_videos":
        response["data"] = {
            "videos": [v.model_dump() for v in data_store.videos.values()]
        }
        
    elif msg_type == "add_video":
        video = VideoSource(**data)
        data_store.videos[video.id] = video
        response["data"] = {"success": True, "video": video.model_dump()}
        # 广播给所有客户端
        await manager.broadcast({
            "type": "video_added",
            "data": {"video": video.model_dump()},
            "timestamp": datetime.now().isoformat()
        })
        
    elif msg_type == "remove_video":
        video_id = data.get("video_id")
        if video_id in data_store.videos:
            del data_store.videos[video_id]
            response["data"] = {"success": True}
            await manager.broadcast({
                "type": "video_removed",
                "data": {"video_id": video_id},
                "timestamp": datetime.now().isoformat()
            })
        else:
            response["data"] = {"success": False, "error": "视频源不存在"}
            
    elif msg_type == "get_alarms":
        response["data"] = {
            "alarms": [a.model_dump() for a in data_store.alarms.values()]
        }
        
    elif msg_type == "process_alarm":
        alarm_id = data.get("alarm_id")
        if alarm_id in data_store.alarms:
            data_store.alarms[alarm_id].status = AlarmStatus.PROCESSED
            data_store.alarms[alarm_id].processed_at = datetime.now()
            response["data"] = {"success": True}
            await manager.broadcast({
                "type": "alarm_updated",
                "data": {"alarm": data_store.alarms[alarm_id].model_dump()},
                "timestamp": datetime.now().isoformat()
            })
            
    elif msg_type == "get_strategies":
        response["data"] = {
            "strategies": [s.model_dump() for s in data_store.strategies.values()]
        }
        
    elif msg_type == "toggle_strategy":
        strategy_id = data.get("strategy_id")
        if strategy_id in data_store.strategies:
            data_store.strategies[strategy_id].enabled = not data_store.strategies[strategy_id].enabled
            response["data"] = {
                "success": True,
                "strategy": data_store.strategies[strategy_id].model_dump()
            }
            await manager.broadcast({
                "type": "strategy_updated",
                "data": {"strategy": data_store.strategies[strategy_id].model_dump()},
                "timestamp": datetime.now().isoformat()
            })
            
    elif msg_type == "subscribe":
        # 订阅特定事件类型
        subscription = data.get("events", [])
        response["data"] = {"subscribed": True, "events": subscription}
        
    else:
        response["data"] = {"error": f"未知消息类型: {msg_type}"}
        
    await manager.send_message(response, websocket)

# ==================== REST API 路由 ====================
@app.get("/")
async def root():
    """API 根路径"""
    return {"message": "视频监控系统 API", "version": "1.0.0"}

@app.get("/api/stats")
async def get_stats():
    """获取系统统计信息"""
    return data_store.get_stats()

# 视频源 API
@app.get("/api/videos")
async def get_videos():
    """获取所有视频源"""
    return {"videos": [v.model_dump() for v in data_store.videos.values()]}

@app.post("/api/videos")
async def add_video(video: VideoSource):
    """添加视频源"""
    data_store.videos[video.id] = video
    # 广播新视频源
    await manager.broadcast({
        "type": "video_added",
        "data": {"video": video.model_dump()},
        "timestamp": datetime.now().isoformat()
    })
    return {"success": True, "video": video.model_dump()}

@app.delete("/api/videos/{video_id}")
async def remove_video(video_id: str):
    """删除视频源"""
    if video_id in data_store.videos:
        del data_store.videos[video_id]
        await manager.broadcast({
            "type": "video_removed",
            "data": {"video_id": video_id},
            "timestamp": datetime.now().isoformat()
        })
        return {"success": True}
    raise HTTPException(status_code=404, detail="视频源不存在")

# 预警 API
@app.get("/api/alarms")
async def get_alarms(
    status: Optional[str] = None,
    level: Optional[str] = None
):
    """获取预警列表"""
    alarms = list(data_store.alarms.values())
    if status:
        alarms = [a for a in alarms if a.status == status]
    if level:
        alarms = [a for a in alarms if a.level == level]
    return {"alarms": [a.model_dump() for a in alarms]}

@app.put("/api/alarms/{alarm_id}/process")
async def process_alarm(alarm_id: str):
    """处理预警"""
    if alarm_id in data_store.alarms:
        data_store.alarms[alarm_id].status = AlarmStatus.PROCESSED
        data_store.alarms[alarm_id].processed_at = datetime.now()
        await manager.broadcast({
            "type": "alarm_updated",
            "data": {"alarm": data_store.alarms[alarm_id].model_dump()},
            "timestamp": datetime.now().isoformat()
        })
        return {"success": True}
    raise HTTPException(status_code=404, detail="预警不存在")

# 策略 API
@app.get("/api/strategies")
async def get_strategies():
    """获取所有策略"""
    return {"strategies": [s.model_dump() for s in data_store.strategies.values()]}

@app.post("/api/strategies")
async def add_strategy(strategy: Strategy):
    """添加策略"""
    data_store.strategies[strategy.id] = strategy
    return {"success": True, "strategy": strategy.model_dump()}

@app.put("/api/strategies/{strategy_id}/toggle")
async def toggle_strategy(strategy_id: str):
    """切换策略状态"""
    if strategy_id in data_store.strategies:
        data_store.strategies[strategy_id].enabled = not data_store.strategies[strategy_id].enabled
        await manager.broadcast({
            "type": "strategy_updated",
            "data": {"strategy": data_store.strategies[strategy_id].model_dump()},
            "timestamp": datetime.now().isoformat()
        })
        return {"success": True, "strategy": data_store.strategies[strategy_id].model_dump()}
    raise HTTPException(status_code=404, detail="策略不存在")

# 用户 API
@app.get("/api/users")
async def get_users():
    """获取用户列表"""
    # 不返回密码
    users = [{**u.model_dump(), "password": "***"} for u in data_store.users.values()]
    return {"users": users}

@app.post("/api/login")
async def login(username: str = Query(...), password: str = Query(...)):
    """用户登录"""
    for user in data_store.users.values():
        if user.username == username and user.password == password:
            user.last_login = datetime.now()
            return {
                "success": True,
                "user": {**user.model_dump(), "password": "***"},
                "token": f"token_{user.id}_{datetime.now().timestamp()}"
            }
    return {"success": False, "error": "用户名或密码错误"}

# 日志 API
@app.post("/api/logs/upload")
async def upload_logs(file: UploadFile = File(...)):
    """上传并解析 Excel 日志文件"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="仅支持 .xlsx 或 .xls 文件")
    
    try:
        from openpyxl import load_workbook
        
        contents = await file.read()
        wb = load_workbook(filename=None, data_only=True)
        # openpyxl 需要文件路径，这里使用临时文件
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=file.filename) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name
        
        wb = load_workbook(tmp_path)
        ws = wb.active
        
        # 解析 Excel 数据
        logs = []
        headers = []
        for idx, row in enumerate(ws.iter_rows(values_only=True)):
            if idx == 0:
                headers = [str(h) if h else f"列{i}" for i, h in enumerate(row)]
                continue
            if row and any(row):
                row_data = dict(zip(headers, row))
                log = LogEntry(
                    timestamp=row_data.get('时间', row_data.get('timestamp', datetime.now())),
                    level=LogLevel(row_data.get('级别', row_data.get('level', 'INFO'))),
                    source=row_data.get('来源', row_data.get('source', 'system')),
                    message=row_data.get('内容', row_data.get('message', '')),
                    details=row_data
                )
                logs.append(log)
        
        os.unlink(tmp_path)
        
        # 添加到数据存储
        data_store.logs.extend(logs)
        
        return {
            "success": True,
            "count": len(logs),
            "logs": [l.model_dump() for l in logs[:100]]  # 返回前100条
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件解析错误: {str(e)}")

@app.get("/api/logs")
async def get_logs(
    level: Optional[str] = None,
    keyword: Optional[str] = None,
    page: int = 1,
    page_size: int = 20
):
    """获取日志列表"""
    logs = data_store.logs.copy()
    
    if level:
        logs = [l for l in logs if l.level == level]
    if keyword:
        logs = [l for l in logs if keyword.lower() in l.message.lower() or keyword.lower() in l.source.lower()]
    
    total = len(logs)
    start = (page - 1) * page_size
    end = start + page_size
    
    return {
        "logs": [l.model_dump() for l in logs[start:end]],
        "total": total,
        "page": page,
        "page_size": page_size
    }

@app.delete("/api/logs")
async def clear_logs():
    """清空日志"""
    count = len(data_store.logs)
    data_store.logs.clear()
    return {"success": True, "cleared": count}

# ==================== 截图 API ====================
@app.post("/api/screenshots")
async def save_screenshot(
    camera_name: str = Query(...),
    camera_id: Optional[str] = Query(None),
    image_data: str = Query(...)  # Base64编码的图片数据
):
    """保存截图"""
    try:
        # 解析Base64图片数据
        if image_data.startswith('data:image/'):
            # 移除 data:image/xxx;base64, 前缀
            header, data = image_data.split(',', 1)
            img_data = base64.b64decode(data)
            # 从header中提取文件扩展名
            ext = header.split(';')[0].split('/')[-1]
        else:
            img_data = base64.b64decode(image_data)
            ext = 'png'
        
        # 生成文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{uuid.uuid4().hex[:8]}.{ext}"
        filepath = SCREENSHOTS_DIR / filename
        
        # 保存文件
        with open(filepath, 'wb') as f:
            f.write(img_data)
        
        # 创建截图记录
        screenshot = Screenshot(
            filename=filename,
            camera_name=camera_name,
            camera_id=camera_id,
            size=len(img_data),
            timestamp=datetime.now()
        )
        data_store.screenshots[screenshot.id] = screenshot
        
        return {
            "success": True,
            "screenshot": screenshot.model_dump()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存截图失败: {str(e)}")

@app.get("/api/screenshots")
async def get_screenshots(
    page: int = 1,
    page_size: int = 20,
    camera_id: Optional[str] = None,
    camera_name: Optional[str] = None
):
    """获取截图列表"""
    screenshots = list(data_store.screenshots.values())
    
    # 过滤
    if camera_id:
        screenshots = [s for s in screenshots if s.camera_id == camera_id]
    if camera_name:
        screenshots = [s for s in screenshots if camera_name in s.camera_name]
    
    # 按时间倒序
    screenshots.sort(key=lambda x: x.timestamp, reverse=True)
    
    # 分页
    total = len(screenshots)
    start = (page - 1) * page_size
    end = start + page_size
    
    # 转换数据，添加URL
    result = []
    for s in screenshots[start:end]:
        s_dict = s.model_dump()
        s_dict['url'] = f"/api/screenshots/{s.id}/file"
        result.append(s_dict)
    
    return {
        "screenshots": result,
        "total": total,
        "page": page,
        "page_size": page_size
    }

@app.get("/api/screenshots/{screenshot_id}/file")
async def get_screenshot_file(screenshot_id: str):
    """获取截图文件"""
    if screenshot_id not in data_store.screenshots:
        raise HTTPException(status_code=404, detail="截图不存在")
    
    screenshot = data_store.screenshots[screenshot_id]
    filepath = SCREENSHOTS_DIR / screenshot.filename
    
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="截图文件不存在")
    
    return FileResponse(filepath)

@app.delete("/api/screenshots/{screenshot_id}")
async def delete_screenshot(screenshot_id: str):
    """删除截图"""
    if screenshot_id not in data_store.screenshots:
        raise HTTPException(status_code=404, detail="截图不存在")
    
    screenshot = data_store.screenshots[screenshot_id]
    filepath = SCREENSHOTS_DIR / screenshot.filename
    
    # 删除文件
    if filepath.exists():
        os.remove(filepath)
    
    # 删除记录
    del data_store.screenshots[screenshot_id]
    
    return {"success": True}

# ==================== 后台任务 - 模拟预警生成 ====================
@app.on_event("startup")
async def startup_event():
    """应用启动时执行"""
    print("视频监控系统 API 已启动")
    # 启动后台任务模拟预警
    asyncio.create_task(simulate_alarms())

async def simulate_alarms():
    """模拟预警生成"""
    while True:
        await asyncio.sleep(60)  # 每分钟生成一条预警
        if random.random() > 0.5:  # 50% 概率生成预警
            video = random.choice(list(data_store.videos.values()))
            alarm = Alarm(
                camera_id=video.id,
                camera_name=video.name,
                type=random.choice(["motion", "intrusion"]),
                level=random.choice([AlarmLevel.WARNING, AlarmLevel.ERROR]),
                message=f"模拟预警: {video.name} 检测到异常"
            )
            data_store.alarms[alarm.id] = alarm
            await manager.broadcast({
                "type": "new_alarm",
                "data": {"alarm": alarm.model_dump()},
                "timestamp": datetime.now().isoformat()
            })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
