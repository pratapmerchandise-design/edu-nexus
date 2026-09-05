from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import List, Optional
from datetime import datetime

# --- Auth & User Schemas ---
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=30, pattern=r'^[a-zA-Z0-9_.\-]+$')
    email: EmailStr
    password: str = Field(..., min_length=6)
    dob: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    school: Optional[str] = None
    grade: Optional[str] = None
    school_id: Optional[int] = None
    phone: Optional[str] = None
    interests: Optional[List[str]] = []
    skills: Optional[List[str]] = []

class UserLogin(BaseModel):
    email_or_username: str
    password: str

class CheckAvailabilityRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None

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
    follow_status: Optional[str] = "none" # 'none', 'pending', 'accepted'
    has_pending_request_from: Optional[bool] = False
    pending_requests_count: Optional[int] = 0
    membership: Optional[dict] = None

    @field_validator('interests', mode='before')
    @classmethod
    def serialize_interests(cls, v):
        if not v:
            return []
        res = []
        for item in v:
            if isinstance(item, str):
                res.append(item)
            elif hasattr(item, 'name'):
                res.append(item.name)
            elif isinstance(item, dict) and 'name' in item:
                res.append(item['name'])
        return res

    @field_validator('skills', mode='before')
    @classmethod
    def serialize_skills(cls, v):
        if not v:
            return []
        res = []
        for item in v:
            if isinstance(item, str):
                res.append(item)
            elif hasattr(item, 'name'):
                res.append(item.name)
            elif isinstance(item, dict) and 'name' in item:
                res.append(item['name'])
        return res

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
    post_type: str = "CASUAL" # HELP, WIN, IDEA, COLLAB, POLL, CASUAL
    image_url: Optional[str] = None
    poll_options: Optional[List[str]] = None
    reply_privacy: str = "everyone"
    tags: Optional[str] = None
    location: Optional[str] = None
    audience: Optional[str] = "public"
    community_id: Optional[int] = None

class ReactionOut(BaseModel):
    emoji: str
    count: int = 0
    user_reacted: bool = False
    usernames: List[str] = []

class ReactionCreate(BaseModel):
    emoji: str

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
    likes_count: int = 0
    user_liked: bool = False
    reactions: List[ReactionOut] = []
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
    reactions: List[ReactionOut] = []
    audience: Optional[str] = "public"
    audience_community_id: Optional[int] = None
    location: Optional[str] = None
    author_membership: Optional["MembershipInfoOut"] = None
    # Follow-context: a small sample of people-you-follow who liked or commented.
    # Used to render "Ramesh and Suresh liked this" and similar. Never includes
    # the current user, never includes the post author, capped at 2 per bucket.
    liked_by_following: List["MiniUserOut"] = []
    commented_by_following: List["MiniUserOut"] = []
    created_at: datetime

    class Config:
        from_attributes = True


class MiniUserOut(BaseModel):
    """A tiny user object for follow-context labels and avatars."""
    id: int
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class MembershipInfoOut(BaseModel):
    tier: Optional[str] = None
    color: Optional[str] = None
    is_active: bool = False
    expires_at: Optional[datetime] = None

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
    author_id: Optional[int] = None
    author_username: Optional[str] = None
    author_name: Optional[str] = None
    author_avatar: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Messaging Schemas ---
class ConversationMemberOut(BaseModel):
    id: int
    user: UserOut
    role: str

    class Config:
        from_attributes = True

class GroupRequestOut(BaseModel):
    id: int
    conversation_id: int
    conversation: "ConversationOut"
    user: UserOut
    type: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    is_public: bool = False
    initial_member_usernames: List[str] = []

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    is_public: Optional[bool] = None

class ConversationOut(BaseModel):
    id: int
    is_group: bool
    name: Optional[str] = None
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    is_public: bool
    only_admins_can_message: bool
    only_admins_can_edit_settings: bool

    other_user: Optional[UserOut] = None
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    unread_count: int = 0
    status: str
    initiator_id: Optional[int] = None
    updated_at: datetime
    
    # Only populated for group chats
    member_count: Optional[int] = None
    members: Optional[List[ConversationMemberOut]] = None

    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    content: str
    reply_to_id: Optional[int] = None
    attachment_url: Optional[str] = None
    attachment_type: Optional[str] = None
    is_poll: bool = False
    poll_multiple_answers: bool = False
    poll_options: Optional[List[str]] = None

