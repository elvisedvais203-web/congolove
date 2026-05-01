-- PostgreSQL schema fallback for environments without Prisma migration pipeline.

CREATE TYPE plan_tier AS ENUM ('FREE', 'PREMIUM');
CREATE TYPE swipe_action AS ENUM ('LIKE', 'PASS');
CREATE TYPE message_type AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'VOICE', 'STICKER');
CREATE TYPE payment_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN', 'SUPERADMIN');
CREATE TYPE chat_kind AS ENUM ('PRIVATE', 'GROUP');
CREATE TYPE chat_member_role AS ENUM ('MEMBER', 'ADMIN');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  otp_verified BOOLEAN DEFAULT FALSE,
  plan_tier plan_tier DEFAULT 'FREE',
  reputation INT DEFAULT 50,
  data_saver_enabled BOOLEAN DEFAULT FALSE,
  invisible_mode BOOLEAN DEFAULT FALSE,
  role user_role DEFAULT 'USER',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio TEXT,
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  interests TEXT[] DEFAULT '{}',
  verified_badge BOOLEAN DEFAULT FALSE,
  last_active_at TIMESTAMP DEFAULT now()
);

CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action swipe_action NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (from_user_id, to_user_id)
);

CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (user_a_id, user_b_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type message_type DEFAULT 'TEXT',
  text TEXT,
  media_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approved BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (follower_id, following_id)
);

CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL,
  caption TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_stories_user_created ON stories(user_id, created_at DESC);

CREATE TABLE story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP DEFAULT now(),
  UNIQUE (story_id, viewer_id)
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  auto_renew BOOLEAN DEFAULT FALSE
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  amount_cdf INT NOT NULL,
  status payment_status DEFAULT 'PENDING',
  external_ref TEXT,
  purpose TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  processed_at TIMESTAMP
);

CREATE TABLE user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  status_code INT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_created_at ON audit_logs(user_id, created_at DESC);

CREATE TABLE chats (
  id TEXT PRIMARY KEY,
  kind chat_kind NOT NULL,
  title TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE chat_members (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role chat_member_role DEFAULT 'MEMBER',
  archived_at TIMESTAMP,
  last_read_at TIMESTAMP,
  joined_at TIMESTAMP DEFAULT now(),
  UNIQUE (chat_id, user_id)
);

CREATE INDEX idx_chat_members_user_archived ON chat_members(user_id, archived_at);

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type message_type DEFAULT 'TEXT',
  text TEXT,
  media_url TEXT,
  file_name TEXT,
  duration_sec INT,
  edited_at TIMESTAMP,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_chat_messages_chat_created ON chat_messages(chat_id, created_at DESC);

CREATE TABLE chat_message_receipts (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delivered_at TIMESTAMP DEFAULT now(),
  read_at TIMESTAMP,
  UNIQUE (message_id, user_id)
);

CREATE INDEX idx_chat_receipts_user_read ON chat_message_receipts(user_id, read_at);

CREATE TABLE chat_reactions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX idx_chat_reactions_message_created ON chat_reactions(message_id, created_at DESC);
