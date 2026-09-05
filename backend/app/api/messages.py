from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Dict, Set, Optional
from datetime import datetime, timezone
import json

from backend.app.database import get_db, SessionLocal
from backend.app.models import Conversation, ConversationMember, Message, User, Notification, Block, GroupRequest, MessagePollOption, MessagePollVote, UserDeletedMessage, Follow
from backend.app.schemas import ConversationOut, MessageCreate, MessageOut, GroupCreate, GroupRequestOut, GroupUpdate, GroupSettingsUpdate
from backend.app.auth.security import get_current_user, SECRET_KEY, ALGORITHM
from jose import jwt, JWTError
from backend.app.utils import format_user_out
from backend.app.quotas import quota_status, quota_error_detail, log_event

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
    base_dict = {
        "id": conv.id,
        "is_group": conv.is_group,
        "name": conv.name,
        "description": conv.description,
        "avatar_url": conv.avatar_url,
        "is_public": conv.is_public,
        "only_admins_can_message": conv.only_admins_can_message,
        "only_admins_can_edit_settings": conv.only_admins_can_edit_settings,
        "status": conv.status,
        "initiator_id": conv.initiator_id,
        "updated_at": conv.updated_at
    }

    last_msg = db.query(Message).filter(Message.conversation_id == conv.id).order_by(Message.created_at.desc()).first()
    unread_cnt = db.query(Message).filter(
        Message.conversation_id == conv.id,
        Message.sender_id != current_user_id,
        Message.is_read == False
    ).count()

    base_dict["last_message"] = last_msg.content if last_msg else None
    base_dict["last_message_time"] = last_msg.created_at if last_msg else conv.updated_at
    base_dict["unread_count"] = unread_cnt

    if conv.is_group:
        # Group logic
        members_query = db.query(ConversationMember).filter(ConversationMember.conversation_id == conv.id).all()
        base_dict["member_count"] = len(members_query)
        base_dict["members"] = [
            {
                "id": m.id,
                "role": m.role,
                "user": format_user_out(m.user, current_user_id, db)
            } for m in members_query
        ]
        base_dict["other_user"] = None
    else:
        # 1-on-1 logic
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
        
        base_dict["other_user"] = other_user
        base_dict["member_count"] = None
        base_dict["members"] = None

    return base_dict

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

    is_mutual_follow = (
        db.query(Follow).filter(Follow.follower_id == current_user.id, Follow.followed_id == target_user.id, Follow.status == 'accepted').first() is not None and
        db.query(Follow).filter(Follow.follower_id == target_user.id, Follow.followed_id == current_user.id, Follow.status == 'accepted').first() is not None
    )

    common_ids = set(my_conv_ids).intersection(set(target_conv_ids))
    for cid in common_ids:
        cnt = db.query(ConversationMember).filter(ConversationMember.conversation_id == cid).count()
        if cnt <= 2:
            conv = db.query(Conversation).filter(Conversation.id == cid).first()
            if conv and conv.status == "pending" and is_mutual_follow:
                conv.status = "accepted"
                db.commit()
            return format_conv_out(conv, current_user.id, db)

    conv_status = "accepted" if is_mutual_follow else "pending"
    new_conv = Conversation(initiator_id=current_user.id, status=conv_status)

    # Freemium quota: limit NEW conversations with new people (Tinder/Bumble style)
    qs = quota_status(db, current_user.id, 'new_conversation')
    if not qs['allowed']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=quota_error_detail(qs))

    db.add(new_conv)
    db.flush()

    m1 = ConversationMember(conversation_id=new_conv.id, user_id=current_user.id)
    db.add(m1)
    if target_user.id != current_user.id:
        m2 = ConversationMember(conversation_id=new_conv.id, user_id=target_user.id)
        db.add(m2)

    log_event(db, current_user.id, 'new_conversation')
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

    # Get IDs of messages the user deleted for themselves
    deleted_msgs = db.query(UserDeletedMessage.message_id).filter(UserDeletedMessage.user_id == current_user.id).all()
    deleted_msg_ids = {m[0] for m in deleted_msgs}

    all_messages = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at.asc()).all()
    messages = [m for m in all_messages if m.id not in deleted_msg_ids]

    res = []
    for m in messages:
        sender = m.sender
        replied_data = None
        if m.replied_to:
            replied_sender = m.replied_to.sender
            replied_data = {
                "id": m.replied_to.id,
                "content": m.replied_to.content,
                "sender_username": replied_sender.username if replied_sender else "unknown",
                "sender_name": replied_sender.profile.full_name if replied_sender and replied_sender.profile else (replied_sender.username if replied_sender else "Unknown")
            }
        poll_opts = None
        if m.is_poll:
            poll_opts = []
            for opt in m.poll_options:
                user_voted = any(v.user_id == current_user.id for v in opt.votes)
                poll_opts.append({
                    "id": opt.id,
                    "option_text": opt.option_text,
                    "votes_count": len(opt.votes),
                    "user_voted": user_voted
                })

        res.append({
            "id": m.id,
            "conversation_id": m.conversation_id,
            "sender_id": m.sender_id,
            "sender_username": sender.username if sender else "unknown",
            "sender_name": sender.profile.full_name if sender and sender.profile else (sender.username if sender else "Unknown"),
            "content": m.content,
            "is_read": m.is_read,
            "is_delivered": m.is_delivered,
            "reply_to_id": m.reply_to_id,
            "replied_to_message": replied_data,
            "attachment_url": m.attachment_url,
            "attachment_type": m.attachment_type,
            "is_poll": m.is_poll,
            "poll_multiple_answers": m.poll_multiple_answers,
            "poll_options": poll_opts,
            "is_deleted": m.is_deleted,
            "deleted_by_admin": m.deleted_by_admin,
            "created_at": m.created_at,
            "sender_avatar": sender.profile.avatar_url if sender and sender.profile else None
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

    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conv.is_group and conv.only_admins_can_message and membership.role != 'admin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can send messages in this group.")

    new_msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=data.content,
        reply_to_id=data.reply_to_id,
        attachment_url=data.attachment_url,
        attachment_type=data.attachment_type,
        is_poll=data.is_poll,
        poll_multiple_answers=data.poll_multiple_answers
    )
    db.add(new_msg)
    db.commit() # Need to commit to get new_msg.id for poll options

    if data.is_poll and data.poll_options:
        for opt_text in data.poll_options:
            opt = MessagePollOption(message_id=new_msg.id, option_text=opt_text)
            db.add(opt)
        db.commit()

    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conv:
        conv.updated_at = datetime.now(timezone.utc)
        
        if conv.status == "pending":
            if conv.initiator_id == current_user.id:
                # Initiator can only send one message until accepted
                msg_count = db.query(Message).filter(Message.conversation_id == conversation_id).count()
                if msg_count >= 1:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only send one message before the request is accepted.")
            else:
                # Auto-accept request if recipient replies
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

    replied_data = None
    if new_msg.replied_to:
        replied_sender = new_msg.replied_to.sender
        replied_data = {
            "id": new_msg.replied_to.id,
            "content": new_msg.replied_to.content,
            "sender_username": replied_sender.username if replied_sender else "unknown",
            "sender_name": replied_sender.profile.full_name if replied_sender and replied_sender.profile else (replied_sender.username if replied_sender else "Unknown")
        }

    msg_payload = {
        "id": new_msg.id,
        "conversation_id": new_msg.conversation_id,
        "sender_id": new_msg.sender_id,
        "sender_username": current_user.username,
        "sender_name": current_user.profile.full_name if current_user.profile else current_user.username,
        "content": new_msg.content,
        "is_read": new_msg.is_read,
        "is_delivered": new_msg.is_delivered,
        "reply_to_id": new_msg.reply_to_id,
        "replied_to_message": replied_data,
        "attachment_url": new_msg.attachment_url,
        "attachment_type": new_msg.attachment_type,
        "created_at": new_msg.created_at.isoformat() if new_msg.created_at else None,
        "sender_avatar": current_user.profile.avatar_url if current_user.profile else None
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

@router.post("/groups", response_model=ConversationOut)
def create_group(data: GroupCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_group = Conversation(
        is_group=True,
        name=data.name,
        description=data.description,
        avatar_url=data.avatar_url,
        is_public=data.is_public,
        status="accepted",
        initiator_id=current_user.id
    )
    db.add(new_group)
    db.flush()

    admin_member = ConversationMember(conversation_id=new_group.id, user_id=current_user.id, role="admin")
    db.add(admin_member)

    for username in data.initial_member_usernames:
        u = db.query(User).filter(User.username == username.lower()).first()
        if u and u.id != current_user.id:
            m = ConversationMember(conversation_id=new_group.id, user_id=u.id, role="member")
            db.add(m)
            
            notif = Notification(
                recipient_id=u.id,
                sender_id=current_user.id,
                type="message",
                title="Added to Group",
                body=f"{current_user.profile.full_name or current_user.username} added you to group '{data.name}'",
                link=f"/app/messages?conv={new_group.id}"
            )
            db.add(notif)

    db.commit()
    db.refresh(new_group)
    return format_conv_out(new_group, current_user.id, db)

@router.get("/groups/discover", response_model=List[ConversationOut])
def discover_groups(q: str = "", current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Conversation).filter(Conversation.is_group == True)
    if q:
        query = query.filter(Conversation.name.ilike(f"%{q}%"))
    
    # Prioritize public groups, but show private groups if name matches
    groups = query.order_by(Conversation.name.asc()).limit(50).all()
    
    return [format_conv_out(g, current_user.id, db) for g in groups]

@router.post("/{group_id}/join")
def join_group(group_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    group = db.query(Conversation).filter(Conversation.id == group_id, Conversation.is_group == True).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    existing = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == group_id, 
        ConversationMember.user_id == current_user.id
    ).first()
    
    if existing:
        return {"message": "Already a member"}
         
    # Freemium quota: limit group joins per 24h (Tinder/Bumble style)
    qs = quota_status(db, current_user.id, 'group_join')
    if not qs['allowed']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=quota_error_detail(qs))

    if group.is_public:
        new_member = ConversationMember(conversation_id=group_id, user_id=current_user.id, role="member")
        db.add(new_member)
        log_event(db, current_user.id, 'group_join')
        db.commit()
        return {"message": "Joined group"}
    else:
        # Request to join private group
        req = db.query(GroupRequest).filter(
            GroupRequest.conversation_id == group_id,
            GroupRequest.user_id == current_user.id,
            GroupRequest.type == "join_request"
        ).first()
        
        if req:
            return {"message": "Request already pending"}
            
        new_req = GroupRequest(conversation_id=group_id, user_id=current_user.id, type="join_request", status="pending")
        db.add(new_req)
        log_event(db, current_user.id, 'group_join')
        
        # Notify admins
        admins = db.query(ConversationMember).filter(ConversationMember.conversation_id == group_id, ConversationMember.role == "admin").all()
        for admin in admins:
            notif = Notification(
                recipient_id=admin.user_id,
                sender_id=current_user.id,
                type="message",
                title="Group Join Request",
                body=f"{current_user.username} requested to join '{group.name}'",
                link=f"/app/messages?conv={group_id}"
            )
            db.add(notif)
            
        db.commit()
        return {"message": "Join request sent"}

@router.post("/{group_id}/invite/{target_username}")
def invite_to_group(group_id: int, target_username: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    group = db.query(Conversation).filter(Conversation.id == group_id, Conversation.is_group == True).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    admin_check = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == group_id,
        ConversationMember.user_id == current_user.id,
        ConversationMember.role == "admin"
    ).first()
    
    if not admin_check:
        raise HTTPException(status_code=403, detail="Only admins can invite")
        
    target = db.query(User).filter(User.username == target_username.lower()).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
        
    existing = db.query(ConversationMember).filter(ConversationMember.conversation_id == group_id, ConversationMember.user_id == target.id).first()
    if existing:
        return {"message": "Already a member"}
        
    new_req = GroupRequest(conversation_id=group_id, user_id=target.id, type="invitation", status="pending")
    db.add(new_req)
    
    notif = Notification(
        recipient_id=target.id,
        sender_id=current_user.id,
        type="message",
        title="Group Invitation",
        body=f"{current_user.username} invited you to join '{group.name}'",
        link=f"/app/messages?conv={group_id}"
    )
    db.add(notif)
    db.commit()
    return {"message": "Invitation sent"}

@router.get("/requests/group", response_model=List[GroupRequestOut])
def get_group_requests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    invitations = db.query(GroupRequest).filter(
        GroupRequest.user_id == current_user.id,
        GroupRequest.type == "invitation",
        GroupRequest.status == "pending"
    ).all()
    
    admin_groups = db.query(ConversationMember.conversation_id).filter(
        ConversationMember.user_id == current_user.id,
        ConversationMember.role == "admin"
    ).all()
    admin_group_ids = [g[0] for g in admin_groups]
    
    join_requests = []
    if admin_group_ids:
        join_requests = db.query(GroupRequest).filter(
            GroupRequest.conversation_id.in_(admin_group_ids),
            GroupRequest.type == "join_request",
            GroupRequest.status == "pending"
        ).all()
        
    return invitations + join_requests


@router.post("/requests/{req_id}/accept")
def accept_group_request(req_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    req = db.query(GroupRequest).filter(GroupRequest.id == req_id).first()
    if not req or req.status != "pending":
        raise HTTPException(status_code=404, detail="Request not found or already processed")
        
    if req.type == "join_request":
        admin_check = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == req.conversation_id,
            ConversationMember.user_id == current_user.id,
            ConversationMember.role == "admin"
        ).first()
        if not admin_check:
            raise HTTPException(status_code=403, detail="Only admins can accept join requests")
            
        req.status = "accepted"
        m = ConversationMember(conversation_id=req.conversation_id, user_id=req.user_id, role="member")
        db.add(m)
        db.commit()
        return {"message": "Request accepted"}
        
    elif req.type == "invitation":
        if req.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your invitation")

        # Freemium quota also applies to invited memberships: a free user cannot be
        # invited into more groups than their daily cap (prevents bypassing the limit
        # by being added by others).
        qs = quota_status(db, current_user.id, 'group_join')
        if not qs['allowed']:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=quota_error_detail(qs))

        req.status = "accepted"
        m = ConversationMember(conversation_id=req.conversation_id, user_id=req.user_id, role="member")
        db.add(m)
        log_event(db, current_user.id, 'group_join')
        db.commit()
        return {"message": "Invitation accepted"}

@router.post("/requests/{req_id}/reject")
def reject_group_request(req_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    req = db.query(GroupRequest).filter(GroupRequest.id == req_id).first()
    if not req or req.status != "pending":
        raise HTTPException(status_code=404, detail="Request not found or already processed")
        
    if req.type == "join_request":
        admin_check = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == req.conversation_id,
            ConversationMember.user_id == current_user.id,
            ConversationMember.role == "admin"
        ).first()
        if not admin_check:
            raise HTTPException(status_code=403, detail="Only admins can reject join requests")
            
    elif req.type == "invitation":
        if req.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your invitation")
            
    req.status = "rejected"
    db.commit()
    return {"message": "Request rejected"}

@router.put("/{group_id}/members/{user_id}/role")
def update_group_role(group_id: int, user_id: int, role: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if role not in ["admin", "member"]:
        raise HTTPException(status_code=400, detail="Invalid role")
        
    admin_check = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == group_id,
        ConversationMember.user_id == current_user.id,
        ConversationMember.role == "admin"
    ).first()
    if not admin_check:
        raise HTTPException(status_code=403, detail="Only admins can change roles")
        
    target_member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == group_id,
        ConversationMember.user_id == user_id
    ).first()
    
    if not target_member:
        raise HTTPException(status_code=404, detail="Member not found in group")
        
    target_member.role = role
    db.commit()
    return {"message": f"Role updated to {role}"}

