# 💬 Chatter — Real-Time Multi-Room Chat Application

[![Live Demo](https://img.shields.io/badge/Live_Demo-chatter--ten--mocha.vercel.app-blue?style=for-the-badge&logo=vercel)](https://chatter-ten-mocha.vercel.app/)
[![Tech Stack](https://img.shields.io/badge/Stack-React%2018%20%7C%20Node.js%20%7C%20Socket.IO%20%7C%20PostgreSQL-green?style=for-the-badge)](https://chatter-ten-mocha.vercel.app/)

> A full-stack real-time chat application demonstrating production-level WebSocket messaging, JWT authentication, normalized relational schemas, and multi-tab safe presence tracking.

🌐 **Live Demo**: [https://chatter-ten-mocha.vercel.app/](https://chatter-ten-mocha.vercel.app/)

---

## ✨ Features

- **⚡ Instant Real-Time Messaging**: Built on Socket.IO v4 for low-latency bidirectional communication across room channels.
- **🏠 Multi-Room Channels**: Dynamic room creation, channel discovery, joining, and leaving.
- **📜 Persistent Chat History**: Chronologically indexed message storage powered by PostgreSQL.
- **🟢 Multi-Tab Safe Presence**: Online/offline tracking using a per-user socket pool to prevent accidental disconnects across tabs.
- **✍️ Live Typing Indicators**: Debounced typing state broadcasts (`"User X is typing..."`).
- **🔒 JWT Authentication**: Secure user registration, password hashing (`bcryptjs`), and token-based socket authorization.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, CSS3 |
| **Backend** | Node.js, Express |
| **Real-Time** | Socket.IO (v4) |
| **Database** | PostgreSQL (`pg` pool) |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs` |

---

## 🗄️ Database Schema

The database uses four normalized tables with foreign keys and compound indexes:

```sql
users (id, username, email, password_hash, created_at)
rooms (id, name, created_by -> users.id, created_at)
room_members (room_id -> rooms.id, user_id -> users.id) -- Composite PK (room_id, user_id)
messages (id, room_id, user_id, content, created_at)
```

### Key Performance Indexes:
- `idx_messages_room_created` on `messages(room_id, created_at)` for fast chronological message retrieval.
- `idx_room_members_user` on `room_members(user_id)` for quick room membership lookups.

---

## 📡 REST API Reference

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register new user account |
| `POST` | `/api/auth/login` | No | Authenticate user & return JWT |
| `GET` | `/api/auth/me` | Yes | Get authenticated user profile |
| `GET` | `/api/rooms` | Yes | List available rooms with member counts |
| `POST` | `/api/rooms` | Yes | Create a new room |
| `POST` | `/api/rooms/:id/leave` | Yes | Leave a room |
| `GET` | `/api/rooms/:id/members` | Yes | List members of a room |
| `GET` | `/api/rooms/:id/messages` | Yes | Fetch message history for a room |

---

## 🔌 Socket.IO Events

### Client ➔ Server
- `join_room` `{ roomId }`: Subscribe to a room channel (validated against DB membership).
- `leave_room` `{ roomId }`: Unsubscribe from a room channel.
- `send_message` `{ roomId, content }`: Save and broadcast message to room members.
- `typing` / `stop_typing` `{ roomId }`: Broadcast user typing status.

### Server ➔ Client
- `receive_message`: Delivers new real-time messages to active room members.
- `user_online` / `user_offline`: Real-time user presence updates.
- `online_users`: Transmits online user ID list upon connection.
- `user_typing` / `user_stop_typing`: Real-time typing indicators.

---

## 📁 Repository Structure

```
chatter/
├── server/
│   ├── db/          # PostgreSQL connection pool, migration scripts, and schema definition
│   ├── middleware/  # JWT authentication middleware
│   ├── routes/      # Express REST endpoints (auth, rooms)
│   ├── socket/      # Socket.IO event handlers and state tracking
│   └── index.js     # Server entry point
└── client/
    ├── src/
    │   ├── components/ # RoomList, ChatArea, MessageList, TypingIndicator, MemberList
    │   ├── context/    # AuthContext provider
    │   ├── pages/      # AuthPage, ChatPage
    │   └── services/   # API utilities & Socket.IO client singleton
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