class MessageReplyOut(BaseModel):
    id: int
    sender_username: str
    content: str
    attachment_type: Optional[str] = None
    is_poll: bool = False

    class Config:
        from_attributes = True

class MessagePollOptionOut(BaseModel):
    id: int
    option_text: str
    votes_count: int
    user_voted: bool

class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    sender_username: str
    sender_name: str
    content: str
    is_read: bool
    is_delivered: bool
    reply_to_id: Optional[int] = None
    replied_to_message: Optional[MessageReplyOut] = None
    attachment_url: Optional[str] = None
    attachment_type: Optional[str] = None
    is_poll: bool = False
    poll_multiple_answers: bool = False
    poll_options: Optional[List[MessagePollOptionOut]] = None
    is_deleted: bool = False
    deleted_by_admin: bool = False
    created_at: Optional[datetime] = None
    sender_avatar: Optional[str] = None
    reactions: List[ReactionOut] = []

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
    sender_username: Optional[str] = None
    sender_id: Optional[int] = None
    is_pending_request: Optional[bool] = True

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

class GroupSettingsUpdate(BaseModel):
    only_admins_can_message: Optional[bool] = None
    only_admins_can_edit_settings: Optional[bool] = None
    name: Optional[str] = None
    description: Optional[str] = None
    avatar_url: Optional[str] = None

# School Layer Schemas

class SchoolBase(BaseModel):
    name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None


class SchoolCreate(SchoolBase):
    district: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    external_id: Optional[str] = None
    verified: Optional[bool] = False


class SchoolOut(SchoolBase):
    id: int
    district: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    external_id: Optional[str] = None
    verified: bool = False
    members_count: Optional[int] = 0
    created_at: datetime

    class Config:
        from_attributes = True


class SchoolMemberBase(BaseModel):
    role: str

class SchoolMemberCreate(SchoolMemberBase):
    user_id: int

class SchoolMemberOut(SchoolMemberBase):
    id: int
    school_id: int
    user: UserOut
    created_at: datetime

    class Config:
        from_attributes = True


class SchoolClubBase(BaseModel):
    name: str
    description: Optional[str] = None

class SchoolClubCreate(SchoolClubBase):
    pass

class SchoolClubOut(SchoolClubBase):
    id: int
    school_id: int
    ambassador: Optional[UserOut] = None
    created_at: datetime
    members_count: Optional[int] = 0

    class Config:
        from_attributes = True


