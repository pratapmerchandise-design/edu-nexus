from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Table, UniqueConstraint, TypeDecorator, JSON
)
from sqlalchemy.orm import relationship, backref
from backend.app.database import Base

class UTCDateTime(TypeDecorator):
    impl = DateTime
    cache_ok = True

    def process_result_value(self, value, dialect):
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value

user_interests = Table(
    'user_interests',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('interest_id', Integer, ForeignKey('interests.id', ondelete='CASCADE'), primary_key=True)
)

user_skills = Table(
    'user_skills',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('skill_id', Integer, ForeignKey('skills.id', ondelete='CASCADE'), primary_key=True)
)

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    is_email_verified = Column(Boolean, default=False)
    phone = Column(String(20), nullable=True)
    is_phone_verified = Column(Boolean, default=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default='student', nullable=False) # 'student' or 'admin'
    is_suspended = Column(Boolean, default=False)
    is_banned = Column(Boolean, default=False)
    reset_password_token = Column(String(100), nullable=True)
    reset_password_expires = Column(UTCDateTime, nullable=True)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))
    last_seen = Column(UTCDateTime, default=None)

    profile = relationship('Profile', back_populates='user', uselist=False, cascade='all, delete-orphan')
    posts = relationship('Post', back_populates='author', cascade='all, delete-orphan')
    comments = relationship('Comment', back_populates='author', cascade='all, delete-orphan')
    interests = relationship('Interest', secondary=user_interests, back_populates='users')
    skills = relationship('Skill', secondary=user_skills, back_populates='users')

class Profile(Base):
    __tablename__ = 'profiles'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    country = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    school = Column(String(150), nullable=True)
    grade = Column(String(50), nullable=True)
    dob = Column(String(20), nullable=True)
    goals = Column(Text, nullable=True)
    open_to_collab = Column(Boolean, default=True)
    
    # Privacy toggles
    show_email = Column(Boolean, default=True)
    show_phone = Column(Boolean, default=False)
    show_dob = Column(Boolean, default=False)
    
    updated_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship('User', back_populates='profile')

class OTPVerification(Base):
    __tablename__ = 'otp_verifications'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    contact = Column(String(120), nullable=False) # email or phone
    otp_code = Column(String(10), nullable=False)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(UTCDateTime, nullable=False)
    
    user = relationship('User')

class Interest(Base):
    __tablename__ = 'interests'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)

    users = relationship('User', secondary=user_interests, back_populates='interests')

class Skill(Base):
    __tablename__ = 'skills'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)

    users = relationship('User', secondary=user_skills, back_populates='skills')

class Follow(Base):
    __tablename__ = 'follows'

    follower_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    followed_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    status = Column(String(20), default='pending', nullable=False) # 'pending', 'accepted'
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    follower = relationship('User', foreign_keys=[follower_id], backref='following_relations')
    followed = relationship('User', foreign_keys=[followed_id], backref='follower_relations')

class Post(Base):
    __tablename__ = 'posts'

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(200), nullable=True)
    content = Column(Text, nullable=False)
    post_type = Column(String(20), default='CASUAL', nullable=False) # 'HELP', 'WIN', 'IDEA', 'COLLAB', 'POLL', 'CASUAL'
    reply_privacy = Column(String(100), default='everyone', nullable=False) # comma-separated: 'everyone', 'school', 'followers', 'mentioned'
    tags = Column(String, nullable=True) # e.g. "hackathon,urgent"
    location = Column(String, nullable=True) # e.g. "Library"
    audience = Column(String(20), default='public', nullable=False) # 'public', 'followers', 'community'
    audience_community_id = Column(Integer, nullable=True) # School.id when audience='community'
    is_deleted = Column(Boolean, default=False)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    author = relationship('User', back_populates='posts')
    images = relationship('PostImage', back_populates='post', cascade='all, delete-orphan')
    poll_options = relationship('PollOption', back_populates='post', cascade='all, delete-orphan')
    comments = relationship('Comment', back_populates='post', cascade='all, delete-orphan')
    likes = relationship('Like', back_populates='post', cascade='all, delete-orphan')

