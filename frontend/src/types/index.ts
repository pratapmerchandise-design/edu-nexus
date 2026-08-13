export interface Profile {
  full_name: string;
  avatar_url?: string;
  bio?: string;
  country?: string;
  city?: string;
  school?: string;
  grade?: string;
  dob?: string;
  goals?: string;
  open_to_collab: boolean;
  show_email: boolean;
  show_phone: boolean;
  show_dob: boolean;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  is_email_verified: boolean;
  phone?: string;
  is_phone_verified: boolean;
  role: 'student' | 'admin';
  is_suspended: boolean;
  is_banned: boolean;
  created_at: string;
  last_seen?: string;
  profile?: Profile;
  interests: string[];
  skills: string[];
  followers_count: number;
  following_count: number;
  is_following?: boolean;
}

export interface PollOption {
  id: number;
  option_text: string;
  votes_count: number;
  user_voted: boolean;
}

export interface Post {
  id: number;
  author_id: number;
  author_username: string;
  author_name: string;
  author_avatar?: string;
  author_school?: string;
  title?: string;
  content: string;
  post_type: 'HELP' | 'WIN' | 'IDEA' | 'COLLAB' | 'POLL';
  images: string[];
  poll_options: PollOption[];
  likes_count: number;
  comments_count: number;
  user_liked: boolean;
  user_saved: boolean;
  created_at: string;
  location?: string;
}

export interface Comment {
  id: number;
  post_id: number;
  author_id: number;
  author_username: string;
  author_name: string;
  author_avatar?: string;
  parent_id?: number;
  content: string;
  created_at: string;
  replies: Comment[];
}

export interface ForumCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

export interface ForumThread {
  id: number;
  category_id: number;
  category_name: string;
  author_id: number;
  author_username: string;
  author_name: string;
  author_avatar?: string;
  title: string;
  content: string;
  is_anonymous: boolean;
  upvotes_count: number;
  downvotes_count: number;
  replies_count: number;
  user_upvoted: boolean;
  user_downvoted: boolean;
  created_at: string;
}

export interface ForumReply {
  id: number;
  thread_id: number;
  author_id: number;
  author_username: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
}

export interface Opportunity {
  id: number;
  title: string;
  description: string;
  organization: string;
  type: string;
  deadline?: string;
  location?: string;
  is_online: boolean;
  eligibility?: string;
  age_requirements?: string;
  grade_requirements?: string;
  category?: string;
  external_url?: string;
  tags?: string;
  status: string;
  user_bookmarked: boolean;
  created_at: string;
}

export interface Conversation {
  id: number;
  other_user: User;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  status: 'pending' | 'accepted' | 'rejected';
  initiator_id?: number;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_username: string;
  sender_name: string;
  content: string;
  is_read: boolean;
  is_delivered?: boolean;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string;
  link?: string;
  is_read: boolean;
  created_at: string;
  sender_avatar?: string;
}

export interface ReportItem {
  id: number;
  reporter_id: number;
  reporter_username: string;
  target_type: string;
  target_id: number;
  reason: string;
  details?: string;
  status: string;
  created_at: string;
}
