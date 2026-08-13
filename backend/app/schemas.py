from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

# --- Auth & User Schemas ---
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=30, pattern=r'^[a-zA-Z0-9_]+$')
    email: EmailStr
    password: str = Field(..., min_length=6)
    dob: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    school: Optional[str] = None
    grade: Optional[str] = None
    interests: Optional[List[str]] = []
    skills: Optional[List[str]] = []

class UserLogin(BaseModel):
    email_or_username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ProfileOut(BaseModel):
    full_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    school: Optional[str] = None
    grade: Optional[str] = None
    dob: Optional[str] = None
    goals: Optional[str] = None
    open_to_collab: bool = True
    show_email: bool = True
    show_phone: bool = False
    show_dob: bool = False

    class Config:
        from_attributes = True

class UserOut(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    is_email_verified: bool = False
    phone: Optional[str] = None
    is_phone_verified: bool = False
    role: str
    is_suspended: bool
    is_banned: bool
    created_at: datetime
    last_seen: Optional[datetime] = None
    profile: Optional[ProfileOut] = None
    interests: List[str] = []
    skills: List[str] = []
    followers_count: int = 0
    following_count: int = 0
    is_following: Optional[bool] = False

    class Config:
        from_attributes = True

class OTPRequest(BaseModel):
    contact: str

class OTPVerify(BaseModel):
    contact: str
    otp_code: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    school: Optional[str] = None
    grade: Optional[str] = None
    goals: Optional[str] = None
    open_to_collab: Optional[bool] = None
    show_email: Optional[bool] = None
    show_phone: Optional[bool] = None
    show_dob: Optional[bool] = None
    interests: Optional[List[str]] = None
    skills: Optional[List[str]] = None

# --- Posts & Feed Schemas ---
class PollOptionCreate(BaseModel):
    option_text: str

class PollOptionOut(BaseModel):
    id: int
    option_text: str
    votes_count: int = 0
    user_voted: bool = False

    class Config:
        from_attributes = True

class PostCreate(BaseModel):
    title: Optional[str] = None
    content: str
    post_type: str = "COLLAB" # HELP, WIN, IDEA, COLLAB, POLL
    image_url: Optional[str] = None
    poll_options: Optional[List[str]] = None
    reply_privacy: str = "everyone"
    tags: Optional[str] = None
    location: Optional[str] = None

class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[int] = None

class CommentOut(BaseModel):
    id: int
    post_id: int
    author_id: int
    author_username: str
    author_name: str
    author_avatar: Optional[str] = None
    parent_id: Optional[int] = None
    content: str
    created_at: datetime
    replies: List['CommentOut'] = []

    class Config:
        from_attributes = True

class PostOut(BaseModel):
    id: int
    author_id: int
    author_username: str
    author_name: str
    author_avatar: Optional[str] = None
    author_school: Optional[str] = None
    title: Optional[str] = None
    content: str
    post_type: str
    reply_privacy: str
    tags: Optional[str] = None
    images: List[str] = []
    poll_options: List[PollOptionOut] = []
    likes_count: int = 0
    comments_count: int = 0
    user_liked: bool = False
    user_saved: bool = False
    created_at: datetime

    class Config:
        from_attributes = True

# --- Forum Schemas ---
class ForumCategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class ForumThreadCreate(BaseModel):
    category_id: int
    title: str
    content: str
    is_anonymous: bool = False

class ForumReplyCreate(BaseModel):
    content: str
    is_anonymous: bool = False

class ForumReplyOut(BaseModel):
    id: int
    thread_id: int
    author_id: int
    author_username: str
    author_name: str
    author_avatar: Optional[str] = None
    content: str
    is_anonymous: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ForumThreadOut(BaseModel):
    id: int
    category_id: int
    category_name: str
    author_id: int
    author_username: str
    author_name: str
    author_avatar: Optional[str] = None
    title: str
    content: str
    is_anonymous: bool
    upvotes_count: int = 0
    downvotes_count: int = 0
    replies_count: int = 0
    user_upvoted: bool = False
    user_downvoted: bool = False
    created_at: datetime

    class Config:
        from_attributes = True

# --- Opportunity Schemas ---
class OpportunityCreate(BaseModel):
    title: str
    description: str
    organization: str
    type: str # 'Competitions', 'Olympiads', 'Scholarships', 'Hackathons', 'Research', 'Summer Programs', 'Internships', 'Other'
    deadline: Optional[str] = None
    location: Optional[str] = None
    is_online: bool = True
    eligibility: Optional[str] = None
    age_requirements: Optional[str] = None
    grade_requirements: Optional[str] = None
    category: Optional[str] = None
    external_url: Optional[str] = None
    tags: Optional[str] = None
    status: str = "Open"

class OpportunityOut(BaseModel):
    id: int
    title: str
    description: str
    organization: str
    type: str
    deadline: Optional[str] = None
    location: Optional[str] = None
    is_online: bool
    eligibility: Optional[str] = None
    age_requirements: Optional[str] = None
    grade_requirements: Optional[str] = None
    category: Optional[str] = None
    external_url: Optional[str] = None
    tags: Optional[str] = None
    status: str
    user_bookmarked: bool = False
    created_at: datetime

    class Config:
        from_attributes = True

# --- Messaging Schemas ---
class ConversationOut(BaseModel):
    id: int
    other_user: UserOut
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    unread_count: int = 0
    status: str
    initiator_id: Optional[int] = None
    updated_at: datetime

    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    content: str

class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    sender_username: str
    sender_name: str
    content: str
    is_read: bool
    is_delivered: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Notification & Moderation Schemas ---
class NotificationOut(BaseModel):
    id: int
    type: str
    title: str
    body: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime
    sender_avatar: Optional[str] = None

    class Config:
        from_attributes = True

class ReportCreate(BaseModel):
    target_type: str # 'user', 'post', 'comment', 'forum_thread', 'message'
    target_id: int
    reason: str # 'Spam', 'Harassment', 'Inappropriate content', 'Scam', 'Fake account', 'Other'
    details: Optional[str] = None

class ReportOut(BaseModel):
    id: int
    reporter_id: int
    reporter_username: str
    target_type: str
    target_id: int
    reason: str
    details: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