class PostImage(Base):
    __tablename__ = 'post_images'

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey('posts.id', ondelete='CASCADE'), nullable=False)
    image_url = Column(String(500), nullable=False)

    post = relationship('Post', back_populates='images')

class PollOption(Base):
    __tablename__ = 'poll_options'

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey('posts.id', ondelete='CASCADE'), nullable=False)
    option_text = Column(String(200), nullable=False)

    post = relationship('Post', back_populates='poll_options')
    votes = relationship('PollVote', back_populates='poll_option', cascade='all, delete-orphan')

class PollVote(Base):
    __tablename__ = 'poll_votes'

    id = Column(Integer, primary_key=True, index=True)
    poll_option_id = Column(Integer, ForeignKey('poll_options.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    __table_args__ = (UniqueConstraint('poll_option_id', 'user_id', name='_user_poll_option_uc'),)

    poll_option = relationship('PollOption', back_populates='votes')

class Like(Base):
    __tablename__ = 'likes'

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey('posts.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (UniqueConstraint('post_id', 'user_id', name='_user_post_like_uc'),)

    post = relationship('Post', back_populates='likes')

class Comment(Base):
    __tablename__ = 'comments'

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey('posts.id', ondelete='CASCADE'), nullable=False)
    author_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    parent_id = Column(Integer, ForeignKey('comments.id', ondelete='SET NULL'), nullable=True)
    content = Column(Text, nullable=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    post = relationship('Post', back_populates='comments')
    author = relationship('User', back_populates='comments')
    replies = relationship('Comment', backref=backref('parent', remote_side=[id]))


class CommentLike(Base):
    __tablename__ = 'comment_likes'

    id = Column(Integer, primary_key=True, index=True)
    comment_id = Column(Integer, ForeignKey('comments.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (UniqueConstraint('comment_id', 'user_id', name='_user_comment_like_uc'),)

    comment = relationship('Comment', backref='likes')
    user = relationship('User')


class SavedPost(Base):
    __tablename__ = 'saved_posts'

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey('posts.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (UniqueConstraint('post_id', 'user_id', name='_user_saved_post_uc'),)

class ForumCategory(Base):
    __tablename__ = 'forum_categories'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)

class ForumThread(Base):
    __tablename__ = 'forum_threads'

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey('forum_categories.id', ondelete='CASCADE'), nullable=False)
    author_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    is_anonymous = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    category = relationship('ForumCategory')
    author = relationship('User')
    replies = relationship('ForumReply', back_populates='thread', cascade='all, delete-orphan')
    upvotes = relationship('ForumUpvote', back_populates='thread', cascade='all, delete-orphan')
    downvotes = relationship('ForumDownvote', back_populates='thread', cascade='all, delete-orphan')

class ForumReply(Base):
    __tablename__ = 'forum_replies'

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey('forum_threads.id', ondelete='CASCADE'), nullable=False)
    author_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    content = Column(Text, nullable=False)
    is_anonymous = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    thread = relationship('ForumThread', back_populates='replies')
    author = relationship('User')

class ForumUpvote(Base):
    __tablename__ = 'forum_upvotes'

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey('forum_threads.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    __table_args__ = (UniqueConstraint('thread_id', 'user_id', name='_user_thread_upvote_uc'),)

    thread = relationship('ForumThread', back_populates='upvotes')

class ForumDownvote(Base):
    __tablename__ = 'forum_downvotes'

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey('forum_threads.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    __table_args__ = (UniqueConstraint('thread_id', 'user_id', name='_user_thread_downvote_uc'),)

    thread = relationship('ForumThread', back_populates='downvotes')

class Opportunity(Base):
    __tablename__ = 'opportunities'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    organization = Column(String(150), nullable=False)
    type = Column(String(50), nullable=False) # 'Competitions', 'Olympiads', 'Scholarships', 'Hackathons', 'Research', 'Summer Programs', 'Internships', 'Other'
    deadline = Column(String(50), nullable=True)
    location = Column(String(100), nullable=True)
    is_online = Column(Boolean, default=True)
    eligibility = Column(String(255), nullable=True)
    age_requirements = Column(String(100), nullable=True)
    grade_requirements = Column(String(100), nullable=True)
    category = Column(String(100), nullable=True)
    external_url = Column(String(500), nullable=True)
    tags = Column(String(255), nullable=True) # comma separated
    status = Column(String(30), default='Open') # 'Open', 'Closing Soon', 'Closed'
    author_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    author = relationship('User')

class OpportunityBookmark(Base):
    __tablename__ = 'opportunity_bookmarks'

    id = Column(Integer, primary_key=True, index=True)
    opportunity_id = Column(Integer, ForeignKey('opportunities.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (UniqueConstraint('opportunity_id', 'user_id', name='_user_opp_bookmark_uc'),)

class Conversation(Base):
    __tablename__ = 'conversations'

    id = Column(Integer, primary_key=True, index=True)
    status = Column(String(30), default='pending') # 'pending', 'accepted', 'rejected'
    initiator_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    is_group = Column(Boolean, default=False)
    name = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    avatar_url = Column(String(255), nullable=True)
    only_admins_can_message = Column(Boolean, default=False)
    only_admins_can_edit_settings = Column(Boolean, default=False)
    is_public = Column(Boolean, default=False)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    initiator = relationship('User', foreign_keys=[initiator_id])
    members = relationship('ConversationMember', back_populates='conversation', cascade='all, delete-orphan')
    messages = relationship('Message', back_populates='conversation', cascade='all, delete-orphan')

class ConversationMember(Base):
    __tablename__ = 'conversation_members'

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    role = Column(String(30), default='member') # 'member', 'admin'
    __table_args__ = (UniqueConstraint('conversation_id', 'user_id', name='_conv_member_uc'),)

    conversation = relationship('Conversation', back_populates='members')
    user = relationship('User')

class GroupRequest(Base):
    __tablename__ = 'group_requests'

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    type = Column(String(30), nullable=False) # 'join_request', 'invitation'
    status = Column(String(30), default='pending') # 'pending', 'accepted', 'rejected'
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    conversation = relationship('Conversation', backref='group_requests')
    user = relationship('User')

class Message(Base):
    __tablename__ = 'messages'

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False)
    sender_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    is_delivered = Column(Boolean, default=False)
    reply_to_id = Column(Integer, ForeignKey('messages.id', ondelete='SET NULL'), nullable=True)
    attachment_url = Column(Text, nullable=True)
    attachment_type = Column(String(50), nullable=True)
    is_poll = Column(Boolean, default=False)
    poll_multiple_answers = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    deleted_by_admin = Column(Boolean, default=False)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    conversation = relationship('Conversation', back_populates='messages')
    sender = relationship('User')
    replies = relationship('Message', backref=backref('replied_to', remote_side=[id]))
    poll_options = relationship('MessagePollOption', back_populates='message', cascade='all, delete-orphan')

class UserDeletedMessage(Base):
    __tablename__ = 'user_deleted_messages'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    message_id = Column(Integer, ForeignKey('messages.id', ondelete='CASCADE'), nullable=False)

    user = relationship('User')
    message = relationship('Message')

class MessagePollOption(Base):
    __tablename__ = 'message_poll_options'

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey('messages.id', ondelete='CASCADE'), nullable=False)
    option_text = Column(String(200), nullable=False)

    message = relationship('Message', back_populates='poll_options')
    votes = relationship('MessagePollVote', back_populates='poll_option', cascade='all, delete-orphan')

class MessagePollVote(Base):
    __tablename__ = 'message_poll_votes'

    id = Column(Integer, primary_key=True, index=True)
    poll_option_id = Column(Integer, ForeignKey('message_poll_options.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    poll_option = relationship('MessagePollOption', back_populates='votes')
    user = relationship('User')

class Notification(Base):
    __tablename__ = 'notifications'

    id = Column(Integer, primary_key=True, index=True)
    recipient_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    sender_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    type = Column(String(50), nullable=False) # 'like', 'comment', 'reply', 'follow', 'message', 'opportunity', 'announcement'
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    link = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    sender = relationship('User', foreign_keys=[sender_id])

class Report(Base):
    __tablename__ = 'reports'

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    target_type = Column(String(50), nullable=False) # 'user', 'post', 'comment', 'forum_thread', 'message'
    target_id = Column(Integer, nullable=False)
    reason = Column(String(100), nullable=False) # 'Spam', 'Harassment', 'Inappropriate content', 'Scam', 'Fake account', 'Other'
    details = Column(Text, nullable=True)
    status = Column(String(30), default='pending') # 'pending', 'resolved', 'dismissed'
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    reporter = relationship('User')

class Block(Base):
    __tablename__ = 'blocks'

    id = Column(Integer, primary_key=True, index=True)
    blocker_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    blocked_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (UniqueConstraint('blocker_id', 'blocked_id', name='_user_block_uc'),)

# School Layer Models

class School(Base):
    __tablename__ = 'schools'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    logo_url = Column(String(255), nullable=True)
    district = Column(String(120), nullable=True, index=True)
    address = Column(String(500), nullable=True)
    city = Column(String(120), nullable=True, index=True)
    state = Column(String(120), nullable=True, index=True)
    country = Column(String(120), nullable=True, default='India', index=True)
    external_id = Column(String(80), nullable=True, index=True)  # e.g. DoE/UDISE id from official source
    verified = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    members = relationship('SchoolMember', back_populates='school', cascade='all, delete-orphan')
    clubs = relationship('SchoolClub', back_populates='school', cascade='all, delete-orphan')
    events = relationship('SchoolEvent', back_populates='school', cascade='all, delete-orphan')
    announcements = relationship('SchoolAnnouncement', back_populates='school', cascade='all, delete-orphan')


class SchoolMember(Base):
    __tablename__ = 'school_members'

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey('schools.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    role = Column(String(50), nullable=False, default='student') # admin, ambassador, student
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    school = relationship('School', back_populates='members')
    user = relationship('User')
    __table_args__ = (UniqueConstraint('school_id', 'user_id', name='_school_user_uc'),)


class SchoolClub(Base):
    __tablename__ = 'school_clubs'

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey('schools.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    ambassador_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    school = relationship('School', back_populates='clubs')
    ambassador = relationship('User')
    members = relationship('SchoolClubMember', back_populates='club', cascade='all, delete-orphan')


class SchoolClubMember(Base):
    __tablename__ = 'school_club_members'

    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey('school_clubs.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    club = relationship('SchoolClub', back_populates='members')
    user = relationship('User')
    __table_args__ = (UniqueConstraint('club_id', 'user_id', name='_club_user_uc'),)


class SchoolEvent(Base):
    __tablename__ = 'school_events'

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey('schools.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    event_type = Column(String(50), nullable=False, default='activity') # competition, activity
    event_date = Column(UTCDateTime, nullable=True)
    created_by_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    school = relationship('School', back_populates='events')
    created_by = relationship('User')


class SchoolAnnouncement(Base):
    __tablename__ = 'school_announcements'

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey('schools.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    author_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    school = relationship('School', back_populates='announcements')
    author = relationship('User')
class SchoolJoinRequest(Base):
    __tablename__ = 'school_join_requests'

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey('schools.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    status = Column(String(30), default='pending') # 'pending', 'approved', 'rejected'
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    school = relationship('School', backref='join_requests')
    user = relationship('User')
    __table_args__ = (UniqueConstraint('school_id', 'user_id', name='_school_join_req_uc'),)


class SchoolSuggestion(Base):
    __tablename__ = 'school_suggestions'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    contact_email = Column(String(120), nullable=True)
    city = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    requester_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    status = Column(String(30), default='pending') # 'pending', 'approved', 'rejected'
    admin_note = Column(Text, nullable=True)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    requester = relationship('User')


class SchoolInvitation(Base):
    __tablename__ = 'school_invitations'

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey('schools.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    email = Column(String(255), nullable=True, index=True)
    invited_by_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    role = Column(String(50), nullable=False, default='admin')
    status = Column(String(30), default='pending')  # 'pending', 'accepted', 'rejected', 'expired'
    token = Column(String(64), unique=True, index=True, nullable=True)
    expires_at = Column(UTCDateTime, nullable=True)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    school = relationship('School')
    user = relationship('User', foreign_keys=[user_id])
    invited_by = relationship('User', foreign_keys=[invited_by_id])


class SchoolRole(Base):
    __tablename__ = 'school_roles'

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey('schools.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(20), default='#22e079')
    permissions = Column(JSON, default={})
    is_system = Column(Boolean, default=False)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    school = relationship('School')


class SchoolJoinLink(Base):
    __tablename__ = 'school_join_links'

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey('schools.id', ondelete='CASCADE'), nullable=False)
    token = Column(String(64), unique=True, index=True, nullable=False)
    role = Column(String(50), default='student')
    expires_at = Column(UTCDateTime, nullable=True)
    max_uses = Column(Integer, nullable=True)
    used_count = Column(Integer, default=0)
    active = Column(Boolean, default=True)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    school = relationship('School')


# Membership / Monetization
class UsageEvent(Base):
    """Monthly usage tracking for freemium quotas (new chats, group joins)."""
    __tablename__ = 'usage_events'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    action = Column(String(40), nullable=False)  # 'new_conversation' | 'group_join'
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship('User')


class UserMembership(Base):
    __tablename__ = 'user_memberships'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    tier = Column(String(20), nullable=False, default='bronze')  # bronze, silver, gold, platinum
    status = Column(String(20), default='active')  # 'active', 'cancelled', 'expired'
    started_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(UTCDateTime, nullable=True)
    auto_renew = Column(Boolean, default=True)
    payment_provider = Column(String(30), nullable=True)  # 'razorpay', 'early_bird_promo', 'mock'
    payment_id = Column(String(120), nullable=True)
    order_id = Column(String(120), nullable=True)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship('User')


class PaymentTransaction(Base):
    __tablename__ = 'payment_transactions'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    tier = Column(String(20), nullable=False)
    order_id = Column(String(120), nullable=True, index=True)
    payment_id = Column(String(120), nullable=True, index=True)
    signature = Column(String(255), nullable=True)
    amount_inr = Column(Integer, nullable=False, default=0)
    currency = Column(String(10), default='INR')
    status = Column(String(30), default='paid')  # 'paid', 'created', 'failed'
    provider = Column(String(30), default='early_bird_promo')  # 'early_bird_promo', 'razorpay', 'mock'
    invoice_number = Column(String(60), nullable=True, unique=True, index=True)
    plan_name = Column(String(50), nullable=True)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship('User')


class NewsletterSubscriber(Base):
    __tablename__ = 'newsletter_subscribers'

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))


class ContactMessage(Base):
    __tablename__ = 'contact_messages'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))


class MessageReaction(Base):
    __tablename__ = 'message_reactions'

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey('messages.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    emoji = Column(String(32), nullable=False)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (UniqueConstraint('message_id', 'user_id', 'emoji', name='_user_message_reaction_uc'),)

    message = relationship('Message', backref=backref('reactions', cascade='all, delete-orphan'))
    user = relationship('User')


class PostReaction(Base):
    __tablename__ = 'post_reactions'

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey('posts.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    emoji = Column(String(32), nullable=False)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (UniqueConstraint('post_id', 'user_id', 'emoji', name='_user_post_reaction_uc'),)

    post = relationship('Post', backref=backref('reactions', cascade='all, delete-orphan'))
    user = relationship('User')


class CommentReaction(Base):
    __tablename__ = 'comment_reactions'

    id = Column(Integer, primary_key=True, index=True)
    comment_id = Column(Integer, ForeignKey('comments.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    emoji = Column(String(32), nullable=False)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (UniqueConstraint('comment_id', 'user_id', 'emoji', name='_user_comment_reaction_uc'),)

    comment = relationship('Comment', backref=backref('reactions', cascade='all, delete-orphan'))
    user = relationship('User')

