# Chatter — Complete SDE-1 Interview Preparation Document

> **Accuracy guarantee**: Every file, function, endpoint, query, event name, and data type in this document was read directly from the actual source code.  
> Nothing is invented. Where something is absent from the codebase, this document explicitly says so.

---

## Table of Contents

1. [Part 1 — Project Overview & Architecture](#part-1)
2. [Part 2 — Complete Folder/File Map](#part-2)
3. [Part 3 — Database Design](#part-3)
4. [Part 4 — Authentication & Authorization](#part-4)
5. [Part 5 — JobFinder Features](#part-5)
6. [Part 6 — Chat Features](#part-6)
7. [Part 7 — API Documentation](#part-7)
8. [Part 8 — Frontend Architecture](#part-8)
9. [Part 9 — Backend Architecture](#part-9)
10. [Part 10 — Code Location Cheat Sheet](#part-10)
11. [Part 11 — Technology Explanation](#part-11)
12. [Part 12 — Interview Questions](#part-12)
13. [Part 13 — Interviewer Can Point Here](#part-13)
14. [Part 14 — CS Fundamentals Connected to Project](#part-14)
15. [Part 15 — Production Improvements](#part-15)
16. [Part 16 — Final Interview Cheat Sheet](#part-16)

---

<a name="part-1"></a>
## Part 1 — Project Overview & Architecture

### What the Application Does

Chatter is a **real-time, multi-room group chat application**. Users can:
- Register and log in with email/password
- Browse a list of chat rooms ("channels")
- Join or leave rooms
- Send and receive messages instantly in rooms they have joined
- See who is currently online
- See live typing indicators ("Alice is typing…")
- View the member list of any room they belong to
- Create new rooms

### Main Users / Use Cases

| User Type | Use Case |
|---|---|
| General user | Authenticate, browse rooms, chat in real-time |
| Room creator | Create new channels and auto-join them |
| Observer | View room list and member counts without joining |

### There Are NO JobFinder Features in This Codebase

The project description mentions "Chatter / JobFinder" but the codebase contains **zero job-related code**. There are no job models, job routes, job components, or job-related database tables. This is a **pure chat application**. See Part 5 for the explicit note.

---

### Architecture Diagram

```
Browser (React 19 + Vite)
         │
         ├── HTTP REST (Axios)  ──────────────────────────────┐
         │    baseURL: /api  (proxied by Vite dev server)      │
         │                                                      │
         └── WebSocket (Socket.IO client)  ──────────────────┐ │
              connects directly to: http://localhost:5000      │ │
                                                               ▼ ▼
                                              Node.js + Express (server/index.js)
                                                      │
                                          ┌───────────┴────────────┐
                                          │                        │
                                   HTTP Middleware           Socket.IO Server
                                   (cors, express.json)      (socket/index.js)
                                          │                        │
                                   Auth Middleware           JWT Middleware
                                   (middleware/auth.js)      (io.use())
                                          │                        │
                              ┌───────────┴──────────┐    Socket Event Handlers
                              │                       │    (join_room, send_message,
                         Route: /api/auth        Route: /api/rooms   typing, etc.)
                         (routes/auth.js)        (routes/rooms.js)
                              │                       │
                              └───────────┬───────────┘
                                          │
                                    PostgreSQL
                                  (via pg Pool)
                                  (db/index.js)
                                          │
                              ┌───────────┼───────────┐
                              │           │           │
                           users       rooms      messages
                                          │
                                    room_members
```

---

### Technology Summary

| Layer | Technology | File |
|---|---|---|
| Frontend framework | React 19 | `client/src/` |
| Frontend build tool | Vite 8 | `client/vite.config.js` |
| HTTP client | Axios | `client/src/services/api.js` |
| WebSocket client | socket.io-client 4.8 | `client/src/services/socket.js` |
| Backend runtime | Node.js ≥18 | `server/` |
| Backend framework | Express 4 | `server/index.js` |
| WebSocket server | Socket.IO 4.7 | `server/socket/index.js` |
| Database | PostgreSQL | `server/db/schema.sql` |
| DB client | pg (node-postgres) | `server/db/index.js` |
| Password hashing | bcryptjs | `server/routes/auth.js` |
| Authentication | JWT (jsonwebtoken) | `server/routes/auth.js`, `server/middleware/auth.js` |
| Environment config | dotenv | `.env` |
| Dev server concurrency | concurrently | `package.json` |
| Dev server auto-restart | nodemon | `package.json` |
| CSS | Vanilla CSS (custom design system) | `client/src/index.css` |
| Linter | oxlint | `client/.oxlintrc.json` |

---

<a name="part-2"></a>
## Part 2 — Complete Folder/File Map

```
chatter/                          ← Project root
├── .env                          ← Actual secrets (not committed)
├── .env.example                  ← Template: DATABASE_URL, JWT_SECRET, CLIENT_URL, PORT
├── package.json                  ← Root scripts: dev, server, client, db:migrate
│
├── server/                       ← Backend (Node.js + Express)
│   ├── index.js                  ← Entry point: creates Express app + HTTP server + Socket.IO
│   ├── db/
│   │   ├── index.js              ← PostgreSQL connection pool (pg.Pool), max 10 connections
│   │   ├── schema.sql            ← DDL: users, rooms, room_members, messages + indexes + seed
│   │   └── migrate.js            ← One-off script: reads schema.sql → executes against DB
│   ├── middleware/
│   │   └── auth.js               ← Express middleware: verifies Bearer JWT, attaches req.user
│   ├── routes/
│   │   ├── auth.js               ← POST /register, POST /login, GET /me
│   │   └── rooms.js              ← GET /, POST /, POST /:id/join, POST /:id/leave,
│   │                               GET /:id/members, GET /:id/messages
│   └── socket/
│       └── index.js              ← Socket.IO handler: JWT auth, presence, join/leave,
│                                   send_message, typing indicators
│
└── client/                       ← Frontend (React 19 + Vite)
    ├── index.html                ← HTML shell: <div id="root">
    ├── vite.config.js            ← Vite: React plugin, proxy /api → localhost:5000
    ├── package.json              ← Client deps: react, axios, socket.io-client
    └── src/
        ├── main.jsx              ← ReactDOM.createRoot → renders <App>
        ├── App.jsx               ← Root: wraps AppContent in <AuthProvider>
        │                           AppContent: shows <AuthPage> or <ChatPage> based on user
        ├── index.css             ← 788-line CSS design system with CSS variables
        ├── context/
        │   └── AuthContext.jsx   ← React Context: user, loading, login(), register(), logout()
        │                           Restores session from localStorage on mount
        ├── services/
        │   ├── api.js            ← Axios instance (baseURL: /api), JWT interceptor
        │   └── socket.js         ← Socket.IO singleton: initSocket(), getSocket(), disconnectSocket()
        ├── pages/
        │   ├── AuthPage.jsx      ← Login/Register dual-tab form page
        │   └── ChatPage.jsx      ← Main chat layout: rooms + active chat area + online presence
        └── components/
            ├── RoomList.jsx      ← Sidebar: room list, create-room form, user info, logout
            ├── ChatArea.jsx      ← Main panel: header, messages, typing, member list, join/leave
            ├── MessageList.jsx   ← Renders messages with auto-scroll, grouping by minute
            ├── MessageInput.jsx  ← Textarea with Enter-to-send, typing debounce (1500ms)
            ├── TypingIndicator.jsx← Displays "X is typing" / "Several people are typing"
            └── MemberList.jsx    ← Online/Offline member sidebar panel
```

### File Responsibilities Detail

#### `server/index.js`
- Creates `express()` app
- Wraps it in `http.createServer(app)` so Socket.IO can share the same port
- Applies CORS middleware using `CLIENT_URL` env variable
- Applies `express.json()` for body parsing
- Mounts `/api/auth` and `/api/rooms` routers
- Creates a `Server` instance from `socket.io` and passes `httpServer` to it
- Sets `pingTimeout: 60000` and `pingInterval: 25000` for connection health
- Calls `initSocket(io)` to register all Socket.IO event handlers
- Listens on `PORT` (default 5000)
- **Interacts with**: `routes/auth.js`, `routes/rooms.js`, `socket/index.js`

#### `server/db/index.js`
- Exports a single `pg.Pool` instance (connection pool)
- `max: 10` connections
- `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`
- SSL: disabled for `localhost`, `{ rejectUnauthorized: false }` for cloud DBs
- Logs uncaught pool errors without crashing the process
- **Imported by**: `routes/auth.js`, `routes/rooms.js`, `socket/index.js`

#### `server/db/schema.sql`
- Creates 4 tables: `users`, `rooms`, `room_members`, `messages`
- Creates 2 indexes: `idx_messages_room_created`, `idx_room_members_user`
- Seeds a `general` room using `INSERT ... ON CONFLICT DO NOTHING`

#### `server/middleware/auth.js`
- Reads `Authorization` header, expects `Bearer <token>`
- Calls `jwt.verify(token, process.env.JWT_SECRET)`
- On success: attaches `req.user = { id, username, email }` and calls `next()`
- On failure: returns `401 Unauthorized`
- Explicitly never attaches `password_hash` to `req.user`

#### `server/routes/auth.js`
- `signToken(user)` helper: creates JWT with `{ id, username, email }`, expires `7d`
- `POST /register`: validates → hashes password (bcrypt, cost 12) → inserts user → returns token
- `POST /login`: finds user by email → bcrypt.compare → strips password_hash → returns token
- `GET /me`: protected by authMiddleware → re-fetches user from DB → returns fresh data
- Error handling: PostgreSQL error code `23505` → conflict → custom message

#### `server/routes/rooms.js`
- **All routes protected** via `router.use(authMiddleware)` at the top
- `GET /`: returns all rooms with `member_count` and `is_member` (uses `BOOL_OR` aggregate)
- `POST /`: uses a **transaction** (BEGIN/COMMIT/ROLLBACK) to create room AND add creator as member atomically
- `POST /:id/join`: `INSERT ... ON CONFLICT DO NOTHING` (idempotent join)
- `POST /:id/leave`: `DELETE FROM room_members`
- `GET /:id/members`: JOIN with users table, ordered by username
- `GET /:id/messages`: checks membership first (403 if not a member), returns last 50 messages ordered ASC, LIMIT 50

#### `server/socket/index.js`
- `activeUsers: Map<userId, Set<socketId>>` — tracks presence per user, multi-tab safe
- JWT middleware via `io.use()` — verifies token from `socket.handshake.auth.token`
- Event handlers: `join_room`, `leave_room`, `send_message`, `typing`, `stop_typing`, `disconnect`
- `send_message`: persists to DB before broadcasting (no in-memory-only messages)
- Room namespacing: `room:${roomId}` is the Socket.IO room name

#### `client/src/services/api.js`
- Creates Axios instance with `baseURL: '/api'`
- Request interceptor reads `localStorage.getItem('chatter_token')` and sets `Authorization: Bearer <token>` header on every request

#### `client/src/services/socket.js`
- Module-level singleton `socket` variable
- `initSocket(token)`: connects to `http://localhost:5000` with `auth: { token }`, `transports: ['websocket']`, up to 5 reconnection attempts
- `getSocket()`: returns current socket instance
- `disconnectSocket()`: disconnects and sets `socket = null`

#### `client/src/context/AuthContext.jsx`
- `AuthProvider`: on mount, reads `chatter_token` from `localStorage`, calls `GET /api/auth/me` to validate, calls `initSocket(token)`
- `login()`: calls API → stores token → sets user → inits socket
- `register()`: same flow as login
- `logout()`: removes token → disconnects socket → clears user state
- Exposes: `user`, `loading`, `login`, `register`, `logout`

#### `client/src/App.jsx`
- Wraps everything in `<AuthProvider>`
- `AppContent` reads `{ user, loading }` from `useAuth()`
- Shows a spinner while `loading === true`
- Shows `<AuthPage>` if `user === null`, `<ChatPage>` if user is set
- This is the **only routing logic** — there is no React Router; routing is purely state-based

#### `client/src/pages/AuthPage.jsx`
- Single component handles both Login and Register via `tab` state (`'login'` | `'register'`)
- Form state: `{ username, email, password }`
- On submit: calls `login(email, password)` or `register(username, email, password)` from context
- Shows error string from `err.response?.data?.error`

#### `client/src/pages/ChatPage.jsx`
- Fetches rooms on mount via `GET /api/rooms`
- Listens to socket events: `online_users`, `user_online`, `user_offline`
- Maintains `onlineUsers: Set<userId>`
- `activeRoomId` state — which room is selected
- Passes down: `rooms`, `activeRoomId`, `user`, `onlineUsers`, callbacks

#### `client/src/components/ChatArea.jsx`
- The most complex component (210 lines)
- Manages: `messages`, `members`, `typingUsers`, `showMembers`, `joining`, `leaving`
- `prevRoomId` ref — detects room changes to emit `leave_room` on previous room
- On room change: fetches message history + members, emits `join_room`
- Listens to: `receive_message`, `user_typing`, `user_stop_typing`, `user_joined_room`, `user_left_room`
- `handleSendMessage`: emits `send_message` via socket
- `handleTyping(isTyping)`: emits `typing` or `stop_typing` via socket

#### `client/src/components/MessageInput.jsx`
- `TYPING_DEBOUNCE_MS = 1500` — typing event is stopped after 1.5s of inactivity
- `isTypingRef`: useRef to avoid re-renders for typing state
- Enter key (without Shift) sends message; Shift+Enter = newline
- Clears textarea and stops typing indicator after send

#### `client/src/components/MessageList.jsx`
- `isSameMinute(a, b)`: groups consecutive messages from the same user in the same minute — shows avatar/username only on first message
- `bottomRef`: auto-scrolls to latest message using `scrollIntoView({ behavior: 'smooth' })`
- Marks own messages with class `message-row own`

#### `client/src/components/TypingIndicator.jsx`
- Always renders (empty div when no one typing, so layout doesn't shift)
- Logic: 1 person → "X is typing"; 2 people → "X and Y are typing"; 3+ → "Several people are typing"

#### `client/src/components/MemberList.jsx`
- Splits members into `online` and `offline` arrays using `onlineUsers.has(m.id)`
- Renders online section first, offline second

---

<a name="part-3"></a>
## Part 3 — Database Design

### Why PostgreSQL?

PostgreSQL was chosen (over MongoDB) because:
1. **Relational data** — Users, rooms, memberships, and messages have clear, fixed relationships
2. **ACID transactions** — Room creation requires atomically inserting into `rooms` AND `room_members`; this fails safely with ROLLBACK
3. **Composite PK** — `room_members(room_id, user_id)` naturally prevents duplicates
4. **Aggregations** — `COUNT(DISTINCT rm.user_id)` and `BOOL_OR(rm.user_id = $1)` in a single query would be very awkward in a document DB
5. **CHECK constraints** — `char_length(content) BETWEEN 1 AND 4000` is enforced at the DB level

---

### Table: `users`

```sql
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(30)  NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

| Column | Type | Required | Unique | Notes |
|---|---|---|---|---|
| `id` | SERIAL (int, auto-increment) | Yes | Yes (PK) | Auto-generated |
| `username` | VARCHAR(30) | Yes | Yes | Stored lowercase |
| `email` | VARCHAR(255) | Yes | Yes | Stored lowercase |
| `password_hash` | VARCHAR(255) | Yes | No | bcrypt output, cost 12 |
| `created_at` | TIMESTAMPTZ | Yes | No | Defaults to NOW() |

**Relationships**: Referenced by `rooms.created_by`, `room_members.user_id`, `messages.user_id`

**Where used**: `routes/auth.js` (INSERT, SELECT), `socket/index.js` (JWT payload only)

**Validation applied in application code**:
- `username`: 3–30 chars (checked in `routes/auth.js` before INSERT)
- `password`: minimum 6 chars (application level), bcrypt adds the real security

**Important note**: `password_hash` is **never returned** in API responses. It is explicitly stripped via destructuring: `const { password_hash, ...safeUser } = user;` in the login handler. The `/me` endpoint's SELECT never fetches it.

---

### Table: `rooms`

```sql
CREATE TABLE IF NOT EXISTS rooms (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(50)  NOT NULL UNIQUE,
  created_by INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

| Column | Type | Required | Unique | Notes |
|---|---|---|---|---|
| `id` | SERIAL | Yes | Yes (PK) | Auto-generated |
| `name` | VARCHAR(50) | Yes | Yes | Lowercased, spaces→hyphens before INSERT |
| `created_by` | INTEGER (FK → users.id) | No | No | SET NULL if user is deleted |
| `created_at` | TIMESTAMPTZ | Yes | No | Defaults to NOW() |

**Why `ON DELETE SET NULL`?** If a user who created a room is deleted, the room should persist. SET NULL preserves the room while removing the creator reference.

**Name normalization** (in `routes/rooms.js`):
```js
name.trim().toLowerCase().replace(/\s+/g, '-')
```
So "My Room" → `my-room`.

**Seeded row**: `('general', NULL)` is inserted at migration time via `ON CONFLICT DO NOTHING`.

---

### Table: `room_members` (Junction / Many-to-Many)

```sql
CREATE TABLE IF NOT EXISTS room_members (
  room_id   INTEGER NOT NULL REFERENCES rooms(id)  ON DELETE CASCADE,
  user_id   INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);
```

| Column | Type | Notes |
|---|---|---|
| `room_id` | FK → rooms.id | CASCADE delete if room is deleted |
| `user_id` | FK → users.id | CASCADE delete if user is deleted |
| `joined_at` | TIMESTAMPTZ | When the user joined |

**Composite PRIMARY KEY `(room_id, user_id)`**: Enforces uniqueness — a user cannot be in the same room twice. The join endpoint uses `ON CONFLICT DO NOTHING` to exploit this.

**Index `idx_room_members_user` on `(user_id)`**: Speeds up "what rooms does this user belong to?" query.

---

### Table: `messages`

```sql
CREATE TABLE IF NOT EXISTS messages (
  id         SERIAL PRIMARY KEY,
  room_id    INTEGER NOT NULL REFERENCES rooms(id)  ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  content    TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL | PK |
| `room_id` | FK → rooms.id | CASCADE delete if room deleted |
| `user_id` | FK → users.id | CASCADE delete if user deleted |
| `content` | TEXT | 1–4000 chars enforced at DB level |
| `created_at` | TIMESTAMPTZ | Auto-set |

**Index `idx_messages_room_created` on `(room_id, created_at ASC)`**: The most critical index. The primary query is `WHERE room_id = $1 ORDER BY created_at ASC LIMIT 50`. Without this index, every message fetch would be a full table scan ordered in memory.

---

### Indexes Summary

| Index Name | Table | Columns | Purpose |
|---|---|---|---|
| `idx_messages_room_created` | messages | (room_id, created_at ASC) | Fetch room messages chronologically |
| `idx_room_members_user` | room_members | (user_id) | Find rooms a user belongs to |
| Implicit PK index | All tables | id | Primary key lookups |
| Implicit UNIQUE index | users | username, email | Duplicate detection |
| Implicit UNIQUE index | rooms | name | Duplicate room detection |

---

### How Data Flows

#### Creation
- **User**: `POST /api/auth/register` → `INSERT INTO users`
- **Room**: `POST /api/rooms` → `BEGIN; INSERT INTO rooms; INSERT INTO room_members; COMMIT;`
- **Message**: `send_message` socket event → `INSERT INTO messages`

#### Querying
- **Room list**: `SELECT r.*, COUNT(DISTINCT rm.user_id) AS member_count, BOOL_OR(rm.user_id = $1) AS is_member FROM rooms r LEFT JOIN room_members rm ... GROUP BY r.id ORDER BY r.name ASC`
- **Messages**: `SELECT m.*, u.username FROM messages m JOIN users u ON u.id = m.user_id WHERE m.room_id = $1 ORDER BY m.created_at ASC LIMIT 50`
- **Members**: `SELECT u.id, u.username, rm.joined_at FROM room_members rm JOIN users u ON u.id = rm.user_id WHERE rm.room_id = $1 ORDER BY u.username ASC`

#### Deletion
- **Leave room**: `DELETE FROM room_members WHERE room_id = $1 AND user_id = $2`
- **No user deletion endpoint exists** in the current codebase
- **No message deletion endpoint exists** in the current codebase

#### Pagination
- **Not implemented beyond LIMIT 50**. `GET /:id/messages` always returns the last 50 messages with no `cursor`, `offset`, or `page` parameter. This is a known limitation (see Part 15).

---

<a name="part-4"></a>
## Part 4 — Authentication & Authorization

### Technology: JWT (JSON Web Token) stored in localStorage

**Token payload**: `{ id, username, email }`  
**Signing secret**: `process.env.JWT_SECRET`  
**Expiry**: `7d` (7 days)  
**Storage**: `localStorage` key `chatter_token`

There is **no refresh token mechanism**. The token either is valid for 7 days or it isn't.

---

### Registration Flow

```
User fills form (AuthPage.jsx)
  → submit() calls register(username, email, password) from AuthContext.jsx
    → api.post('/auth/login', {...})  [Axios, via /api proxy → localhost:5000]
      → Express routes/auth.js: POST /api/auth/register
        → Validate: username (3-30 chars), email, password (≥6 chars)
        → bcrypt.hash(password, 12)  [cost factor 12 = ~250ms hash]
        → pool.query("INSERT INTO users (username, email, password_hash)
                      VALUES ($1, $2, $3)
                      RETURNING id, username, email, created_at",
                     [username.toLowerCase(), email.toLowerCase(), passwordHash])
        → If pg error code 23505 (UNIQUE violation): return 409 {error: "That username/email is already taken."}
        → signToken(user): jwt.sign({id, username, email}, JWT_SECRET, {expiresIn: '7d'})
        → return 201 { user: {id, username, email, created_at}, token }
      → AuthContext: localStorage.setItem('chatter_token', data.token)
      → AuthContext: setUser(data.user)
      → AuthContext: initSocket(data.token)  [opens Socket.IO connection]
    → App.jsx re-renders: user !== null → renders <ChatPage>
```

**File**: `server/routes/auth.js`, function: anonymous handler for `router.post('/register', ...)`

---

### Login Flow

```
User fills email + password (AuthPage.jsx)
  → submit() calls login(email, password) from AuthContext.jsx
    → api.post('/auth/login', { email, password })
      → Express routes/auth.js: POST /api/auth/login
        → pool.query("SELECT id, username, email, password_hash FROM users WHERE email = $1",
                     [email.toLowerCase()])
        → If no user: return 401 { error: 'Invalid email or password.' }
        → bcrypt.compare(password, user.password_hash)
        → If no match: return 401 { error: 'Invalid email or password.' }  [SAME error message — prevents user enumeration]
        → signToken(user)
        → const { password_hash, ...safeUser } = user  [strip hash]
        → return 200 { user: safeUser, token }
      → AuthContext: store token, set user, init socket
```

**Security note**: Both "user not found" and "wrong password" return the **identical error message** `"Invalid email or password."` to prevent user enumeration attacks.

---

### Session Restoration (Page Refresh Flow)

```
Browser refreshes page
  → main.jsx renders <App>
    → App.jsx renders <AuthProvider>
      → AuthContext.jsx useEffect runs on mount:
        → localStorage.getItem('chatter_token')
        → If no token: setLoading(false), done
        → If token exists: api.get('/auth/me')
          → GET /api/auth/me → authMiddleware verifies token
          → If valid: SELECT user from DB → return { user }
          → setUser(data.user)
          → initSocket(token)
          → setLoading(false)
        → If /me fails (expired/invalid): localStorage.removeItem('chatter_token'), setLoading(false)
    → AppContent: loading === false, user set → <ChatPage>
```

Why call `/me` instead of just decoding the token on the frontend? Because the token could be expired, revoked (not currently implemented), or the user could have been deleted. The `/me` endpoint is a server-side validation check.

---

### Logout Flow

```
User clicks logout button (RoomList.jsx → btn-logout)
  → onLogout prop → ChatPage passes logout from useAuth()
    → AuthContext.logout():
      → localStorage.removeItem('chatter_token')
      → disconnectSocket()  [socket.disconnect(), socket = null]
      → setUser(null)
    → App.jsx: user === null → <AuthPage>
```

---

### Protected Routes

There is **no React Router** in this project. "Route protection" is implemented at two levels:

**Frontend**: `App.jsx` conditionally renders `<AuthPage>` or `<ChatPage>` based on `user !== null`. Non-authenticated users literally cannot see the chat UI.

**Backend REST**: `server/middleware/auth.js` is applied via:
```js
// routes/rooms.js — applied to ALL routes in this file
router.use(authMiddleware);

// routes/auth.js — applied only to /me
router.get('/me', authMiddleware, async (req, res) => { ... });
```

**Backend Socket.IO**: `io.use()` middleware in `socket/index.js` runs for every connection attempt:
```js
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication token required.'));
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  socket.user = { id: decoded.id, username: decoded.username };
  next();
});
```
If token is missing or invalid, the connection is rejected before any events are handled.

**Per-room authorization in Socket.IO**: When a user emits `join_room`, the server performs a DB query:
```js
SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2
```
If the user is not a member, the socket join is rejected with an error event (the user cannot eavesdrop on socket room broadcasts without being a DB member first).

---

### `authMiddleware` — Detailed Breakdown

```js
// server/middleware/auth.js
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or malformed.' });
  }
  const token = authHeader.slice(7);        // Remove "Bearer "
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, username: decoded.username, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
```

- Returns `401` for both missing token AND expired token. Why not 403? `401 Unauthorized` means "you need to authenticate first." `403 Forbidden` means "you are authenticated but not allowed." Missing/expired token = not authenticated = 401.
- `jwt.verify` throws `JsonWebTokenError` (invalid) or `TokenExpiredError` (expired). Both are caught and treated identically.

---

### Axios JWT Interceptor

```js
// client/src/services/api.js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('chatter_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

Every HTTP request made via `api` (the Axios instance) automatically gets the token attached. No manual header setting anywhere in the component code.

---

<a name="part-5"></a>
## Part 5 — JobFinder Features

> **There are zero JobFinder features in this codebase.**

After reading every file in the project, there are:
- No job-related database tables
- No job-related API routes
- No job-related React components or pages
- No job search, filtering, sorting, pagination for jobs
- No saved jobs, skills/tags, experience level, location, or recommendation features

This project is **exclusively a real-time chat application**. The "Chatter / JobFinder" label in the prompt does not apply to the actual implementation.

---

<a name="part-6"></a>
## Part 6 — Chat Features

### Feature 1: Room Listing

**FEATURE**: Display all available rooms with member count and join status  
**PURPOSE**: Users can browse rooms without joining them first  
**FRONTEND FILES**: `ChatPage.jsx`, `RoomList.jsx`  
**BACKEND FILES**: `routes/rooms.js`  
**API ENDPOINTS**: `GET /api/rooms`  
**DATABASE MODELS**: `rooms`, `room_members`  
**IMPORTANT FUNCTIONS**: `fetchRooms()` in `ChatPage.jsx`, anonymous `router.get('/')` handler  
**FLOW**:
```
ChatPage mounts
  → useEffect runs fetchRooms()
    → api.get('/rooms')
      → authMiddleware checks JWT
      → SELECT rooms with COUNT(members) and BOOL_OR(is_member)
      → return { rooms: [...] }
    → setRooms(data.rooms)
  → rooms passed to <RoomList rooms={rooms} />
  → RoomList renders <li> for each room with member count badge
```
**EDGE CASES**:
- If no rooms exist, RoomList shows "No rooms yet. Create one below!"
- `is_member` field per room is used by the frontend to show Join/Leave button

---

### Feature 2: Room Creation

**FEATURE**: Create a new chat room  
**PURPOSE**: Allows users to create new channels; creator is auto-joined  
**FRONTEND FILES**: `RoomList.jsx`  
**BACKEND FILES**: `routes/rooms.js`  
**API ENDPOINTS**: `POST /api/rooms`  
**DATABASE MODELS**: `rooms`, `room_members`  
**IMPORTANT FUNCTIONS**: `handleCreate()` in `RoomList.jsx`  
**FLOW**:
```
User types room name → clicks "+ Add" (or presses Enter)
  → handleCreate() in RoomList.jsx
    → api.post('/rooms', { name: newRoomName.trim() })
      → Validation: name must be ≥2 chars
      → Name normalized: trim().toLowerCase().replace(/\s+/g, '-')
      → BEGIN TRANSACTION
      → INSERT INTO rooms (name, created_by) RETURNING id, name, created_at
      → INSERT INTO room_members (room_id, user_id)  ← creator auto-joined
      → COMMIT
      → return 201 { room: { ...room, member_count: 1, is_member: true } }
    → onRoomCreated(data.room) callback in ChatPage
      → setRooms: adds new room, re-sorts alphabetically
      → setActiveRoomId(newRoom.id)  ← automatically navigates to new room
    → setNewRoomName('')  ← clears input
```
**EDGE CASES**:
- Duplicate name: pg error `23505` → 409 `"A room with that name already exists."`
- Empty name: validation on frontend (button disabled) AND backend (≥2 chars)
- Transaction ensures room and membership are always created together atomically

---

### Feature 3: Join Room

**FEATURE**: Join an existing room to see its messages  
**PURPOSE**: Membership gating — only members can read messages  
**FRONTEND FILES**: `ChatArea.jsx`  
**BACKEND FILES**: `routes/rooms.js`  
**API ENDPOINTS**: `POST /api/rooms/:id/join`  
**DATABASE MODELS**: `room_members`  
**IMPORTANT FUNCTIONS**: `handleJoin()` in `ChatArea.jsx`  
**FLOW**:
```
User clicks "Join Room" button in ChatArea
  → handleJoin()
    → api.post('/rooms/${room.id}/join')
      → INSERT INTO room_members (room_id, user_id)
         ON CONFLICT (room_id, user_id) DO NOTHING  ← idempotent
      → return 200 { message: 'Joined room.' }
    → onRoomUpdate({ is_member: true, member_count: +1 })  ← optimistic update
    → Promise.all: fetch messages + members
    → getSocket().emit('join_room', { roomId: room.id })
      → Server verifies membership in DB before socket.join()
      → server broadcasts 'user_joined_room' to other members
```
**EDGE CASES**:
- Double-join is safe (`ON CONFLICT DO NOTHING`)
- Messages are only fetched after join — non-members see a locked prompt
- Socket join is also verified server-side (not just frontend-controlled)

---

### Feature 4: Leave Room

**FEATURE**: Leave a room to stop receiving its messages  
**PURPOSE**: Users can opt out of channels  
**FRONTEND FILES**: `ChatArea.jsx`  
**BACKEND FILES**: `routes/rooms.js`  
**API ENDPOINTS**: `POST /api/rooms/:id/leave`  
**DATABASE MODELS**: `room_members`  
**IMPORTANT FUNCTIONS**: `handleLeave()` in `ChatArea.jsx`  
**FLOW**:
```
User clicks "Leave" → confirm dialog appears
  → If confirmed: handleLeave()
    → api.post('/rooms/${room.id}/leave')
      → DELETE FROM room_members WHERE room_id = $1 AND user_id = $2
    → getSocket().emit('leave_room', { roomId: room.id })
      → Server: socket.leave('room:${roomId}')
      → Server: broadcasts 'user_left_room' to remaining members
    → onRoomUpdate({ is_member: false, member_count: -1 })
    → setMessages([]), setMembers([])  ← clear local state
```

---

### Feature 5: Real-Time Messaging

**FEATURE**: Send and receive messages instantly  
**PURPOSE**: Core chat functionality via WebSockets  
**FRONTEND FILES**: `ChatArea.jsx`, `MessageInput.jsx`, `MessageList.jsx`  
**BACKEND FILES**: `socket/index.js`  
**SOCKET EVENTS**: `send_message` (client→server), `receive_message` (server→client)  
**DATABASE MODELS**: `messages`  
**IMPORTANT FUNCTIONS**: `handleSendMessage()` in `ChatArea.jsx`, `send_message` handler in `socket/index.js`

**Complete Socket Flow**:
```
User types message → presses Enter (or clicks ➤)
  → MessageInput.handleSend()
    → trims content, checks not empty and not disabled
    → onSend(trimmed)  ← prop from ChatArea
      → handleSendMessage(content) in ChatArea
        → getSocket().emit('send_message', { roomId: room.id, content })
          → Server socket/index.js: 'send_message' handler
            → Validates: roomId is number, content is string, trimmed, ≤4000 chars
            → pool.query("INSERT INTO messages (room_id, user_id, content)
                          VALUES ($1, $2, $3)
                          RETURNING id, room_id, user_id, content, created_at")
            → const message = { ...result.rows[0], username }  ← attach username
            → io.to('room:${roomId}').emit('receive_message', message)
              ↳ Sent to ALL sockets in the room (including sender)
        → ChatArea listener: 'receive_message'
          → onReceiveMessage(msg): msg.room_id === room.id check
          → setMessages(prev => [...prev, msg])
          → Clear typingUsers for this sender
        → MessageList re-renders with new message
        → useEffect: bottomRef.current.scrollIntoView({behavior: 'smooth'})
```

**Key design decision**: Messages are **persisted to PostgreSQL before broadcasting**. This means:
1. Messages are never lost if a client disconnects mid-broadcast
2. The `id` and `created_at` in the broadcast are real DB values, not client-generated
3. The sender also receives `receive_message` (from `io.to()` vs `socket.to()`), so the message appears from the server, not from an optimistic local append

---

### Feature 6: Message History

**FEATURE**: Load previous messages when entering a room  
**PURPOSE**: Persistent chat — history survives page refreshes  
**FRONTEND FILES**: `ChatArea.jsx`  
**BACKEND FILES**: `routes/rooms.js`  
**API ENDPOINTS**: `GET /api/rooms/:id/messages`  
**DATABASE MODELS**: `messages`, `users`  
**FLOW**:
```
User selects a room they are a member of (or joins)
  → ChatArea useEffect [room.id, room.is_member]
    → api.get('/rooms/${room.id}/messages')
      → authMiddleware
      → SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2
        → If not member: 403 { error: 'You are not a member of this room.' }
      → SELECT m.id, m.content, m.created_at, u.id AS user_id, u.username
         FROM messages m
         JOIN users u ON u.id = m.user_id
         WHERE m.room_id = $1
         ORDER BY m.created_at ASC
         LIMIT 50
      → return { messages: [...] }
    → setMessages(data.messages)
```
**EDGE CASES**:
- Non-members get `403` even if they know the room ID (authorization at DB level)
- Maximum 50 messages — no pagination (production issue, see Part 15)
- Sorted `ASC` (oldest first) — most recent at bottom

---

### Feature 7: Online/Offline Presence

**FEATURE**: Show which users are currently online  
**PURPOSE**: Social awareness — know who you can chat with right now  
**FRONTEND FILES**: `ChatPage.jsx`, `MemberList.jsx`  
**BACKEND FILES**: `socket/index.js`  
**SOCKET EVENTS**: `online_users` (initial list), `user_online` (join), `user_offline` (leave)

**Internal presence tracking**:
```js
// socket/index.js
const activeUsers = new Map(); // Map<userId, Set<socketId>>
```

**Why a `Map<userId, Set<socketId>>`?**  
A user can have multiple browser tabs open. Each tab creates a separate socket connection with a different `socket.id`. The Set tracks all active socket connections per user. The user is only marked offline when their **last** socket disconnects (Set becomes empty).

**Multi-tab behavior**:
```
User opens Tab 1 → socket connects → activeUsers.get(userId).size === 1 → emit 'user_online'
User opens Tab 2 → socket connects → activeUsers.get(userId).size === 2 → DO NOT emit 'user_online' again
User closes Tab 1 → socket disconnects → size → 1 → DO NOT emit 'user_offline'
User closes Tab 2 → socket disconnects → size → 0 → activeUsers.delete(userId) → emit 'user_offline'
```

**Frontend handling in ChatPage.jsx**:
```js
const handleOnlineUsers = (userIds) => setOnlineUsers(new Set(userIds));   // initial list
const handleUserOnline  = ({ userId }) => setOnlineUsers(prev => new Set([...prev, userId]));
const handleUserOffline = ({ userId }) => setOnlineUsers(prev => { const n = new Set(prev); n.delete(userId); return n; });
```

**`onlineUsers` is passed** as a prop to `MemberList` which uses `onlineUsers.has(member.id)` to show green/grey dot.

---

### Feature 8: Typing Indicators

**FEATURE**: Show "Alice is typing…" to other room members in real-time  
**PURPOSE**: UX feedback — users know when someone is composing a reply  
**FRONTEND FILES**: `MessageInput.jsx`, `ChatArea.jsx`, `TypingIndicator.jsx`  
**BACKEND FILES**: `socket/index.js`  
**SOCKET EVENTS**: `typing` (client→server), `stop_typing` (client→server), `user_typing` (server→client), `user_stop_typing` (server→client)

**Debounce mechanism in `MessageInput.jsx`**:
```
User types character
  → handleChange()
    → if value non-empty: startTyping()
      → if !isTypingRef.current: emit typing=true (first keystroke only)
      → clearTimeout(typingTimeoutRef.current)
      → setTimeout(1500ms): emit typing=false  ← reset after inactivity
    → if value empty: stopTyping()
      → clearTimeout
      → if isTypingRef.current: emit typing=false
```

`isTypingRef` is a `useRef` (not `useState`) to avoid re-renders on typing state changes.

**Server handling**:
```js
// Uses socket.to() — sends to everyone in the room EXCEPT the sender
socket.on('typing', ({ roomId }) => {
  socket.to(`room:${roomId}`).emit('user_typing', { userId, username, roomId });
});
socket.on('stop_typing', ({ roomId }) => {
  socket.to(`room:${roomId}`).emit('user_stop_typing', { userId, username, roomId });
});
```

**ChatArea state** — `typingUsers: { [userId]: username }`:
- Added on `user_typing` (only if `roomId === room.id` and `userId !== user.id`)
- Removed on `user_stop_typing`
- Also removed when a `receive_message` arrives from that user (they sent the message, so stop showing typing)

**TypingIndicator** receives `typingNames = Object.values(typingUsers)` and renders:
- 0 names: empty div (no layout shift)
- 1 name: "Alice is typing"
- 2 names: "Alice and Bob are typing"
- 3+ names: "Several people are typing"

---

### Feature 9: Member List

**FEATURE**: View members of the current room with online/offline status  
**PURPOSE**: See who is in the room and who is available  
**FRONTEND FILES**: `ChatArea.jsx`, `MemberList.jsx`  
**BACKEND FILES**: `routes/rooms.js`  
**API ENDPOINTS**: `GET /api/rooms/:id/members`  
**FLOW**:
```
User clicks "👥 Members" button (ChatArea header)
  → setShowMembers(true)
  → {showMembers && room.is_member && <MemberList members={members} onlineUsers={onlineUsers} />}
  → MemberList splits members into online/offline arrays
  → Renders online section (green dot), offline section (grey dot)
```

Members are fetched when the room is selected (not when the panel is opened). The panel is toggle-only on the frontend.

---

### Socket.IO Room Namespacing

The server uses Socket.IO's built-in room system with the naming convention `room:${roomId}`:

```js
socket.join(`room:${roomId}`);        // user joins socket room
io.to(`room:${roomId}`).emit(...)     // broadcast to all members (including sender)
socket.to(`room:${roomId}`).emit(...) // broadcast to all members (EXCEPT sender)
```

This means `room:1`, `room:2`, etc. are the Socket.IO room identifiers. These are separate from the database `rooms` table — the socket rooms are ephemeral (in-memory, re-joined on each connection).

---

<a name="part-7"></a>
## Part 7 — API Documentation

### REST API Table

| Method | Endpoint | Purpose | Auth | Request Body | Response | Route File | Handler |
|---|---|---|---|---|---|---|---|
| POST | `/api/auth/register` | Register new user | ❌ | `{ username, email, password }` | `201 { user, token }` | `routes/auth.js` | anonymous handler |
| POST | `/api/auth/login` | Login existing user | ❌ | `{ email, password }` | `200 { user, token }` | `routes/auth.js` | anonymous handler |
| GET | `/api/auth/me` | Get current user from token | ✅ | — | `200 { user }` | `routes/auth.js` | anonymous handler |
| GET | `/api/rooms` | List all rooms | ✅ | — | `200 { rooms: [...] }` | `routes/rooms.js` | anonymous handler |
| POST | `/api/rooms` | Create a new room | ✅ | `{ name }` | `201 { room }` | `routes/rooms.js` | anonymous handler |
| POST | `/api/rooms/:id/join` | Join a room | ✅ | — | `200 { message }` | `routes/rooms.js` | anonymous handler |
| POST | `/api/rooms/:id/leave` | Leave a room | ✅ | — | `200 { message }` | `routes/rooms.js` | anonymous handler |
| GET | `/api/rooms/:id/members` | Get room members | ✅ | — | `200 { members: [...] }` | `routes/rooms.js` | anonymous handler |
| GET | `/api/rooms/:id/messages` | Get last 50 messages | ✅ | — | `200 { messages: [...] }` or `403` | `routes/rooms.js` | anonymous handler |
| GET | `/api/health` | Server health check | ❌ | — | `200 { status: 'ok', ts }` | `server/index.js` | inline handler |

### Socket.IO Events Table

| Direction | Event Name | Payload | Handler Location | Description |
|---|---|---|---|---|
| Client → Server | `join_room` | `{ roomId: number }` | `socket/index.js` | Join socket room (verified against DB) |
| Client → Server | `leave_room` | `{ roomId: number }` | `socket/index.js` | Leave socket room |
| Client → Server | `send_message` | `{ roomId: number, content: string }` | `socket/index.js` | Persist + broadcast message |
| Client → Server | `typing` | `{ roomId: number }` | `socket/index.js` | User started typing |
| Client → Server | `stop_typing` | `{ roomId: number }` | `socket/index.js` | User stopped typing |
| Server → Client | `online_users` | `userId[]` | `socket/index.js` | Initial online user ID list (on connect) |
| Server → Client | `user_online` | `{ userId, username }` | `socket/index.js` | A user came online |
| Server → Client | `user_offline` | `{ userId, username }` | `socket/index.js` | A user went offline |
| Server → Client | `receive_message` | `{ id, room_id, user_id, content, created_at, username }` | `socket/index.js` | New message in a room |
| Server → Client | `user_typing` | `{ userId, username, roomId }` | `socket/index.js` | Someone started typing |
| Server → Client | `user_stop_typing` | `{ userId, username, roomId }` | `socket/index.js` | Someone stopped typing |
| Server → Client | `user_joined_room` | `{ userId, username, roomId }` | `socket/index.js` | A user joined the socket room |
| Server → Client | `user_left_room` | `{ userId, username, roomId }` | `socket/index.js` | A user left the socket room |
| Server → Client | `error` | `{ message: string }` | `socket/index.js` | Error from server (e.g., not a member) |

### Error Responses

| HTTP Code | Meaning | When returned |
|---|---|---|
| 400 | Bad Request | Missing fields, validation failure |
| 401 | Unauthorized | Missing/invalid/expired JWT |
| 403 | Forbidden | Authenticated but not a room member (messages endpoint) |
| 404 | Not Found | User not found in /me |
| 409 | Conflict | Duplicate username/email or duplicate room name |
| 500 | Internal Server Error | Unhandled DB or runtime error |
| 503 | Service Unavailable | DATABASE_URL not configured |

---

<a name="part-8"></a>
## Part 8 — Frontend Architecture

### No Routing Library

This project uses **no React Router**. Navigation between pages is done purely by React state in `App.jsx`:

```jsx
return user ? <ChatPage /> : <AuthPage />;
```

Two "pages", determined by whether the user is authenticated.

### State Management

**No Redux, no Zustand, no React Query.** State is managed with:
- `useState` — local component state (messages, members, rooms, forms)
- `useContext` — global auth state (`AuthContext`)
- `useRef` — mutable values that don't cause re-renders (`prevRoomId`, `typingTimeoutRef`, `isTypingRef`, `bottomRef`)
- `useCallback` — memoized handlers to prevent re-creating functions on each render
- `useEffect` — side effects (fetching data, socket subscriptions, session restoration)

### Page: `AuthPage.jsx`

| Concern | Implementation |
|---|---|
| Dual-mode (login/register) | `tab` state: `'login'` \| `'register'` |
| Form state | Single `{ username, email, password }` object |
| Field handler | `handle(e)` → spread-update on `e.target.name` |
| Submit | `submit(e)` → calls `login()` or `register()` from context |
| Loading | `loading` state → button text "Please wait…" and `disabled` |
| Error display | `error` state → `<div className="auth-error">` |
| Tab switch | Clears error on tab change |
| HTML ids | All inputs/buttons have IDs (`tab-login`, `tab-register`, `username`, `email`, `password`, `btn-submit-auth`) |

### Page: `ChatPage.jsx`

| Concern | Implementation |
|---|---|
| Room list | Fetched on mount via `fetchRooms()`, stored in `rooms` state |
| Active room | `activeRoomId` state, `activeRoom = rooms.find(r => r.id === activeRoomId)` |
| Online users | `onlineUsers: Set<userId>` updated by socket events |
| Room update | `handleRoomUpdate(updatedRoom)` — merges partial update into rooms array |
| Room created | `handleRoomCreated(newRoom)` — appends + sorts alphabetically + navigates |

### Component: `ChatArea.jsx`

The most complex component. It is responsible for:
- Switching socket rooms on room change (via `prevRoomId` ref)
- Fetching message history and members when a room is opened
- All socket event subscriptions for messages, typing, and membership changes
- Join/Leave actions (both HTTP and socket)
- Assembling `MessageList`, `TypingIndicator`, `MessageInput`, and `MemberList`

**Effect dependencies** — important interview topic:
```js
// Re-runs when room ID or membership status changes
useEffect(() => { ... }, [room?.id, room?.is_member]);

// Re-registers socket listeners when room ID or current user ID changes
useEffect(() => { ... }, [room.id, user.id]);
```

### API Service Layer

`client/src/services/api.js` — Axios instance with:
- `baseURL: '/api'` (relative, so Vite proxy handles dev routing)
- Automatic JWT header via request interceptor

`client/src/services/socket.js` — Socket.IO singleton with:
- Module-level `let socket = null`
- `initSocket()` disconnects any existing socket before creating a new one (prevents double connections on re-login)
- `transports: ['websocket']` — skips HTTP long-polling, connects directly via WebSocket

### CSS Architecture

`client/src/index.css` (788 lines) uses a CSS custom property (variable) design system:
- Color palette via `--bg-primary`, `--accent`, `--text-primary`, etc.
- Sizing tokens via `--sidebar-width: 280px`, `--header-height: 60px`, `--radius-*`
- Shadow tokens via `--shadow-sm`, `--shadow-md`, `--shadow-glow`
- Font: `'Inter'` from Google Fonts (referenced via CSS variable `--font`)
- Dark mode by default (deep navy/slate palette)
- Custom scrollbar styling
- Glassmorphism effects via `rgba(255, 255, 255, 0.04)` backgrounds

### Loading State

`App.jsx` shows a spinner while `AuthContext.loading === true`:
```jsx
if (loading) {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <span>Loading Chatter…</span>
    </div>
  );
}
```
`loading` starts `true`, set to `false` in the `finally` block of the `/me` check in `AuthContext.useEffect`.

### How Frontend Communicates with Backend

| Communication type | Library | How triggered |
|---|---|---|
| REST HTTP | Axios (`api.js`) | Explicit calls in `useCallback`s and `useEffect`s |
| WebSocket | socket.io-client (`socket.js`) | `initSocket()` after auth, then event listeners |
| JWT attachment | Axios interceptor | Automatic on every `api.*` call |
| Socket auth | `auth: { token }` in handshake | In `initSocket(token)` call |

---

<a name="part-9"></a>
## Part 9 — Backend Architecture

### Express App Initialization (`server/index.js`)

```
require('dotenv').config()          → load .env
const app = express()               → create Express app
const httpServer = http.createServer(app)  → wrap in Node HTTP server
                                           (required for Socket.IO to share port)
app.use(cors(corsOptions))          → allow CLIENT_URL origin with credentials
app.use(express.json())             → parse JSON request bodies
app.use('/api/auth', authRoutes)    → mount auth router
app.use('/api/rooms', roomRoutes)   → mount rooms router
app.get('/api/health', ...)         → health check
const io = new Server(httpServer, {...})  → Socket.IO attached to same HTTP server
initSocket(io)                      → register all socket event handlers
httpServer.listen(PORT)             → start listening
```

### Middleware Stack (per request)

```
Incoming HTTP Request
  ↓
cors()                  → sets Access-Control-Allow-Origin header
  ↓
express.json()          → parses Content-Type: application/json body → req.body
  ↓
Route matching          → e.g., POST /api/auth/login
  ↓
authMiddleware          → (only on protected routes) verifies JWT → req.user
  ↓
Route handler           → business logic + DB query
  ↓
res.json({ ... })       → HTTP response
```

### Database Connection Pool (`server/db/index.js`)

```js
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: ...,
  max: 10,                  // max connections in pool
  idleTimeoutMillis: 30000, // close idle connections after 30s
  connectionTimeoutMillis: 5000,  // fail fast if no connection within 5s
});
```

Pool is a singleton — imported with `require('../db')` in every file that needs DB access. Node.js module caching ensures the same pool instance is reused.

**Connection usage patterns**:
- Simple queries: `pool.query(sql, params)` — automatically borrows and returns a connection
- Transactions: `const client = await pool.connect()` → manual `client.release()` in `finally`

### Error Handling Patterns

| Pattern | Where | Code |
|---|---|---|
| pg UNIQUE violation | `routes/auth.js`, `routes/rooms.js` | `if (err.code === '23505')` |
| DB not configured | `routes/auth.js` | `if (err.code === 'ECONNREFUSED')` |
| Invalid room ID | `routes/rooms.js` | `if (isNaN(roomId)) return 400` |
| Membership check | `routes/rooms.js` `/messages` | `if (memberCheck.rows.length === 0) return 403` |
| JWT failure | `middleware/auth.js` | `catch → return 401` |
| Socket errors | `socket/index.js` | `socket.emit('error', { message })` |
| Pool errors | `db/index.js` | `pool.on('error', ...)` — logs but doesn't crash |

### No Service Layer

There are no separate "service" files (no `userService.js`, `roomService.js`). Business logic is written directly in the route handlers. For the scale of this application this is acceptable; at larger scale you'd extract it.

### No ORM

Raw SQL with parameterized queries (`$1`, `$2`) via `pg`. No Sequelize, Prisma, or TypeORM. This is a deliberate choice for transparency and control.

---

<a name="part-10"></a>
## Part 10 — Code Location Cheat Sheet

| Feature | File | Function/Handler | What it does |
|---|---|---|---|
| Server startup | `server/index.js` | module top-level | Creates Express + HTTP + Socket.IO, starts on PORT 5000 |
| DB connection pool | `server/db/index.js` | `module.exports = pool` | PostgreSQL pool, max 10 connections |
| DB schema | `server/db/schema.sql` | SQL DDL | Creates 4 tables + 2 indexes + general room seed |
| DB migration runner | `server/db/migrate.js` | `migrate()` | Reads schema.sql → executes against DB |
| JWT auth middleware | `server/middleware/auth.js` | `authMiddleware()` | Verifies Bearer token → attaches req.user |
| User registration | `server/routes/auth.js` | `router.post('/register', ...)` | Validates → bcrypt → INSERT users → return token |
| User login | `server/routes/auth.js` | `router.post('/login', ...)` | SELECT user → bcrypt.compare → return token |
| Token signing | `server/routes/auth.js` | `signToken(user)` | jwt.sign with 7d expiry |
| Current user | `server/routes/auth.js` | `router.get('/me', ...)` | Protected → SELECT user from DB |
| Room listing | `server/routes/rooms.js` | `router.get('/', ...)` | All rooms with member count + is_member |
| Room creation | `server/routes/rooms.js` | `router.post('/', ...)` | Transaction: insert room + creator membership |
| Room join | `server/routes/rooms.js` | `router.post('/:id/join', ...)` | INSERT room_members ON CONFLICT DO NOTHING |
| Room leave | `server/routes/rooms.js` | `router.post('/:id/leave', ...)` | DELETE room_members |
| Room members | `server/routes/rooms.js` | `router.get('/:id/members', ...)` | SELECT members with username |
| Message history | `server/routes/rooms.js` | `router.get('/:id/messages', ...)` | Auth-gated, last 50 messages |
| Socket.IO setup | `server/socket/index.js` | `initSocket(io)` | Registers all socket event handlers |
| Socket JWT auth | `server/socket/index.js` | `io.use(...)` | Verifies token from handshake.auth.token |
| Presence tracking | `server/socket/index.js` | `activeUsers: Map` | userId → Set of socketIds |
| Socket join room | `server/socket/index.js` | `socket.on('join_room', ...)` | Verifies DB membership → socket.join() |
| Socket messaging | `server/socket/index.js` | `socket.on('send_message', ...)` | Persist to DB → broadcast to room |
| Typing indicator | `server/socket/index.js` | `socket.on('typing', ...)` | Relay to room members (not sender) |
| Axios instance | `client/src/services/api.js` | `const api = axios.create(...)` | baseURL + JWT interceptor |
| Socket singleton | `client/src/services/socket.js` | `initSocket()`, `getSocket()` | Socket.IO client singleton management |
| Auth state | `client/src/context/AuthContext.jsx` | `AuthProvider`, `useAuth()` | Global user state + login/register/logout |
| Session restore | `client/src/context/AuthContext.jsx` | `useEffect([], [])` | Reads localStorage → calls /me on mount |
| App routing | `client/src/App.jsx` | `AppContent` | Conditional render: AuthPage vs ChatPage |
| Auth page | `client/src/pages/AuthPage.jsx` | `AuthPage()` | Login/Register form + error handling |
| Chat page | `client/src/pages/ChatPage.jsx` | `ChatPage()` | Rooms + online presence management |
| Room sidebar | `client/src/components/RoomList.jsx` | `RoomList()` | Room list + create room form |
| Chat panel | `client/src/components/ChatArea.jsx` | `ChatArea()` | Messages + typing + join/leave |
| Message rendering | `client/src/components/MessageList.jsx` | `MessageList()` | Auto-scroll, message grouping |
| Message input | `client/src/components/MessageInput.jsx` | `MessageInput()` | Textarea with typing debounce |
| Typing display | `client/src/components/TypingIndicator.jsx` | `TypingIndicator()` | "X is typing" text + animated dots |
| Member panel | `client/src/components/MemberList.jsx` | `MemberList()` | Online/offline member list |

---

<a name="part-11"></a>
## Part 11 — Technology Explanation

### React 19

**What**: JavaScript UI library by Meta for building component-based interfaces.  
**Why used**: SPA architecture — the entire UI is a tree of React components that re-render reactively when state changes.  
**Where in project**: All frontend (`client/src/`). Hooks used: `useState`, `useEffect`, `useContext`, `useCallback`, `useRef`, `createContext`.  
**Config**: JSX transform enabled by `@vitejs/plugin-react` in Vite.  
**Alternatives**: Vue.js, Svelte, Angular  
**Why React makes sense**: Component model maps well to UI pieces (RoomList, ChatArea, etc.); hooks make socket subscriptions and side effects clean.

---

### Vite 8

**What**: Next-generation frontend build tool that uses native ES modules in development.  
**Why used**: Much faster than Create React App (CRA). HMR (Hot Module Replacement) is near-instant.  
**Where in project**: `client/vite.config.js`. Notably configures the **dev proxy**: all requests to `/api/*` are forwarded to `http://localhost:5000`, avoiding CORS issues in development.  
**Important config**:
```js
proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } }
```
This means the frontend makes requests to `/api/auth/login` (relative) and Vite dev server forwards them to `http://localhost:5000/api/auth/login`. In production this proxy would not exist — the frontend must be served from the same origin or CORS must be configured.  
**Alternatives**: Webpack (CRA), Parcel, esbuild

---

### Node.js ≥18

**What**: JavaScript runtime built on V8, event-driven, non-blocking I/O.  
**Why used**: Enables JavaScript on the server. Single-threaded event loop handles many concurrent WebSocket connections efficiently.  
**Where in project**: All backend (`server/`).  
**Important**: `engines: { "node": ">=18.0.0" }` in `package.json` — uses modern JS features.

---

### Express 4

**What**: Minimal web framework for Node.js.  
**Why used**: Handles HTTP routing, middleware, and request/response lifecycle.  
**Where in project**: `server/index.js`, `server/routes/auth.js`, `server/routes/rooms.js`.  
**Config**: CORS via `cors` package, JSON parsing via `express.json()`.  
**Alternatives**: Fastify (faster), Koa, Hapi

---

### Socket.IO 4.7 (server) / 4.8 (client)

**What**: WebSocket library with fallbacks, rooms, namespaces, and middleware.  
**Why used**: Real-time bidirectional communication for messaging, typing indicators, and presence.  
**Where in project**: `server/socket/index.js` (server), `client/src/services/socket.js` (client).  
**Key features used**:
- `io.use()` middleware for JWT auth on connection
- `socket.join('room:X')` / `socket.to('room:X').emit()` for room broadcasting
- `socket.handshake.auth.token` for passing JWT during connection
- `transports: ['websocket']` on client — skips HTTP polling, faster
- `pingTimeout: 60000`, `pingInterval: 25000` for connection health monitoring
- `reconnectionAttempts: 5`, `reconnectionDelay: 1000` on client

**Alternatives**: raw WebSocket (ws package), Ably, Pusher, Firebase Realtime DB

---

### PostgreSQL (via `pg` package)

**What**: Relational database with strong ACID guarantees.  
**Why used**: Relational data (users → rooms → messages), need for transactions, composite primary keys.  
**Where in project**: `server/db/index.js` (pool), `server/db/schema.sql` (schema).  
**Client**: `node-postgres` (`pg`) — raw SQL, no ORM.  
**Key features used**: Connection pooling, parameterized queries, transactions, composite PKs, UNIQUE constraints, CHECK constraints, `ON CONFLICT` handling, aggregate functions (`COUNT`, `BOOL_OR`).  
**Alternatives**: MySQL, SQLite, MongoDB (document), Supabase (managed Postgres)

---

### `bcryptjs`

**What**: Pure JavaScript implementation of bcrypt password hashing.  
**Why used**: bcrypt is the industry standard for one-way password hashing. It includes a salt automatically and is intentionally slow (cost factor).  
**Where in project**: `server/routes/auth.js` — `bcrypt.hash(password, 12)` for registration, `bcrypt.compare(password, hash)` for login.  
**Cost factor 12**: Results in ~250ms hash time — slow enough to defeat brute-force, fast enough for UX.  
**Why bcryptjs vs bcrypt**: `bcryptjs` is pure JS (no native addon), easier to install cross-platform. `bcrypt` requires node-gyp. The output format is compatible.  
**Alternatives**: Argon2 (newer, recommended by OWASP), scrypt

---

### `jsonwebtoken`

**What**: JWT library for Node.js — creates and verifies JSON Web Tokens.  
**Why used**: Stateless authentication. Server doesn't need to store session state — the token carries all needed user info.  
**Where in project**: `server/routes/auth.js` (`jwt.sign`), `server/middleware/auth.js` (`jwt.verify`), `server/socket/index.js` (`jwt.verify`).  
**Config**: `{ expiresIn: '7d' }` — token valid for 7 days.  
**Payload**: `{ id, username, email }` — `iat` (issued-at) and `exp` (expiry) added automatically.  
**Alternatives**: Paseto (more secure by design), session cookies + express-session

---

### Axios

**What**: Promise-based HTTP client for the browser.  
**Why used**: Simple API, supports interceptors (to auto-attach JWT).  
**Where in project**: `client/src/services/api.js`.  
**Key feature**: Request interceptor automatically reads token from `localStorage` and sets `Authorization: Bearer` header.  
**Alternatives**: native `fetch`, ky, SWR (for data fetching patterns)

---

### `cors`

**What**: Express middleware that sets CORS response headers.  
**Why used**: Browser blocks cross-origin requests by default. Since frontend (`:5173`) and backend (`:5000`) are on different ports in dev, CORS headers are needed.  
**Config**: `origin: process.env.CLIENT_URL, credentials: true`.  
**Note**: In production, if frontend is served by the same server or a reverse proxy, CORS may not be needed.

---

### `dotenv`

**What**: Loads environment variables from `.env` file into `process.env`.  
**Why used**: Keeps secrets (JWT_SECRET, DATABASE_URL) out of code.  
**Where in project**: `server/index.js` (`require('dotenv').config()`), `server/db/index.js` (with explicit path resolution).  
**Note**: `db/index.js` uses `require('path').resolve(__dirname, '../../.env')` because the working directory when running the pool might differ.

---

### `concurrently`

**What**: Runs multiple npm scripts simultaneously in one terminal.  
**Why used**: `npm run dev` starts both `nodemon server/index.js` AND `vite` in one command.  
**Config in package.json**: `"dev": "concurrently \"npm run server\" \"npm run client\""`

---

### `nodemon`

**What**: Auto-restarts Node.js server when files change.  
**Why used**: Development convenience — no manual server restart on code changes.  
**Where**: `"server": "nodemon server/index.js"` in `package.json`.

---

### `oxlint`

**What**: Extremely fast JavaScript linter written in Rust.  
**Why used**: Faster alternative to ESLint for catching code issues.  
**Where**: `client/.oxlintrc.json`, `"lint": "oxlint"` in client `package.json`.

---

<a name="part-12"></a>
## Part 12 — Interview Questions

### A. Easy Project Questions

**Q: What does Chatter do?**  
*Testing*: Can you summarize your own project?  
*Answer*: "Chatter is a real-time multi-room group chat application. Users can register, log in, browse rooms, join rooms, and send messages that appear instantly for all room members via WebSockets. It supports online presence indicators and typing indicators."  
*Code support*: `App.jsx`, `ChatPage.jsx`, `ChatArea.jsx`, `socket/index.js`  
*Follow-up*: "How many rooms can a user be in?" → No limit enforced in the code.

---

**Q: How do users stay logged in after a page refresh?**  
*Testing*: Do you understand browser storage and session persistence?  
*Answer*: "After login/register, the JWT token is stored in `localStorage` with key `chatter_token`. On page load, `AuthContext.useEffect` reads this token, calls `GET /api/auth/me` to validate it server-side, and if valid, re-establishes the user session and Socket.IO connection."  
*Code support*: `AuthContext.jsx` lines 12–25, `routes/auth.js` `/me` handler

---

**Q: How is the "general" room created?**  
*Testing*: Do you know your DB schema?  
*Answer*: "It's seeded in `schema.sql` at the bottom. The INSERT uses `ON CONFLICT (name) DO NOTHING`, so running the migration multiple times won't create duplicate general rooms. `created_by` is NULL because no user created it."  
*Code support*: `server/db/schema.sql` lines 51–54

---

### B. Medium Project Questions

**Q: Explain the typing indicator implementation end-to-end.**  
*Testing*: Do you understand event debouncing and WebSocket event design?  
*Answer*: "When a user types in `MessageInput`, `startTyping()` fires. It emits a `typing` socket event only on the first keypress (`isTypingRef` guards against repeated emissions). A 1500ms debounce timeout is set — if no keypress arrives in 1.5 seconds, `onTyping(false)` is called, emitting `stop_typing`. The server relays `user_typing`/`user_stop_typing` to other room members using `socket.to()` (excluding sender). `ChatArea` maintains `typingUsers: { userId: username }` and passes `Object.values(typingUsers)` to `TypingIndicator`."  
*Code support*: `MessageInput.jsx` TYPING_DEBOUNCE_MS, `socket/index.js` lines 107–114, `ChatArea.jsx` lines 61–69  
*Follow-up*: "Why use a `useRef` instead of `useState` for `isTypingRef`?" → State changes trigger re-renders. For a debounce flag that's checked on every keypress, re-rendering is wasteful and can cause bugs. Ref is mutable without re-rendering.

---

**Q: Why is a transaction used when creating a room?**  
*Testing*: Do you understand database transactions and atomicity?  
*Answer*: "Creating a room requires two inserts: one into `rooms` and one into `room_members` (the creator is auto-joined). If only the room insert succeeded and the membership insert failed, we'd have a room the creator can't access. A transaction (`BEGIN`/`COMMIT`/`ROLLBACK`) ensures both operations succeed or neither does — atomicity."  
*Code support*: `routes/rooms.js` lines 42–70  
*Follow-up*: "What does `client.release()` do?" → Returns the DB connection back to the pool in the `finally` block.

---

**Q: How does the server handle a user with multiple browser tabs?**  
*Testing*: Do you understand the presence tracking design?  
*Answer*: "The server uses `activeUsers: Map<userId, Set<socketId>>`. Each tab creates a separate socket with a different `socket.id`. Both are added to the user's Set. `user_online` is only emitted when the Set size goes from 0 to 1 (first connection). `user_offline` is only emitted when the Set becomes empty (last connection closes). Closing one tab doesn't broadcast offline if another tab is still connected."  
*Code support*: `socket/index.js` lines 18, 40–48, 120–128

---

**Q: How does the `GET /api/rooms` endpoint return `member_count` and `is_member` in a single query?**  
*Testing*: Do you understand SQL aggregation?  
*Answer*: "`member_count` uses `COUNT(DISTINCT rm.user_id)` — counts unique user IDs in `room_members` for each room. `is_member` uses `BOOL_OR(rm.user_id = $1)` — returns true if any row in the group has `user_id` equal to the current user's ID. Both are computed in a single LEFT JOIN + GROUP BY query, avoiding N+1 queries."  
*Code support*: `routes/rooms.js` lines 14–27

---

### C. Deep-Dive Questions

**Q: The messages endpoint has a LIMIT 50. What happens if a room has 1000 messages?**  
*Testing*: Do you understand pagination and the limits of your implementation?  
*Answer*: "Only the 50 most recent messages are returned, oldest first. There is no cursor-based or offset-based pagination. A user joining a room with 1000 messages would see only messages 951–1000. This is a known limitation. In production I would implement cursor-based pagination using the `created_at` timestamp or message `id` as a cursor, with a `before` query parameter."  
*Code support*: `routes/rooms.js` lines 145–153

---

**Q: What would happen if `jwt.verify` throws `TokenExpiredError`?**  
*Testing*: Error handling and token lifecycle.  
*Answer*: "In `authMiddleware`, both `JsonWebTokenError` and `TokenExpiredError` are caught by the same `catch(err)` block and both return `401 { error: 'Invalid or expired token.' }`. On the frontend, the Axios call would reject with a 401 response. Currently there is no automatic token refresh — the user would have to log in again. The `AuthContext` useEffect catches this on page load and removes the token from localStorage."  
*Code support*: `middleware/auth.js` lines 21–23, `AuthContext.jsx` lines 21–23

---

**Q: How is authorization enforced for `GET /api/rooms/:id/messages`?**  
*Testing*: Do you understand the difference between authentication and authorization?  
*Answer*: "Authentication: the JWT middleware ensures the request comes from a logged-in user. Authorization: the handler then separately queries `SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2`. If no row is returned, the user is authenticated but not a member of that specific room, so a 403 Forbidden is returned. Both layers are necessary — auth proves who you are; authorization proves you have permission."  
*Code support*: `routes/rooms.js` lines 136–143

---

**Q: Why does the server emit `receive_message` to `io.to(room)` instead of `socket.to(room)`?**  
*Testing*: Socket.IO broadcast semantics.  
*Answer*: "`socket.to(room)` broadcasts to all members of the room EXCEPT the sender. `io.to(room)` broadcasts to ALL members including the sender. By using `io.to()`, the sender also receives the `receive_message` event from the server. This means the message in the UI is always the server-confirmed, DB-persisted version (with real `id` and `created_at`), not an optimistic local copy. This prevents duplication if we were also appending locally."  
*Code support*: `socket/index.js` line 99

---

### D. Architecture Questions

**Q: How does routing work in this application?**  
*Testing*: React routing knowledge.  
*Answer*: "There is no React Router. Routing is purely conditional: `App.jsx` renders `<AuthPage>` if `user === null` and `<ChatPage>` if user is set. Within `ChatPage`, the active room is tracked via `activeRoomId` state and the corresponding `ChatArea` is rendered. This is sufficient for a two-page application but would not scale to multiple URL-addressable pages."

---

**Q: How do the frontend and backend communicate during development vs production?**  
*Testing*: Network architecture awareness.  
*Answer*: "In development, Vite's dev server proxies all `/api` requests to `http://localhost:5000`. So the frontend calls `/api/auth/login` (relative URL) and Vite forwards it — no CORS issue. The Socket.IO client connects directly to `http://localhost:5000` (hardcoded in `socket.js`). In production this hardcoded URL is a bug — it should use an environment variable or relative URL."  
*Code support*: `vite.config.js`, `services/socket.js` line 14

---

**Q: Why is there a separate `http.createServer(app)` wrapping Express?**  
*Testing*: Node.js and Socket.IO internals.  
*Answer*: "Socket.IO needs to attach itself to a Node.js HTTP server (not just an Express app) so it can handle the WebSocket upgrade request. The HTTP server handles both normal HTTP (delegated to Express) and WebSocket upgrade (handled by Socket.IO). If we just passed `app` to Socket.IO, it wouldn't work properly."  
*Code support*: `server/index.js` lines 12, 32

---

### E. Database Questions

**Q: Why does `room_members` have a composite primary key instead of an auto-increment `id`?**  
*Testing*: Database design and constraint understanding.  
*Answer*: "The combination of `(room_id, user_id)` is naturally unique — a user can only be in a room once. Using it as the PK prevents duplicate memberships at the database level, not just at the application level. An auto-increment ID would allow inserting two rows with the same `(room_id, user_id)`, which is logically invalid."

---

**Q: Explain the two indexes in the schema and why they exist.**  
*Testing*: Index design knowledge.  
*Answer*: "`idx_messages_room_created` on `messages(room_id, created_at ASC)` — the most used query is 'give me all messages in room X ordered by time.' Without this index, PostgreSQL would scan the entire messages table. With it, it can jump directly to the room's messages and read them in order. `idx_room_members_user` on `room_members(user_id)` — speeds up 'what rooms does this user belong to?' queries. The room list query joins `room_members` and aggregates by `user_id = $1`, so this index is useful."  
*Code support*: `schema.sql` lines 41–48

---

**Q: What does `ON DELETE CASCADE` do on `messages.room_id`?**  
*Testing*: SQL foreign key constraints.  
*Answer*: "If a room is deleted from the `rooms` table, all messages with that `room_id` are automatically deleted too. Same for `room_members`. This maintains referential integrity without the application needing to manually cascade deletes."

---

### F. Backend Questions

**Q: How does the join endpoint prevent a user from being added to a room twice?**  
*Testing*: SQL idempotency patterns.  
*Answer*: "`INSERT INTO room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT (room_id, user_id) DO NOTHING`. The composite PK `(room_id, user_id)` creates an implicit unique constraint. `ON CONFLICT DO NOTHING` tells PostgreSQL to silently skip the insert if a row with that combination already exists. The query succeeds without error, making the endpoint idempotent."  
*Code support*: `routes/rooms.js` lines 79–83

---

**Q: How does the server know which user sent a socket message?**  
*Testing*: Security + Socket.IO middleware.  
*Answer*: "The Socket.IO `io.use()` middleware runs before any event handler on connection. It reads `socket.handshake.auth.token`, verifies the JWT, and attaches `socket.user = { id, username }`. All event handlers then read `socket.user.id` and `socket.user.username` — they never trust the client to send their own identity in the event payload."  
*Code support*: `socket/index.js` lines 21–32, then `const { id: userId, username } = socket.user;` at line 36

---

**Q: What are parameterized queries and why are they used?**  
*Testing*: SQL injection prevention.  
*Answer*: "Parameterized queries (also called prepared statements) use placeholders `$1, $2, ...` instead of string interpolation. The `pg` library sends the SQL and parameters separately to PostgreSQL, which handles the substitution safely. This prevents SQL injection — if a user submits `'; DROP TABLE users; --` as a username, it's treated as a literal string value, not SQL code."  
*Code support*: Every `pool.query()` call in `routes/auth.js` and `routes/rooms.js`

---

### G. Authentication/Security Questions

**Q: Where is the JWT secret stored? What happens if it's leaked?**  
*Testing*: Security awareness.  
*Answer*: "The secret is in `.env` as `JWT_SECRET`, loaded via `dotenv`. `.env` is in `.gitignore`. If the secret is leaked, an attacker could forge valid JWTs for any user ID, bypassing all authentication. The fix is to immediately invalidate all existing tokens by rotating to a new secret — but currently there's no token revocation mechanism. In production, we'd use a secret rotation strategy and store the secret in a secrets manager like AWS Secrets Manager."

---

**Q: Why do login failure messages say "Invalid email or password" instead of "User not found" or "Wrong password"?**  
*Testing*: Security (user enumeration).  
*Answer*: "Using different messages for 'user not found' vs 'wrong password' would allow an attacker to enumerate which emails are registered in the system. By returning the same error message for both cases, an attacker can't tell whether the email exists. This is called preventing user enumeration."  
*Code support*: `routes/auth.js` lines 76, 81

---

**Q: Is JWT stored in localStorage safe? What are the risks?**  
*Testing*: XSS awareness.  
*Answer*: "Storing JWT in `localStorage` is vulnerable to XSS (Cross-Site Scripting) attacks — if an attacker injects malicious JavaScript into the page, they can read `localStorage.getItem('chatter_token')` and steal the token. The safer alternative is `HttpOnly` cookies, which JavaScript cannot access at all. However, `localStorage` is simpler to implement and acceptable for a development project. In production, moving to `HttpOnly` cookies with CSRF protection would be the improvement."

---

**Q: What does bcrypt's cost factor 12 mean?**  
*Testing*: Cryptography basics.  
*Answer*: "Bcrypt's cost factor (also called 'rounds') is an exponent of 2. Cost 12 means `2^12 = 4096` iterations of the hash function. This makes the hash computation take ~250ms on modern hardware. This is intentionally slow — it makes brute-force attacks impractical since each password attempt takes 250ms. Increasing to 13 doubles the time. bcrypt also automatically generates and stores a unique salt per password, preventing rainbow table attacks."

---

### H. JavaScript/Node.js Questions

**Q: Why does the `useEffect` in `AuthContext` have an empty dependency array `[]`?**  
*Testing*: React hooks knowledge.  
*Answer*: "An empty `[]` dependency array means the effect runs only once, after the initial render (equivalent to `componentDidMount`). This is the correct behavior for session restoration — we only want to check localStorage and call `/me` once when the app loads, not on every re-render."  
*Code support*: `AuthContext.jsx` line 12

---

**Q: What is `useCallback` used for in `ChatPage` and `ChatArea`?**  
*Testing*: React performance knowledge.  
*Answer*: "`useCallback` memoizes a function so its reference doesn't change on every render. In `ChatPage`, `fetchRooms` is wrapped in `useCallback` with `[]` dependencies because it's used in a `useEffect` dependency array — without `useCallback`, `fetchRooms` would be a new function reference on every render, causing an infinite loop (`useEffect` sees the function changed → re-runs → re-renders → new function...). In `ChatArea`, `handleSendMessage` and `handleTyping` are wrapped with `[room.id]` dependencies."  
*Code support*: `ChatPage.jsx` lines 15–22, `ChatArea.jsx` lines 133, 139

---

**Q: What is the Node.js Event Loop and why does it matter here?**  
*Testing*: OS/Node.js fundamentals.  
*Answer*: "Node.js is single-threaded with an event loop. It handles I/O operations (like DB queries and socket messages) asynchronously via callbacks/promises without blocking the main thread. `await pool.query(...)` doesn't block — it registers a callback for when the DB responds and frees the thread to handle other requests. This is why a single Node.js process can handle thousands of concurrent WebSocket connections — it never blocks waiting for I/O."

---

### I. React Questions

**Q: How does `AuthContext` share state across all components?**  
*Testing*: React Context understanding.  
*Answer*: "`createContext(null)` creates a context object. `AuthProvider` wraps the app and provides `{ user, loading, login, register, logout }` via `<AuthContext.Provider value={...}>`. Any child component can access this with `useContext(AuthContext)` via the `useAuth()` hook. Changes to the context value (e.g., `setUser()`) trigger re-renders in all consuming components."  
*Code support*: `AuthContext.jsx` entire file, `App.jsx`

---

**Q: How does `MessageList` implement message grouping?**  
*Testing*: React rendering + algorithm knowledge.  
*Answer*: "For each message, it checks the previous message. `isSameMinute(prev.created_at, msg.created_at)` compares year, month, day, hour, and minute of both timestamps. If the sender is the same AND the timestamps are in the same minute, the message is rendered as a `message-continuation` (no avatar, no username — just the text). This creates a visually grouped conversation."  
*Code support*: `MessageList.jsx` lines 8–15, 41–55

---

**Q: How does `MessageList` auto-scroll to the latest message?**  
*Testing*: useRef and DOM interactions.  
*Answer*: "A `bottomRef = useRef(null)` is attached to an empty `<div ref={bottomRef} />` at the bottom of the messages list. A `useEffect` with `[messages]` as dependency calls `bottomRef.current?.scrollIntoView({ behavior: 'smooth' })` every time the `messages` array changes (i.e., a new message arrives). The optional chaining `?.` handles the case where the ref hasn't mounted yet."  
*Code support*: `MessageList.jsx` lines 22–27, 72

---

### J. System Design/Scalability Questions

See Part 14 for the complete scalability analysis.

**Q: How would you scale the typing indicator system to 100,000 users?**  
*Testing*: Distributed systems thinking.  
*Answer*: "Currently the socket server stores `activeUsers` in memory on a single Node.js process. With 100k users and multiple servers, a user typing on Server A and a room member connected to Server B would never receive the typing indicator. The solution is Socket.IO with an adapter — either `@socket.io/redis-adapter` or `@socket.io/postgres-adapter`. The adapter publishes socket events to Redis pub/sub, and all server instances subscribe. Typing events from Server A are published to Redis → consumed by Server B → broadcast to the correct client."

---

<a name="part-13"></a>
## Part 13 — "Interviewer Can Point Here"

### File: `server/middleware/auth.js`

**Possible questions**:
1. **Why is middleware used here?** — To avoid repeating auth logic in every route handler. DRY principle. Applied once via `router.use(authMiddleware)` in `rooms.js`.
2. **How is the token verified?** — `jwt.verify(token, process.env.JWT_SECRET)` — synchronous, throws if invalid/expired.
3. **What happens if the token is missing?** — `401 { error: 'Authorization header missing or malformed.' }` (line 11)
4. **What happens if the token is expired?** — `jwt.verify` throws `TokenExpiredError`, caught, returns `401 { error: 'Invalid or expired token.' }` (line 22)
5. **Why 401 and not 403?** — 401 = unauthenticated (you need to log in); 403 = authenticated but not authorized. Missing/expired token = not authenticated.
6. **Where is this middleware attached?** — `router.use(authMiddleware)` applies it to ALL routes in `rooms.js`. Applied individually as a second argument for `GET /me` in `auth.js`.
7. **What is attached to `req.user`?** — `{ id, username, email }` — only safe fields, never `password_hash`.
8. **Can this scale?** — Yes, it's stateless. Token verification uses only the secret (no DB lookup), so any server instance can verify any token.

---

### File: `server/socket/index.js`

**Possible questions**:
1. **Why verify JWT again here?** — The HTTP auth middleware protects REST routes, but Socket.IO connections have their own auth flow via `io.use()`. A WebSocket connection doesn't go through Express middleware.
2. **How do you handle multiple tabs from the same user?** — `Map<userId, Set<socketId>>` (lines 18, 40–48).
3. **Why persist messages to DB before broadcasting?** — Ensures no message loss. DB `id` and `created_at` are authoritative. (line 89–96)
4. **What is `socket.to()` vs `io.to()`?** — `socket.to()` excludes sender; `io.to()` includes everyone.
5. **How do you prevent a user from joining a socket room they're not a member of?** — DB query `SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2` (lines 60–66).
6. **What is `room:${roomId}`?** — The Socket.IO room name. Prefixed to avoid collision with user IDs or other internal names.

---

### File: `server/routes/rooms.js` — POST /

**Possible questions**:
1. **Why a transaction here?** — Two inserts must succeed or fail together (room + creator membership).
2. **What is `client.release()`?** — Returns the connection back to the pool (in `finally`). Forgetting this causes connection pool exhaustion.
3. **What if the COMMIT fails?** — No — COMMIT failure would throw an error, which is caught by the outer `catch`. The `ROLLBACK` in the catch handles it.
4. **What if `pool.connect()` itself fails?** — The error would propagate before `BEGIN` runs, and there's no client to release. In practice, the `pool.connect()` call failing would be handled by the overall try-catch, but `client.release()` would fail since `client` is undefined. This is an edge case not fully handled.

---

### File: `server/db/schema.sql` — `room_members`

**Possible questions**:
1. **Why composite PK?** — Natural uniqueness. A user can only be in a room once.
2. **What does `ON DELETE CASCADE` do?** — Deleting a room automatically removes all membership rows.
3. **Difference between `ON DELETE CASCADE` and `ON DELETE SET NULL`?** — `rooms.created_by` uses SET NULL because we want the room to survive user deletion. `room_members` uses CASCADE because membership without a room or user is meaningless.

---

### File: `client/src/services/socket.js`

**Possible questions**:
1. **Why a singleton pattern?** — Only one socket connection should exist. Multiple connections would receive duplicate events.
2. **What is `transports: ['websocket']`?** — Skips HTTP long-polling (Socket.IO's fallback). Directly upgrades to WebSocket. Faster but requires WebSocket support (all modern browsers support it).
3. **What happens if the socket disconnects?** — `reconnectionAttempts: 5` — Socket.IO client automatically tries to reconnect up to 5 times with 1-second delays.
4. **Why `if (socket) socket.disconnect()` at the start of `initSocket`?** — Prevents creating a second socket if a user logs in, logs out, and logs in again without a full page refresh.

---

### File: `client/src/context/AuthContext.jsx`

**Possible questions**:
1. **Why not use Redux?** — The auth state is simple: one user object and a few methods. Context + useState is sufficient. Redux adds boilerplate without benefit here.
2. **What if `api.get('/auth/me')` fails after finding a token?** — `catch` removes the token from `localStorage` and `finally` sets `loading: false`. The user is treated as logged out.
3. **Why call `/me` and not just decode the JWT on the frontend?** — JWT can be expired. Decoding it would succeed (decode ≠ verify), and the app would think the user is logged in with an expired token. The server-side `/me` call fails on expiry.
4. **What is `useCallback` wrapping `login`, `register`, `logout`?** — Memoizes the functions so they don't change reference on every render. Important since they're passed as props and could cause child component re-renders.

---

### File: `client/src/components/MessageInput.jsx`

**Possible questions**:
1. **Why `useRef` for `isTypingRef` instead of `useState`?** — State changes trigger re-renders. For a flag checked on every keypress, this is expensive and unnecessary. Ref is mutable without re-rendering.
2. **What is `TYPING_DEBOUNCE_MS`?** — 1500ms. If no keypress for 1.5s, the typing indicator is sent as stopped.
3. **Why `e.preventDefault()` on Enter?** — Prevents textarea from inserting a newline. Shift+Enter is allowed (the `!e.shiftKey` check allows it through).

---

<a name="part-14"></a>
## Part 14 — CS Fundamentals Connected to the Project

### OOP

This project is not class-based OOP — it uses functional JavaScript (functions, closures, modules). However, OOP concepts still appear:

| Concept | Where |
|---|---|
| **Encapsulation** | `AuthContext` encapsulates auth state and methods. `socket.js` module encapsulates the socket singleton. The `pool` in `db/index.js` is an encapsulated connection manager. |
| **Abstraction** | `authMiddleware` abstracts token verification away from route handlers. `api.js` abstracts HTTP calls with automatic JWT injection. |
| **Single Responsibility** | Each file has a clear single concern: `middleware/auth.js` only handles auth; `db/index.js` only manages the pool; `socket.js` only manages the socket singleton. |
| **Module pattern** | `module.exports` / `import/export` creates encapsulated modules — the Node.js equivalent of classes/packages. |

---

### DBMS

| Concept | Where |
|---|---|
| **Normalization** | The schema is in 3NF. User data in `users`, room data in `rooms`, the M:N relationship in `room_members`. No data duplication except `username` is denormalized into the `receive_message` socket payload for performance. |
| **Indexing** | `idx_messages_room_created(room_id, created_at ASC)` is a composite B-Tree index. `idx_room_members_user(user_id)` speeds up membership lookups. |
| **ACID Transactions** | Room creation uses `BEGIN`/`COMMIT`/`ROLLBACK` for atomicity. |
| **Referential Integrity** | FK constraints with `ON DELETE CASCADE` and `ON DELETE SET NULL`. |
| **CHECK constraints** | `content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000)`. |
| **Composite PK** | `room_members(room_id, user_id)` — natural key, prevents duplicates. |
| **Aggregation** | `COUNT(DISTINCT rm.user_id)` and `BOOL_OR(rm.user_id = $1)` in the room listing query. |
| **Upsert** | `ON CONFLICT (room_id, user_id) DO NOTHING` — idempotent join. `ON CONFLICT (name) DO NOTHING` — idempotent seed. |

---

### Operating System

| Concept | Where |
|---|---|
| **Event Loop** | Node.js uses a single-threaded event loop with libuv. `await pool.query()` is non-blocking — it registers a callback on the epoll/kqueue I/O event queue. |
| **Processes** | `concurrently` runs the server and client as separate child processes. |
| **Threads** | Node.js is single-threaded for JS execution but uses a thread pool (libuv) for file I/O and crypto. `bcrypt.hash()` uses the thread pool to avoid blocking the event loop. |
| **Memory** | `activeUsers: Map<userId, Set<socketId>>` lives in Node.js heap memory. It grows with connected users and shrinks on disconnect. This is process-local — not shared between multiple server instances. |
| **Sockets** | WebSocket connections are TCP sockets kept open for the lifetime of the connection. Each Socket.IO connection is one TCP socket. |

---

### Computer Networks

| Concept | Where |
|---|---|
| **HTTP/1.1** | REST API uses HTTP for request-response communication. |
| **WebSocket** | Socket.IO uses the WebSocket protocol (TCP) for persistent, full-duplex communication. `transports: ['websocket']` skips the HTTP polling fallback. |
| **HTTP Upgrade** | WebSocket starts as an HTTP request, then upgrades to WebSocket via `Connection: Upgrade` and `Upgrade: websocket` headers. This is why Express and Socket.IO share the same port. |
| **CORS** | Cross-Origin Resource Sharing headers are set by the `cors` middleware. Required because frontend (`:5173`) and backend (`:5000`) are different origins in development. |
| **TLS/SSL** | The DB connection uses `ssl: { rejectUnauthorized: false }` for cloud databases (Neon, Supabase). The application itself doesn't handle TLS — that would be handled by a reverse proxy (Nginx) in production. |
| **TCP keep-alive** | `pingTimeout: 60000` and `pingInterval: 25000` in Socket.IO send periodic heartbeat packets to detect dead connections. |
| **DNS** | `http://localhost:5000` resolves to `127.0.0.1` via the system hosts file. |

---

### System Design at Scale

#### 1,000 Users
- Current architecture handles this fine
- Single Node.js process can manage ~1000 WebSocket connections with minimal CPU
- PostgreSQL handles ~100 queries/second easily
- Connection pool of 10 is adequate

#### 100,000 Users

**What breaks**:
1. **`activeUsers` Map is in-memory**: With multiple server instances behind a load balancer, each server has its own separate `activeUsers`. Broadcasting `user_online` from Server A won't reach clients connected to Server B. **Fix**: Socket.IO Redis adapter (`@socket.io/redis-adapter`) — publishes events to Redis Pub/Sub, all servers receive and relay.
2. **PostgreSQL connection pool**: 10 connections per server × N servers might overwhelm PostgreSQL. **Fix**: PgBouncer (connection pooler) in front of PostgreSQL.
3. **Message history LIMIT 50**: Not a scalability issue per se, but a UX problem with active rooms.
4. **No message caching**: Every room load hits the DB. **Fix**: Cache last N messages in Redis with TTL.

#### 1,000,000 Users

**What breaks**:
1. **Single PostgreSQL**: One DB cannot handle millions of concurrent message inserts. **Fix**: Read replicas for `SELECT` queries (message history, room listing), primary for writes. Horizontal sharding of messages table by `room_id`.
2. **WebSocket connections**: Millions of persistent TCP connections. **Fix**: Horizontal scaling with multiple Socket.IO servers behind a load balancer (HAProxy, Nginx). Redis adapter for cross-server broadcasting.
3. **Message fan-out**: Broadcasting to a room with 50,000 members requires 50,000 socket writes. This can saturate network. **Fix**: Limit room sizes, use message queues (Kafka/RabbitMQ) for async fan-out.
4. **No message queue**: Messages go directly from client to DB to broadcast. Under load, DB inserts become the bottleneck. **Fix**: Message queue between socket and DB writes. Kafka for ordered, durable message delivery.
5. **No CDN**: Static assets (JS, CSS, HTML) served from single origin. **Fix**: CDN (CloudFront, Fastly).
6. **No caching layer**: Every `/api/rooms` call hits PostgreSQL. **Fix**: Redis cache for room list with short TTL (e.g., 5 seconds).

---

<a name="part-15"></a>
## Part 15 — Production Improvements

### Issue 1: No Message Pagination

| | |
|---|---|
| **Current** | `GET /api/rooms/:id/messages` returns the last 50 messages, hardcoded `LIMIT 50` |
| **Problem** | Rooms with many messages lose history. Users cannot scroll up to load older messages |
| **Why it's a problem** | Users miss context; data is in the DB but inaccessible |
| **Production solution** | Cursor-based pagination: `GET /api/rooms/:id/messages?before=<messageId>&limit=50`. Use the message `id` (or `created_at`) as a cursor: `WHERE room_id = $1 AND id < $2 ORDER BY id DESC LIMIT 50` then reverse for display |
| **Technologies** | SQL WHERE clauses, infinite scroll on frontend |

---

### Issue 2: Socket URL Hardcoded in Production

| | |
|---|---|
| **Current** | `socket = io('http://localhost:5000', ...)` in `services/socket.js` line 14 |
| **Problem** | In production, the server won't be at `localhost:5000`. The frontend will fail to connect via WebSocket |
| **Production solution** | Use an environment variable: `io(import.meta.env.VITE_API_URL || window.location.origin, ...)`. Or configure a reverse proxy (Nginx) to serve the Socket.IO connection at the same origin |
| **Technologies** | Vite env variables (`VITE_*`), Nginx WebSocket proxy |

---

### Issue 3: Token Stored in localStorage (XSS Risk)

| | |
|---|---|
| **Current** | `localStorage.setItem('chatter_token', data.token)` |
| **Problem** | Vulnerable to XSS. If any third-party script or injection vulnerability exists, the token can be stolen |
| **Production solution** | Move to `HttpOnly` cookies: server sets `Set-Cookie: token=...; HttpOnly; Secure; SameSite=Strict`. Frontend sends `credentials: 'include'` (fetch) or `withCredentials: true` (Axios). JavaScript cannot read `HttpOnly` cookies |
| **Tradeoffs** | Cookies require CSRF protection. CORS must allow credentials. More complex server-side session management |
| **Technologies** | HTTP cookies, `express-session` or `cookie-parser`, CSRF tokens |

---

### Issue 4: No Token Refresh Mechanism

| | |
|---|---|
| **Current** | Token expires after 7 days. User must re-login manually |
| **Problem** | In production, shorter token lifetimes (15 minutes) are recommended for security. With 15-minute access tokens and no refresh mechanism, users would be logged out constantly |
| **Production solution** | Implement refresh tokens: issue a long-lived refresh token (stored in `HttpOnly` cookie) and a short-lived access token. A `POST /api/auth/refresh` endpoint verifies the refresh token and issues a new access token |
| **Technologies** | Dual-token pattern, refresh token rotation, token blacklisting via Redis |

---

### Issue 5: No Message Pagination / Infinite History Loading

See Issue 1.

---

### Issue 6: No Input Sanitization for XSS in Messages

| | |
|---|---|
| **Current** | `content` is stored as raw text. `MessageList.jsx` renders it via JSX: `<p className="message-text">{msg.content}</p>` |
| **Problem** | JSX automatically escapes HTML — so `<script>alert(1)</script>` is safe as plain text. However, if the app ever adds `dangerouslySetInnerHTML` (e.g., for markdown rendering), this becomes an XSS vector |
| **Current status** | Actually safe right now due to JSX escaping, but any future markdown/HTML feature would need sanitization |
| **Production solution** | If adding rich text: `DOMPurify` on the frontend to sanitize HTML before rendering. Always validate content on the server (length check exists, but no HTML stripping) |

---

### Issue 7: No Rate Limiting

| | |
|---|---|
| **Current** | Any client can call any endpoint unlimited times |
| **Problem** | Login endpoint is vulnerable to brute-force attacks. Message endpoint could be spammed |
| **Production solution** | `express-rate-limit` middleware: `POST /auth/login` — 5 attempts per 15 minutes per IP. `POST /auth/register` — 3 per hour. `send_message` socket event — debounce/rate-limit per user |
| **Technologies** | `express-rate-limit`, Redis for distributed rate limiting across servers |

---

### Issue 8: `pool.connect()` Without Error Handling If Client Is Undefined

| | |
|---|---|
| **Current** | In `routes/rooms.js` POST `/`, if `pool.connect()` throws, `client` is undefined. The `finally` block calls `client.release()` which would throw a new error |
| **Problem** | Error in `pool.connect()` could surface as an unhandled "cannot read property 'release' of undefined" |
| **Production solution** | `let client; try { client = await pool.connect(); ... } finally { if (client) client.release(); }` |

---

### Issue 9: Single `general` Room — No Default Join

| | |
|---|---|
| **Current** | The `general` room is seeded but new users are NOT automatically joined to it |
| **Problem** | New users see the room but must manually click "Join Room" to participate |
| **Production solution** | During registration, after inserting the user, also insert a row into `room_members` for the `general` room ID. Or have a concept of "public rooms" that all users can see messages in without explicit joining |

---

### Issue 10: No Error Boundary in React

| | |
|---|---|
| **Current** | No React Error Boundary component wrapping the app |
| **Problem** | If a component throws during render (e.g., unexpected null in `msg.username`), the entire app crashes to a blank screen |
| **Production solution** | Wrap `<App>` or key sections in an Error Boundary component that shows a fallback UI and optionally reports the error to Sentry |

---

<a name="part-16"></a>
## Part 16 — Final Interview Cheat Sheet

### 1. Project in 30 Seconds

"Chatter is a real-time group chat application. Users register and log in with JWT authentication, can browse and join chat rooms, and send messages that appear instantly for all room members via Socket.IO WebSockets. It also shows online/offline presence and typing indicators."

---

### 2. Project in 2 Minutes

"Chatter has a React 19 frontend built with Vite and a Node.js Express backend. The database is PostgreSQL with 4 tables: users, rooms, room_members (the join table for the many-to-many relationship), and messages.

Authentication uses bcryptjs for password hashing and JWT for stateless tokens stored in localStorage. Every HTTP request goes through an Axios interceptor that attaches the Bearer token. Socket.IO connections are authenticated via the JWT passed in the handshake handshake auth object.

The real-time layer is built on Socket.IO. When a user sends a message, it's emitted as a `send_message` event, persisted to PostgreSQL first, then broadcast to all room members via `io.to('room:X').emit('receive_message', ...)`. Typing indicators use debouncing — `stop_typing` fires after 1500ms of inactivity.

Online presence is tracked in-memory using a `Map<userId, Set<socketId>>` to handle multiple browser tabs correctly."

---

### 3. Architecture Explanation

```
React (Vite) → Axios (HTTP REST) → Express → authMiddleware → Route handlers → PostgreSQL
            ↘ Socket.IO client → Socket.IO server (io.use JWT) → Socket event handlers → PostgreSQL
```

Both REST and WebSocket share port 5000 via `http.createServer(app)`.

---

### 4. Database Explanation

4 tables: `users`, `rooms`, `room_members` (junction, composite PK), `messages`.  
2 key indexes: `(room_id, created_at)` on messages for chronological fetching; `(user_id)` on room_members for membership lookups.  
Transactions: room creation uses `BEGIN`/`COMMIT`/`ROLLBACK`.  
No ORM — raw SQL with parameterized queries.

---

### 5. Authentication Explanation

1. Register/Login → bcrypt hash/verify → JWT signed (7d expiry)
2. Token stored in `localStorage` as `chatter_token`
3. Axios interceptor attaches `Authorization: Bearer <token>` to all HTTP requests
4. Express `authMiddleware` verifies token, attaches `req.user`
5. Socket.IO `io.use()` verifies token from `socket.handshake.auth.token`
6. On page refresh: read token → call `/me` → validate server-side → restore session

---

### 6. Most Important Files

| File | Why Important |
|---|---|
| `server/socket/index.js` | All real-time logic: presence, messaging, typing |
| `server/routes/rooms.js` | All room/message REST APIs |
| `server/routes/auth.js` | Registration, login, JWT |
| `server/middleware/auth.js` | Protects all authenticated routes |
| `server/db/schema.sql` | Entire DB structure |
| `client/src/context/AuthContext.jsx` | Global auth state + session management |
| `client/src/components/ChatArea.jsx` | Main chat experience, socket subscriptions |
| `client/src/services/api.js` | Axios + JWT interceptor |
| `client/src/services/socket.js` | Socket.IO singleton |

---

### 7. Most Important APIs

| Endpoint | What it does |
|---|---|
| `POST /api/auth/register` | Create account, returns JWT |
| `POST /api/auth/login` | Authenticate, returns JWT |
| `GET /api/auth/me` | Validate token, return user |
| `GET /api/rooms` | All rooms with counts |
| `POST /api/rooms` | Create room (transactional) |
| `POST /api/rooms/:id/join` | Join room (idempotent) |
| `GET /api/rooms/:id/messages` | Last 50 messages (membership-gated) |

---

### 8. Most Difficult Feature

**Online presence with multi-tab support**: Using `Map<userId, Set<socketId>>` to track all socket connections per user. Broadcasting `user_online` only on first connection and `user_offline` only on last disconnection required careful logic to avoid false offline notifications when users have multiple tabs open.

---

### 9. Biggest Technical Challenge

**Dual authentication system**: REST routes use Express middleware checking the `Authorization` header. Socket.IO connections use a separate `io.use()` middleware checking `socket.handshake.auth.token`. Both need to use the same JWT secret and produce the same `user` object, but are completely separate code paths. Ensuring both are equally secure and consistent was the main challenge.

---

### 10. Important Tradeoffs

| Decision | Tradeoff |
|---|---|
| JWT in localStorage vs HttpOnly cookie | Simple ✅ vs XSS-safe ❌ |
| No React Router (state-based nav) | Simple ✅ vs no URL routing, no deep links ❌ |
| Raw SQL vs ORM | Full control ✅ vs more verbose ❌ |
| LIMIT 50 (no pagination) | Simple ✅ vs incomplete history ❌ |
| In-memory presence tracking | Simple ✅ vs doesn't scale to multiple servers ❌ |
| No message deletion | Simple ✅ vs users can't undo messages ❌ |
| `transports: ['websocket']` | Fast ✅ vs no polling fallback ❌ |

---

### 11. Scalability Discussion

**Single server bottleneck**: The `activeUsers` Map and socket room tracking are in-process memory. Multiple server instances would need Socket.IO Redis adapter.

**Database**: LIMIT 50 is fine at small scale. At large scale: read replicas for history, caching in Redis, message sharding by `room_id`.

**WebSocket connections**: Each connection is a TCP socket. Linux file descriptor limits (~65k per process). With horizontal scaling and Redis adapter, can handle millions.

**Rate limiting**: Currently absent — needed in production to prevent abuse.

---

### 12. 30 Most Likely Interview Questions

1. Walk me through what this app does.
2. Explain the authentication flow.
3. How does real-time messaging work?
4. What is Socket.IO and how does it differ from raw WebSockets?
5. How do you handle multiple browser tabs from the same user?
6. What is JWT? How do you verify it?
7. Why bcrypt? What is a cost factor?
8. Explain the database schema — tables, relationships, constraints.
9. What is a composite primary key? Where is it used and why?
10. What is a database transaction? Where did you use one?
11. What are indexes? Which indexes did you add and why?
12. Explain the typing indicator implementation.
13. What is the difference between `io.to()` and `socket.to()`?
14. How is authorization enforced (not just authentication)?
15. What is the middleware pattern? How does it work in Express?
16. What happens if the JWT expires?
17. How is session restored after a page refresh?
18. What is CORS? Why do you need it here?
19. What is a connection pool? Why set `max: 10`?
20. Why did you use PostgreSQL instead of MongoDB?
21. What is `ON CONFLICT DO NOTHING`? Where did you use it?
22. How does the Axios interceptor work?
23. What is `useCallback` used for in React?
24. Why is `useRef` used in `MessageInput` for `isTypingRef`?
25. How does auto-scroll work in `MessageList`?
26. What would happen if two users try to create a room with the same name simultaneously?
27. How would you add message pagination?
28. What are the security risks in your current token storage approach?
29. How would you scale this to 100,000 users?
30. What would you improve if taking this to production?

---

*Document generated on 2026-09-04. Based entirely on direct source code analysis of the Chatter project codebase.*
