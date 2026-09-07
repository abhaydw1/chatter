# Chatter — Real-Time Multi-Room Chat Application

> A full-stack real-time chat application built to demonstrate production-level engineering concepts: WebSocket-based messaging, JWT authentication, normalized relational schemas, and real-time presence.

## ✨ Features

- **Real-time messaging** via Socket.IO — messages delivered instantly to all room members
- **Multi-room support** — create channels, join and leave rooms
- **Persistent chat history** — all messages are stored in PostgreSQL and loaded on room entry
- **JWT Authentication** — register, login, and protected routes
- **Real-time presence** — see who's online/offline, updates instantly across all users
- **Typing indicators** — debounced "User X is typing…" with animated dots
- **Multi-tab safe presence** — uses a per-user socket Set so closing one tab doesn't mark you offline

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, Plain CSS |
| Backend | Node.js, Express |
| Real-Time | Socket.IO (v4) |
| Database | PostgreSQL (via `pg`) |
| Auth | JSON Web Tokens (`jsonwebtoken`) + `bcryptjs` |

## 📐 Database Schema

Four normalized tables with foreign keys and indexes:

```sql
users (id, username, email, password_hash, created_at)
rooms (id, name, created_by → users.id, created_at)
room_members (room_id → rooms.id, user_id → users.id) -- composite PK, many-to-many
messages (id, room_id, user_id, content, created_at)
```

**Why `room_members` is a separate table**: A user can join many rooms, and a room can have many users. This is a many-to-many relationship requiring a junction table with composite primary key `(room_id, user_id)` to prevent duplicate rows.

**Indexes**:
- `idx_messages_room_created` on `messages(room_id, created_at)` — fast chronological message retrieval per room
- `idx_room_members_user` on `room_members(user_id)` — fast "rooms a user belongs to" lookups

## 🚀 Getting Started

### 1. Get a Free PostgreSQL Database

Go to [neon.tech](https://neon.tech) (free tier, no credit card) or [supabase.com](https://supabase.com) and create a project. Copy the **connection string**.

### 2. Configure Environment Variables

```bash
# Copy the example and fill in your values
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
JWT_SECRET=your_long_random_secret_string
```

### 3. Install Dependencies

```bash
npm install          # installs server deps
npm --prefix client install  # installs client deps
```

### 4. Initialize the Database

```bash
npm run db:migrate
```

This creates all 4 tables + indexes + a default `general` room.

### 5. Start the App

```bash
npm run dev
```

This concurrently starts:
- **Server** on `http://localhost:5000`
- **Client** on `http://localhost:5173`

Open `http://localhost:5173` in your browser.

## 📡 REST API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | ❌ | Create account, returns JWT |
| POST | `/api/auth/login` | ❌ | Login, returns JWT |
| GET | `/api/auth/me` | ✅ | Get current user |
| GET | `/api/rooms` | ✅ | List all rooms with member count |
| POST | `/api/rooms` | ✅ | Create new room |
| POST | `/api/rooms/:id/join` | ✅ | Join a room |
| POST | `/api/rooms/:id/leave` | ✅ | Leave a room |
| GET | `/api/rooms/:id/members` | ✅ | Get room members |
| GET | `/api/rooms/:id/messages` | ✅ | Get last 50 messages (members only) |

## ⚡ Socket.IO Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_room` | `{ roomId }` | Subscribe to room channel (auth-checked against DB) |
| `leave_room` | `{ roomId }` | Unsubscribe from room channel |
| `send_message` | `{ roomId, content }` | Persist & broadcast message |
| `typing` | `{ roomId }` | Notify room user started typing |
| `stop_typing` | `{ roomId }` | Notify room user stopped typing |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `receive_message` | `{ id, room_id, user_id, username, content, created_at }` | New message in a room |
| `user_typing` | `{ userId, username, roomId }` | Someone is typing |
| `user_stop_typing` | `{ userId, username, roomId }` | Someone stopped typing |
| `user_online` | `{ userId, username }` | User connected |
| `user_offline` | `{ userId, username }` | User disconnected |
| `online_users` | `userId[]` | Full list of online user IDs (sent on connect) |
| `user_joined_room` | `{ userId, username, roomId }` | User joined a room |
| `user_left_room` | `{ userId, username, roomId }` | User left a room |

## 🏗️ Project Structure

```
chatter/
├── server/
│   ├── db/
│   │   ├── index.js        # pg.Pool connection pool
│   │   ├── schema.sql      # Table definitions + indexes
│   │   └── migrate.js      # One-shot migration runner
│   ├── middleware/
│   │   └── auth.js         # JWT verification middleware
│   ├── routes/
│   │   ├── auth.js         # Register / Login / Me
│   │   └── rooms.js        # CRUD + join/leave/messages
│   ├── socket/
│   │   └── index.js        # Socket.IO handler
│   └── index.js            # Express server entry point
├── client/
│   └── src/
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── pages/
│       │   ├── AuthPage.jsx
│       │   └── ChatPage.jsx
│       ├── components/
│       │   ├── RoomList.jsx
│       │   ├── ChatArea.jsx
│       │   ├── MessageList.jsx
│       │   ├── TypingIndicator.jsx
│       │   ├── MessageInput.jsx
│       │   └── MemberList.jsx
│       ├── services/
│       │   ├── api.js      # Axios instance with JWT interceptor
│       │   └── socket.js   # Socket.IO singleton
│       └── App.jsx
├── .env.example
└── package.json
```
