-- ─── Chatter Database Schema ────────────────────────────────────────────────
-- Run this once via: npm run db:migrate
-- Compatible with PostgreSQL 14+

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  username     VARCHAR(30)  NOT NULL UNIQUE,
  email        VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Rooms ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(50)  NOT NULL UNIQUE,
  created_by INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Room Members (Many-to-Many junction table) ───────────────────────────────
-- A user can join many rooms; a room can have many users.
-- Composite primary key prevents duplicate membership rows.
CREATE TABLE IF NOT EXISTS room_members (
  room_id   INTEGER NOT NULL REFERENCES rooms(id)  ON DELETE CASCADE,
  user_id   INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

-- ─── Messages ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id         SERIAL PRIMARY KEY,
  room_id    INTEGER NOT NULL REFERENCES rooms(id)  ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  content    TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
-- Speeds up fetching all messages in a room ordered chronologically.
CREATE INDEX IF NOT EXISTS idx_messages_room_created
  ON messages(room_id, created_at ASC);

-- Speeds up "what rooms does this user belong to?"
CREATE INDEX IF NOT EXISTS idx_room_members_user
  ON room_members(user_id);

-- ─── Seed: General room ───────────────────────────────────────────────────────
-- Automatically create a "General" room so new users have something to join.
INSERT INTO rooms (name, created_by)
  VALUES ('general', NULL)
  ON CONFLICT (name) DO NOTHING;
