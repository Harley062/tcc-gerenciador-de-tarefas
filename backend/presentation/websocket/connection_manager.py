import json
from typing import Any
from uuid import UUID

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[UUID, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: UUID) -> None:
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: UUID) -> None:
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict[str, Any], user_id: UUID) -> None:
        if user_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    disconnected.append(connection)

            for connection in disconnected:
                self.disconnect(connection, user_id)

    async def broadcast_to_user(self, event_type: str, data: dict[str, Any], user_id: UUID) -> None:
        message = {
            "event": event_type,
            "data": data,
            "timestamp": str(data.get("updated_at", data.get("created_at", ""))),
        }
        await self.send_personal_message(message, user_id)


connection_manager = ConnectionManager()
