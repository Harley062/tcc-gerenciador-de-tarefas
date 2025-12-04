from uuid import UUID

from fastapi import WebSocket, WebSocketDisconnect

from application.services.auth_service import AuthService
from presentation.websocket.connection_manager import connection_manager


async def handle_websocket(websocket: WebSocket, token: str, auth_service: AuthService) -> None:
    user = await auth_service.get_current_user(token)
    if not user:
        await websocket.close(code=1008, reason="Unauthorized")
        return

    user_id = user.id
    await connection_manager.connect(websocket, user_id)

    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket, user_id)
