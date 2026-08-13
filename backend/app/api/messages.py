from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Dict, Set, Optional
from datetime import datetime, timezone
import json

from backend.app.database import get_db, SessionLocal
from backend.app.models import Conversation, ConversationMember, Message, User, Notification, Block
from backend.app.schemas import ConversationOut, MessageCreate, MessageOut
from backend.app.auth.security import get_current_user, SECRET_KEY, ALGORITHM
from jose import jwt, JWTError
from backend.app.utils import format_user_out

router = APIRouter(prefix="/conversations", tags=["Messaging"])

# Connection Manager for WebSockets
class ConnectionManager:
    def __init__(self):
        # Maps conversation_id -> List[WebSocket]
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, conversation_id: int, websocket: WebSocket):
        await websocket.accept()
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = []
        self.active_connections[conversation_id].append(websocket)

    def disconnect(self, conversation_id: int, websocket: WebSocket):
        if conversation_id in self.active_connections:
            if websocket in self.active_connections[conversation_id]:
                self.active_connections[conversation_id].remove(websocket)
            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]

    async def broadcast_message(self, conversation_id: int, data: dict):
        if conversation_id in self.active_connections:
            for ws in list(self.active_connections[conversation_id]):
                try:
                    await ws.send_json(data)
                except Exception:
                    pass

manager = ConnectionManager()

@router.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: int):
    await manager.connect(conversation_id, websocket)
    try:
        while True:
            data_str = await websocket.receive_text()
            try:
                data = json.loads(data_str)
                if data.get("type") == "typing":
                    # Broadcast typing event to other clients in conversation
                    await manager.broadcast_message(conversation_id, data)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(conversation_id, websocket)

def format_conv_out(conv: Conversation, current_user_id: int, db: Session) -> dict:
    other_member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conv.id,
        ConversationMember.user_id != current_user_id
    ).first()

    other_user = None
    if other_member:
        other_user = format_user_out(other_member.user, current_user_id, db)
    else:
        self_member = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == conv.id
        ).first()
        if self_member:
            other_user = format_user_out(self_member.user, current_user_id, db)

    last_msg = db.query(Message).filter(Message.conversation_id == conv.id).order_by(Message.created_at.desc()).first()
    unread_cnt = db.query(Message).filter(
        Message.conversation_id == conv.id,
        Message.sender_id != current_user_id,
        Message.is_read == False
    ).count()

    last_time = last_msg.created_at if last_msg else conv.updated_at

    return {
        "id": conv.id,
        "other_user": other_user,
        "last_message": last_msg.content if last_msg else None,
        "last_message_time": last_time,
        "unread_count": unread_cnt,
        "status": conv.status,
        "initiator_id": conv.initiator_id,
        "updated_at": conv.updated_at
    }

@router.get("", response_model=List[ConversationOut])
async def get_conversations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    memberships = db.query(ConversationMember).filter(ConversationMember.user_id == current_user.id).all()
    conv_ids = [m.conversation_id for m in memberships]

    # Mark unread messages sent to this user as delivered
    undelivered = db.query(Message).filter(
        Message.conversation_id.in_(conv_ids),
        Message.sender_id != current_user.id,
        Message.is_delivered == False
    ).all()
    
    if undelivered:
        delivered_convs = set()
        for m in undelivered:
            m.is_delivered = True
            delivered_convs.add(m.conversation_id)
        db.commit()
        
        # Broadcast delivery receipts
        for cid in delivered_convs:
            await manager.broadcast_message(cid, {"type": "receipt", "conversation_id": cid, "status": "delivered"})

    convs = db.query(Conversation).filter(Conversation.id.in_(conv_ids)).order_by(Conversation.updated_at.desc()).all()
    return [format_conv_out(c, current_user.id, db) for c in convs]