class SchoolEventBase(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: str = 'activity'
    event_date: Optional[datetime] = None

class SchoolEventCreate(SchoolEventBase):
    pass

class SchoolEventOut(SchoolEventBase):
    id: int
    school_id: int
    created_by: Optional[UserOut] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SchoolAnnouncementBase(BaseModel):
    title: str
    content: str

class SchoolAnnouncementCreate(SchoolAnnouncementBase):
    pass

class SchoolAnnouncementOut(SchoolAnnouncementBase):
    id: int
    school_id: int
    author: Optional[UserOut] = None
    created_at: datetime

    class Config:
        from_attributes = True
class SchoolJoinRequestBase(BaseModel):
    school_id: int

class SchoolJoinRequestCreate(SchoolJoinRequestBase):
    pass

class SchoolJoinRequestOut(SchoolJoinRequestBase):
    id: int
    user_id: int
    user: Optional[UserOut] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class SchoolSuggestionBase(BaseModel):
    name: str
    description: Optional[str] = None
    contact_email: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None

class SchoolSuggestionCreate(SchoolSuggestionBase):
    pass

class SchoolSuggestionOut(SchoolSuggestionBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class SchoolAdminCreate(BaseModel):
    school_id: int
    username: str = Field(..., min_length=3, max_length=30, pattern=r'^[a-zA-Z0-9_]+$')
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2, max_length=100)


class SchoolClubMemberOut(BaseModel):
    id: int
    club_id: int
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True


class SchoolJoinLinkCreate(BaseModel):
    role: Optional[str] = 'student'
    expires_at: Optional[datetime] = None
    max_uses: Optional[int] = None


class SchoolJoinLinkOut(BaseModel):
    id: int
    school_id: int
    token: str
    link: str
    role: str
    expires_at: Optional[datetime] = None
    max_uses: Optional[int] = None
    used_count: int = 0
    active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


class SchoolJoinPreview(BaseModel):
    school_id: int
    school_name: str
    role: str
    requires_login: bool = True
    already_member: bool = False
    valid: bool = True
    message: Optional[str] = None


class SchoolRoleBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = '#22e079'
    permissions: Optional[dict] = {}


class SchoolRoleCreate(SchoolRoleBase):
    pass


class SchoolRoleOut(SchoolRoleBase):
    id: int
    school_id: int
    is_system: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class SchoolMemberRoleUpdate(BaseModel):
    role: str


class SchoolInvitationCreate(BaseModel):
    username_or_email: str
    role: Optional[str] = 'student'


class SchoolInvitationOut(BaseModel):
    id: int
    school_id: int
    user_id: Optional[int] = None
    email: Optional[str] = None
    token: Optional[str] = None
    expires_at: Optional[datetime] = None
    invited_by_id: Optional[int] = None
    role: str
    status: str
    created_at: datetime
    school: Optional['SchoolOut'] = None
    school_name: Optional[str] = None
    user: Optional[UserOut] = None
    invited_by: Optional[UserOut] = None
    invited_by_username: Optional[str] = None

    class Config:
        from_attributes = True


class SchoolAdminInviteCreate(BaseModel):
    email: str
    school_id: Optional[int] = None
    school_name: Optional[str] = None
    expires_in_days: Optional[int] = 7


class SchoolAdminInviteRespond(BaseModel):
    action: str  # 'accept' or 'reject'
    full_name: Optional[str] = None
    password: Optional[str] = None


# --- Membership / Monetization Schemas ---
class MembershipTierOut(BaseModel):
    key: str
    name: str
    price_inr: int
    color: str
    boost: float
    upload_mb: int
    poll_options: int
    perks: List[str] = []

    class Config:
        from_attributes = True


class UserMembershipOut(BaseModel):
    id: int
    tier: str
    status: str
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    auto_renew: bool = True
    name: str
    color: str
    perks: List[str] = []
    payment_provider: Optional[str] = None
    days_remaining: Optional[int] = None
    invoice_number: Optional[str] = None
    is_early_bird: bool = False

    class Config:
        from_attributes = True


class SubscribeRequest(BaseModel):
    tier: str  # 'bronze', 'silver', 'gold', 'platinum'
    payment_id: Optional[str] = None
    order_id: Optional[str] = None


class EarlyBirdClaimRequest(BaseModel):
    tier: str  # 'bronze', 'silver', 'gold', 'platinum'
    promo_code: Optional[str] = "EARLYBIRD_FREE30"
    role_or_occupation: Optional[str] = None
    field_of_study: Optional[str] = None
    primary_goal: Optional[str] = None
    institution_name: Optional[str] = None


class PaymentTransactionOut(BaseModel):
    id: int
    tier: str
    order_id: Optional[str] = None
    payment_id: Optional[str] = None
    amount_inr: int
    currency: str = "INR"
    status: str
    provider: str
    invoice_number: Optional[str] = None
    plan_name: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RazorpayOrderOut(BaseModel):
    order_id: str
    amount: int
    currency: str = "INR"
    key_id: Optional[str] = None
    tier: str
    plan_name: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None


class VerifyPaymentRequest(BaseModel):
    tier: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentConfigOut(BaseModel):
    razorpay_key_id: Optional[str] = None
    currency: str = "INR"
    is_live: bool = False
    early_bird_active: bool = True

