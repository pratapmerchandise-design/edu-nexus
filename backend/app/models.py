from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Table, UniqueConstraint, TypeDecorator
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
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

class Post(Base):
    __tablename__ = 'posts'

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(200), nullable=True)
    content = Column(Text, nullable=False)
    post_type = Column(String(20), default='COLLAB', nullable=False) # 'HELP', 'WIN', 'IDEA', 'COLLAB', 'POLL'
    reply_privacy = Column(String(20), default='everyone', nullable=False) # 'everyone', 'followers', 'mentioned'
    tags = Column(String, nullable=True) # e.g. "hackathon,urgent"
    location = Column(String, nullable=True) # e.g. "Library"
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
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

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
    __table_args__ = (UniqueConstraint('conversation_id', 'user_id', name='_conv_member_uc'),)

    conversation = relationship('Conversation', back_populates='members')
    user = relationship('User')

class Message(Base):
    __tablename__ = 'messages'

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False)
    sender_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    is_delivered = Column(Boolean, default=False)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc))

    conversation = relationship('Conversation', back_populates='messages')
    sender = relationship('User')

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