@router.post("/messages/{message_id}/vote")
def vote_message_poll(message_id: int, option_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg or not msg.is_poll:
        raise HTTPException(status_code=404, detail="Poll not found")
        
    opt = db.query(MessagePollOption).filter(MessagePollOption.id == option_id, MessagePollOption.message_id == message_id).first()
    if not opt:
        raise HTTPException(status_code=404, detail="Option not found")
        
    existing_vote_for_opt = db.query(MessagePollVote).filter(
        MessagePollVote.poll_option_id == option_id,
        MessagePollVote.user_id == current_user.id
    ).first()
    
    if msg.poll_multiple_answers:
        if existing_vote_for_opt:
            db.delete(existing_vote_for_opt)
            db.commit()
            return {"message": "Vote removed"}
        else:
            new_vote = MessagePollVote(poll_option_id=option_id, user_id=current_user.id)
            db.add(new_vote)
            db.commit()
            return {"message": "Vote added"}
    else:
        # Single choice
        if existing_vote_for_opt:
            db.delete(existing_vote_for_opt)
            db.commit()
            return {"message": "Vote removed"}
            
        # Remove any other votes by this user for this poll
        other_votes = db.query(MessagePollVote).join(MessagePollOption).filter(
            MessagePollOption.message_id == message_id,
            MessagePollVote.user_id == current_user.id
        ).all()
        for v in other_votes:
            db.delete(v)
            
        new_vote = MessagePollVote(poll_option_id=option_id, user_id=current_user.id)
        db.add(new_vote)
        db.commit()
        return {"message": "Vote registered"}

@router.delete("/messages/{message_id}")
async def delete_message(message_id: int, delete_type: str = 'me', current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # delete_type can be 'me' or 'everyone'
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == msg.conversation_id,
        ConversationMember.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Access denied")
        
    if delete_type == 'me':
        # Check if already deleted
        existing = db.query(UserDeletedMessage).filter(UserDeletedMessage.user_id == current_user.id, UserDeletedMessage.message_id == message_id).first()
        if not existing:
            udm = UserDeletedMessage(user_id=current_user.id, message_id=message_id)
            db.add(udm)
            db.commit()
        return {"detail": "Message deleted for you"}
        
    elif delete_type == 'everyone':
        # Check permissions: must be sender OR an admin of the group
        if msg.sender_id != current_user.id and membership.role != 'admin':
            raise HTTPException(status_code=403, detail="Not authorized to delete for everyone")
            
        msg.is_deleted = True
        msg.content = "This message was deleted"
        msg.attachment_url = None
        msg.attachment_type = None
        msg.is_poll = False
        msg.poll_options = []
        if msg.sender_id != current_user.id and membership.role == 'admin':
            msg.deleted_by_admin = True
            msg.content = "This message was deleted by an admin"
            
        db.commit()
        
        # Broadcast the deletion
        import asyncio
        asyncio.create_task(manager.broadcast_message(msg.conversation_id, {
            "type": "message_deleted",
            "message_id": message_id,
            "conversation_id": msg.conversation_id
        }))
        
        return {"detail": "Message deleted for everyone"}
        
    raise HTTPException(status_code=400, detail="Invalid delete_type")

@router.put("/{conversation_id}/settings", response_model=ConversationOut)
def update_group_settings(conversation_id: int, settings: GroupSettingsUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv or not conv.is_group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member")
        
    if conv.only_admins_can_edit_settings and membership.role != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can update group settings")
        
    if settings.only_admins_can_message is not None:
        conv.only_admins_can_message = settings.only_admins_can_message
    if settings.only_admins_can_edit_settings is not None:
        conv.only_admins_can_edit_settings = settings.only_admins_can_edit_settings
    if settings.name is not None:
        conv.name = settings.name
    if settings.description is not None:
        conv.description = settings.description
    if settings.avatar_url is not None:
        conv.avatar_url = settings.avatar_url
        
    db.commit()
    db.refresh(conv)
    
    # Broadcast the updated settings to everyone in the group
    import asyncio
    asyncio.create_task(manager.broadcast_message(conversation_id, {
        "type": "group_settings_updated",
        "conversation_id": conversation_id,
        "only_admins_can_message": conv.only_admins_can_message,
        "only_admins_can_edit_settings": conv.only_admins_can_edit_settings,
        "name": conv.name,
        "description": conv.description,
        "avatar_url": conv.avatar_url
    }))
    
    return conv

@router.delete("/{conversation_id}/leave")
def leave_group(conversation_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv or not conv.is_group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(status_code=400, detail="You are not a member of this group")
        
    # Check if user is the only admin
    if membership.role == 'admin':
        admin_count = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.role == 'admin'
        ).count()
        
        if admin_count == 1:
            # Find the oldest member to promote
            oldest_member = db.query(ConversationMember).filter(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id != current_user.id
            ).order_by(ConversationMember.joined_at.asc()).first()
            
            if oldest_member:
                oldest_member.role = 'admin'
            else:
                # Last member leaving, delete the group
                db.delete(conv)
                db.commit()
                return {"message": "Left and deleted group"}
                
    db.delete(membership)
    # Also delete user's messages? No, leave them for history.
    db.commit()
    
    return {"message": "Successfully left the group"}