@router.post("")
def start_or_get_conversation(target_username: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target_user = db.query(User).filter(User.username == target_username.lower()).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found")

    is_blocked = db.query(Block).filter(
        ((Block.blocker_id == current_user.id) & (Block.blocked_id == target_user.id)) |
        ((Block.blocker_id == target_user.id) & (Block.blocked_id == current_user.id))
    ).first()
    if is_blocked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot message this user due to block settings.")

    my_conv_ids = [m.conversation_id for m in db.query(ConversationMember).filter(ConversationMember.user_id == current_user.id).all()]
    target_conv_ids = [m.conversation_id for m in db.query(ConversationMember).filter(ConversationMember.user_id == target_user.id).all()]

    common_ids = set(my_conv_ids).intersection(set(target_conv_ids))
    for cid in common_ids:
        cnt = db.query(ConversationMember).filter(ConversationMember.conversation_id == cid).count()
        if cnt <= 2:
            conv = db.query(Conversation).filter(Conversation.id == cid).first()
            return format_conv_out(conv, current_user.id, db)

    new_conv = Conversation(initiator_id=current_user.id, status="pending")
    db.add(new_conv)
    db.flush()

    m1 = ConversationMember(conversation_id=new_conv.id, user_id=current_user.id)
    db.add(m1)
    if target_user.id != current_user.id:
        m2 = ConversationMember(conversation_id=new_conv.id, user_id=target_user.id)
        db.add(m2)

    db.commit()
    db.refresh(new_conv)
    return format_conv_out(new_conv, current_user.id, db)

@router.get("/{conversation_id}/messages", response_model=List[MessageOut])
async def get_messages(conversation_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this conversation.")

    unread = db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.sender_id != current_user.id,
        (Message.is_read == False) | (Message.is_delivered == False)
    ).all()

    if unread:
        for m in unread:
            m.is_read = True
            m.is_delivered = True
        db.commit()
        await manager.broadcast_message(conversation_id, {"type": "receipt", "conversation_id": conversation_id, "status": "read"})

    messages = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at.asc()).all()
    res = []
    for m in messages:
        sender = m.sender
        res.append({
            "id": m.id,
            "conversation_id": m.conversation_id,
            "sender_id": m.sender_id,
            "sender_username": sender.username if sender else "unknown",
            "sender_name": sender.profile.full_name if sender and sender.profile else (sender.username if sender else "Unknown"),
            "content": m.content,
            "is_read": m.is_read,
            "is_delivered": m.is_delivered,
            "created_at": m.created_at
        })
    return res

@router.post("/{conversation_id}/messages")
async def send_message_rest(conversation_id: int, data: MessageCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this conversation.")

    new_msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=data.content
    )
    db.add(new_msg)

    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conv:
        conv.updated_at = datetime.now(timezone.utc)
        # Auto-accept request if recipient replies
        if conv.status == "pending" and conv.initiator_id != current_user.id:
            conv.status = "accepted"

    other_member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id != current_user.id
    ).first()

    if other_member:
        notif = Notification(
            recipient_id=other_member.user_id,
            sender_id=current_user.id,
            type="message",
            title="New Message",
            body=f"{current_user.profile.full_name if current_user.profile else current_user.username}: '{data.content[:40]}...'",
            link=f"/app/messages?conv={conversation_id}"
        )
        db.add(notif)

    db.commit()
    db.refresh(new_msg)

    msg_payload = {
        "id": new_msg.id,
        "conversation_id": new_msg.conversation_id,
        "sender_id": new_msg.sender_id,
        "sender_username": current_user.username,
        "sender_name": current_user.profile.full_name if current_user.profile else current_user.username,
        "content": new_msg.content,
        "is_read": new_msg.is_read,
        "is_delivered": new_msg.is_delivered,
        "created_at": new_msg.created_at.isoformat() if new_msg.created_at else None
    }

    # Broadcast real-time to active WebSocket subscribers
    await manager.broadcast_message(conversation_id, msg_payload)
    return msg_payload

@router.post("/{conversation_id}/accept")
def accept_request(conversation_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv or conv.status != "pending" or conv.initiator_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot accept this request.")
    
    conv.status = "accepted"
    db.commit()
    return {"message": "Request accepted"}

@router.post("/{conversation_id}/reject")
def reject_request(conversation_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv or conv.status != "pending" or conv.initiator_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot reject this request.")
    
    conv.status = "rejected"
    db.commit()
    return {"message": "Request rejected"}
