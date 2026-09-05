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

export interface MembershipInfo {
  tier: string | null;     // 'bronze' | 'silver' | 'gold' | 'platinum' | null
  active: boolean;
  name: string;            // 'Free' | 'Bronze Member' | ...
  color: string;           // hex used for the tick
  perks?: string[];
  expires_at?: string;
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
  follow_status?: 'none' | 'pending' | 'accepted';
  has_pending_request_from?: boolean;
  pending_requests_count?: number;
  membership?: MembershipInfo | null;
}

export interface PollOption {
  id: number;
  option_text: string;
  votes_count: number;
  user_voted: boolean;
}

export interface ReactionItem {
  emoji: string;
  count: number;
  user_reacted: boolean;
  usernames?: string[];
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
  post_type: 'HELP' | 'WIN' | 'IDEA' | 'COLLAB' | 'POLL' | 'CASUAL';
  images: string[];
  poll_options: PollOption[];
  likes_count: number;
  comments_count: number;
  user_liked: boolean;
  user_saved: boolean;
  reactions?: ReactionItem[];
  author_membership?: MembershipInfo | null;
  audience?: string;
  audience_community_id?: number | null;
  reply_privacy?: string;
  // Follow-context: 0-2 people you follow who liked/commented on this post.
  liked_by_following?: MiniUser[];
  commented_by_following?: MiniUser[];
  created_at: string;
  location?: string;
}

export interface MiniUser {
  id: number;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
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
  likes_count?: number;
  user_liked?: boolean;
  user_disliked?: boolean;
  reactions?: ReactionItem[];
  author_membership?: MembershipInfo | null;
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
  author_membership?: MembershipInfo | null;
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

export interface ConversationMember {
  id: number;
  user: User;
  role: string;
}

export type UserOut = User;

export interface Conversation {
  id: number;
  is_group: boolean;
  name?: string;
  description?: string;
  avatar_url?: string;
  is_public: boolean;
  only_admins_can_message: boolean;
  only_admins_can_edit_settings: boolean;
  
  other_user?: User;
  last_message?: string;
  last_message_time?: string;
  status: 'pending' | 'accepted' | 'rejected';
  initiator_id?: number;
  updated_at: string;
  
  member_count?: number;
  initial_member_usernames?: string[];
  unread_count: number;
  members?: ConversationMember[];
}

export interface GroupRequest {
  id: number;
  conversation_id: number;
  conversation: Conversation;
  user: User;
  type: 'invitation' | 'join_request';
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface MessageReply {
  id: number;
  content: string;
  sender_username: string;
  sender_name: string;
  attachment_type?: string;
  is_poll?: boolean;
}

export interface MessagePollOption {
  id: number;
  option_text: string;
  votes_count: number;
  user_voted: boolean;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_username: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  is_read: boolean;
  is_delivered?: boolean;
  reply_to_id?: number;
  replied_to_message?: MessageReply;
  attachment_url?: string;
  attachment_type?: string;
  is_poll?: boolean;
  poll_multiple_answers?: boolean;
  poll_options?: MessagePollOption[];
  is_deleted?: boolean;
  deleted_by_admin?: boolean;
  created_at: string;
  reactions?: ReactionItem[];
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
  sender_username?: string;
  sender_id?: number;
  is_pending_request?: boolean;
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

export interface GroupRequestOut {
  id: number;
  conversation_id: number;
  conversation: Conversation;
  user: UserOut;
  type: string;
  status: string;
  created_at: string;
}

export interface MembershipTier {
  key: string;
  name: string;
  price_inr: number;
  original_price_inr?: number;
  promotional_price_inr?: number;
  promo_discount_percent?: number;
  promo_label?: string;
  color: string;
  boost: number;
  upload_mb: number;
  poll_options: number;
  new_conversations_per_month?: number;
  group_joins_per_month?: number;
  sticker_packs?: string[];
  perks: string[];
}

export interface MyMembership {
  id?: number;
  tier: string;
  status: string;
  name: string;
  color: string;
  perks?: string[];
  started_at?: string;
  expires_at?: string;
  days_remaining?: number;
  invoice_number?: string;
  payment_provider?: string;
  is_early_bird?: boolean;
}

export interface PaymentTransaction {
  id: number;
  tier: string;
  order_id?: string;
  payment_id?: string;
  amount_inr: number;
  currency: string;
  status: string;
  provider: string;
  invoice_number?: string;
  plan_name?: string;
  created_at: string;
}

export interface PaymentConfig {
  razorpay_key_id: string | null;
  currency: string;
  is_live: boolean;
  early_bird_active: boolean;
}

export interface InvoiceDetails {
  invoice_number: string;
  issue_date: string;
  status: string;
  provider: string;
  payment_id?: string;
  order_id?: string;
  student: {
    name: string;
    username: string;
    email?: string;
    school?: string;
    country?: string;
  };
  plan: {
    tier: string;
    name: string;
    color: string;
    perks: string[];
    validity_days: number;
  };
  billing: {
    currency: string;
    original_amount: number;
    discount_name?: string;
    discount_amount: number;
    tax_amount: number;
    net_paid: number;
    is_early_bird: boolean;
  };
}
