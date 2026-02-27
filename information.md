# 📡 Live Poll System — Information & Workflow Guide

A real-time, interactive polling application built for classrooms. Teachers create live polls, students vote in real-time, and a leaderboard tracks scores — all powered by WebSockets.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Getting Started](#getting-started)
4. [Features Overview](#features-overview)
5. [Detailed Workflow](#detailed-workflow)
6. [Client Architecture](#client-architecture)
7. [Server Architecture](#server-architecture)
8. [Socket Events Reference](#socket-events-reference)
9. [Database Schema](#database-schema)

---

## Tech Stack

| Layer     | Technology                                  |
| --------- | ------------------------------------------- |
| Frontend  | React 18, Vite, React Router, Lucide Icons  |
| Backend   | Node.js, Express, Socket.IO                 |
| Database  | PostgreSQL (via `pg` pool)                   |
| Realtime  | Socket.IO (WebSocket with fallback)         |
| Styling   | Inline CSS objects (no external framework)   |

---

## Project Structure

```
Live Poll System/
├── client/                        # React frontend (Vite)
│   └── src/
│       ├── main.jsx               # Entry point, routing setup
│       ├── index.css              # Global styles
│       ├── hooks/
│       │   ├── useSocket.js       # Socket.IO connection hook
│       │   └── usePollTimer.js    # Countdown timer hook
│       ├── pages/
│       │   ├── Home.jsx           # Role selection (Student / Teacher)
│       │   ├── TeacherDashboard.jsx  # Poll creation, live results, history, leaderboard
│       │   └── StudentView.jsx    # Name registration, voting, leaderboard sidebar
│       └── lib/
│           └── socket.js          # Socket.IO client instance
│
├── server/                        # Node.js backend
│   └── src/
│       ├── index.js               # Express + Socket.IO server setup
│       ├── config/
│       │   ├── db.js              # PostgreSQL connection pool
│       │   ├── initDb.js          # Table creation script
│       │   ├── migrate.js         # General migrations
│       │   └── migrate-marks.js   # Migration for marks & correct_answer columns
│       ├── controllers/
│       │   ├── pollController.js      # Socket business logic (state, timer, scoring)
│       │   └── pollRestController.js  # REST API controller (HTTP routes)
│       ├── routes/
│       │   └── pollRoutes.js          # REST API routes (/api/polls)
│       ├── services/
│       │   └── pollService.js         # Database queries (pure DB layer)
│       └── sockets/
│           └── pollSocketHandler.js   # Thin event dispatcher (no business logic)
```

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL database running locally or remotely
- A `.env` file in `server/` with: `DATABASE_URL=postgresql://user:pass@host:port/dbname`

### Setup

```bash
# 1. Install dependencies
cd server && npm install
cd ../client && npm install

# 2. Create database tables
cd ../server && node src/config/initDb.js

# 3. Run migrations (if upgrading from an older version)
node src/config/migrate-marks.js

# 4. Start the server (default port 5000)
npm run dev

# 5. Start the client (default port 5173)
cd ../client && npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Features Overview

### 🏠 Home Page (Role Selection)
- Users choose **"I'm a Student"** or **"I'm a Teacher"**
- Selection highlights with a purple checkmark
- "Continue" button navigates to the appropriate dashboard

### 👩‍🏫 Teacher Dashboard
| Feature | Description |
|---|---|
| **Create Poll** | Enter a question (max 100 chars), add multiple options, set a timer (30/60/90/120s), assign marks, and mark the correct answer |
| **Live Results** | Real-time bar chart showing vote counts and percentages per option with animated progress bars |
| **Timer** | Countdown timer displayed as a badge; poll auto-ends when time runs out |
| **Chat** | Floating chat button opens a panel to communicate with students in real-time |
| **Participants** | Tab in the chat panel showing all connected students with Warn and Kick buttons |
| **Poll History** | Modal listing all past polls with expandable cards showing detailed vote breakdowns |
| **Delete History** | Red "Delete All" button inside the History modal with confirmation prompt; permanently removes all polls and votes |
| **Leaderboard** | Modal showing ranked student scores with 🥇🥈🥉 medals and a Reset Scores button |
| **Connection Status** | Live/Offline badge showing WebSocket connection state |

### 🧑‍🎓 Student View
| Feature | Description |
|---|---|
| **Registration** | Enter name to join the session (stored in sessionStorage per tab) |
| **State Recovery** | If the student refreshes mid-poll, their name is restored from sessionStorage and they rejoin without re-registering |
| **Live Voting** | See the question with a points badge, select an option with a radio indicator, and submit |
| **Vote Confirmation** | Green success banner after voting; options become disabled |
| **Leaderboard Sidebar** | Always-visible ranked leaderboard on the right side, highlights current student with "(You)" |
| **Chat** | Floating chat FAB to message the teacher and other students |
| **Waiting State** | Animated spinner when no active poll; message when previous poll ended |
| **Warnings** | Yellow toast notification when teacher sends a warning |
| **Kick Protection** | Full-screen "Removed from Session" message if kicked by teacher |

---

## Detailed Workflow

### 1. Teacher Creates a Poll

```
Teacher fills form → Clicks "Ask Question"
    ↓
Client emits: socket.emit('start_poll', {
    question, options, duration,
    correctAnswer,    // the text of the correct option
    marks             // points awarded for correct vote
})
    ↓
Server receives 'start_poll':
    1. Ends any currently active poll in DB
    2. INSERT new poll with question, options, duration, start_time,
       correct_answer, marks columns
    3. Sets activePollState in memory
    4. Broadcasts 'start_poll' event to ALL connected clients
    5. Starts a 1-second interval timer
```

### 2. Students See the Question & Vote

```
All clients receive 'start_poll' event
    ↓
StudentView renders the poll card with:
    - Question text
    - Points badge (e.g., "10 pts")
    - Countdown timer
    - Clickable option buttons
    ↓
Student selects an option → clicks "Submit Answer"
    ↓
Client emits: socket.emit('submit_vote', {
    pollId, studentId, studentName, optionSelected
})
    ↓
Server receives 'submit_vote':
    1. Validates poll is active and matches pollId
    2. INSERT vote into DB (UNIQUE constraint prevents double-voting)
    3. Increments in-memory voteCounts
    4. If optionSelected === correctAnswer → add marks to leaderboard
    5. Broadcasts 'poll_update' with new voteCounts to ALL
    6. Broadcasts 'leaderboard_update' if score changed
```

### 3. Timer Expires — Poll Ends

```
Server timer interval checks every 1 second:
    remainingTime = duration - elapsed
    ↓
When remainingTime ≤ 0:
    1. UPDATE poll status = 'ended' in DB
    2. Set activePollState.active = false
    3. Broadcast 'poll_ended' to ALL clients
    4. Broadcast final 'leaderboard_update'
    5. Clear the timer interval
```

### 4. Teacher Views Results

```
TeacherDashboard switches to 'live' view automatically
    ↓
Displays:
    - Dark card with the question text
    - "Poll Ended" badge (or live timer if still active)
    - Total votes count
    - Animated horizontal bars per option showing:
        • Option number (colored circle)
        • Option text
        • Vote count in parentheses
        • Percentage on the right
    ↓
Teacher can click "+ Ask a new question" to return to form
```

### 5. Chat Communication

```
Any user sends a message:
    Client emits: socket.emit('send_message', {
        senderName, text, isTeacher: true/false
    })
    ↓
Server:
    1. Creates message object with id, timestamp
    2. Pushes to in-memory chatMessages array (max 100)
    3. Broadcasts 'new_message' to ALL clients
    ↓
All clients append the message to their chat panel
```

### 6. Kick / Warn a Student

```
Teacher clicks Warn button:
    socket.emit('warn_student', { socketId, message })
    → Server sends 'warning' event ONLY to that student's socket
    → Student sees a yellow toast for 6 seconds

Teacher clicks Kick button:
    socket.emit('kick_student', { socketId })
    → Server sends 'kicked' event to that student
    → Removes student from connectedStudents map
    → Broadcasts updated participants list
    → Disconnects the student's socket
    → Student sees "Removed from Session" screen
```

### 7. Poll History

```
Teacher clicks "History" button:
    socket.emit('get_poll_history')
    ↓
Server:
    1. Queries ALL polls from DB ordered by created_at DESC
    2. For each poll, queries vote counts per option
    3. Sends 'poll_history' event back to that teacher only
    ↓
Teacher sees a modal with expandable cards:
    - Status badge (ended/active)
    - Date/time
    - Question text
    - Total vote count
    - Click to expand: animated bars per option with counts + percentages
```

### 8. Leaderboard & Reset Scores

```
Leaderboard updates flow:
    Student joins → added to leaderboard at score 0
    Student votes correctly → score += poll marks
    Server broadcasts 'leaderboard_update' to ALL clients
    ↓
Both views display leaderboard:
    - Student: sidebar panel on the right (always visible)
    - Teacher: modal opened via "Leaderboard" button in bottom bar

Reset Scores:
    Teacher clicks "Reset Scores" button inside leaderboard modal
    socket.emit('reset_scores')
    ↓
    Server clears leaderboard map
    Re-adds all connected students at score 0
    Broadcasts empty leaderboard to ALL clients
```

### 9. Delete Poll History

```
Teacher opens History modal → clicks "Delete All" button
    ↓
Browser shows confirmation: window.confirm('Delete all poll history?')
    ↓
If confirmed:
    Client emits: socket.emit('delete_poll_history')
    ↓
    Server:
        1. Runs SQL: DELETE FROM polls
           (votes are auto-deleted via ON DELETE CASCADE foreign key)
        2. Sends 'poll_history' with empty array back to teacher
    ↓
    History modal instantly shows "No polls conducted yet"
```

---

## Client Architecture

### Routing (`main.jsx`)

| Route       | Component           | Purpose                     |
| ----------- | ------------------- | --------------------------- |
| `/`         | `Home`              | Role selection              |
| `/teacher`  | `TeacherDashboard`  | Poll management & results   |
| `/student`  | `StudentView`       | Voting & leaderboard        |

### Custom Hooks

**`useSocket()`** — Manages the Socket.IO connection lifecycle
- Creates socket connection on mount
- Tracks `isConnected` state
- Returns `{ socket, isConnected }`
- Cleans up on unmount

**`usePollTimer(duration, startTime)`** — Computes remaining seconds
- Calculates elapsed time from `startTime`
- Returns `remainingTime` (updates every second via `setInterval`)
- Returns 0 when expired

### State Management

All state is managed via React `useState` hooks — no external state library.

**TeacherDashboard state:**
- `view` — `'form'` or `'live'` (switches between create poll and results)
- `pollState` — current poll data from server
- `question`, `options`, `duration`, `marks`, `correctIndex` — form inputs
- `historyOpen`, `historyPolls`, `expandedPoll` — poll history modal
- `leaderboard`, `lbOpen` — leaderboard data and modal
- `panelOpen`, `activeTab`, `messages`, `participants` — chat/participants

**StudentView state:**
- `studentName`, `studentId`, `isRegistered` — registration
- `pollState`, `selectedOption`, `hasVoted` — voting
- `leaderboard` — sidebar data
- `isKicked`, `warning` — moderation states

### Student Identity & Deduplication

```
studentId = sessionStorage.getItem('pollStudentId') ?? crypto.randomUUID()
```

- Generated once **per tab** using `sessionStorage` (not `localStorage`)
- Each new tab = a new student with a fresh name prompt
- Used as the UNIQUE constraint key to prevent double-voting
- Same tab retains identity on refresh; new tabs/incognito get unique IDs

---

## Server Architecture — Controller-Service Pattern

The backend follows a strict **Controller-Service** separation:

```
Socket Events → pollSocketHandler.js (thin dispatcher)
                     ↓
               pollController.js (business logic + in-memory state)
                     ↓
               pollService.js (database queries only)

HTTP Requests → pollRoutes.js → pollRestController.js → pollService.js
```

### Entry Point (`index.js`)

1. Creates Express app + HTTP server
2. Attaches Socket.IO with CORS `origin: '*'`
3. Mounts REST routes at `/api/polls`
4. Calls `initializeSocket(io)` to set up all event handlers
5. Listens on `PORT` (default 5000)

### PollService (`pollService.js`) — Database Layer

Pure database abstraction — no business logic, just SQL queries:

| Method | Description |
|---|---|
| `createPoll(question, options, duration, startTime, correctAnswer, marks)` | Ends active polls, inserts new poll |
| `getActivePoll()` | Returns the currently active poll with vote counts |
| `endActivePoll(pollId)` | Sets poll status to 'ended' |
| `saveVote(pollId, studentId, studentName, optionSelected)` | Inserts vote (UNIQUE constraint on poll_id + student_id) |
| `getAllPolls()` | Returns all polls with their vote counts for history |
| `deleteAllPolls()` | Deletes all polls from DB (votes cascade via FK) |
| `recoverActivePoll()` | On server restart, recovers active poll with remaining time |
| `getScoreboard()` | Joins votes + polls to sum marks for correct votes per student |

### PollController (`pollController.js`) — Business Logic Layer

Owns all in-memory state and application logic. The socket handler never contains business logic — it only calls controller methods.

**In-memory state (owned by PollController):**
- `activePollState` — current poll data, timer, vote counts
- `connectedStudents` — Map of socketId → student info
- `leaderboard` — Map of studentId → { name, score }
- `chatMessages` — array of last 100 messages

**Key methods:**

| Method | Description |
|---|---|
| `initialize()` | Restores leaderboard + recovers active poll from DB on server boot |
| `getInitialState()` | Returns snapshot of current state for a newly connected client |
| `startPoll(data)` | Creates poll via service, sets in-memory state |
| `submitVote(data)` | Validates vote, saves via service, updates counts + leaderboard |
| `addStudent(socketId, studentId, name)` | Registers student in memory |
| `createMessage(data)` | Creates chat message, caps at 100 |
| `resetScores()` | Resets all leaderboard scores to 0 |
| `startTimer(io)` | Runs 1s interval, calls `timerTick()`, broadcasts results |

### PollRestController (`pollRestController.js`) — HTTP Route Logic

Handles REST API requests (separate from the socket controller):
- `createPoll(req, res)` — POST `/api/polls`
- `getActivePoll(req, res)` — GET `/api/polls/active`
- `getAllPolls(req, res)` — GET `/api/polls/history`

### Socket Handler (`pollSocketHandler.js`) — Thin Dispatcher

Contains **zero business logic**. Each `socket.on(...)` simply calls the appropriate `pollController` method and broadcasts the result. This keeps the handler clean and testable.

**On server boot:**
1. Calls `pollController.initialize()` to restore state from DB
2. Starts timer if an active poll was recovered

**On each client connection:**
1. Calls `pollController.getInitialState()` and emits all state events
2. Wires each socket event to a controller method

---

## Socket Events Reference

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `join_session` | `{ studentId, studentName }` | Student registers with name |
| `start_poll` | `{ question, options, duration, correctAnswer, marks }` | Teacher creates a poll |
| `submit_vote` | `{ pollId, studentId, studentName, optionSelected }` | Student submits vote |
| `send_message` | `{ senderName, text, isTeacher }` | Chat message |
| `get_poll_history` | (none) | Request all past polls |
| `kick_student` | `{ socketId }` | Teacher removes a student |
| `warn_student` | `{ socketId, message }` | Teacher warns a student |
| `reset_scores` | (none) | Teacher resets all leaderboard scores |
| `delete_poll_history` | (none) | Teacher deletes all polls and votes |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `current_state` | `{ active, poll, duration, startTime, remainingTime }` | Sent on connect |
| `start_poll` | `{ active, poll, duration, startTime, marks, correctAnswer }` | New poll started |
| `poll_update` | `{ voteCounts }` | Vote counts changed |
| `poll_ended` | `{ active: false, poll }` | Poll timer expired |
| `timer_sync` | `{ remainingTime, active }` | Timer tick (every second) |
| `leaderboard_update` | `[{ studentId, name, score }, ...]` | Scores changed |
| `poll_history` | `[{ id, question, options, voteCounts, ... }, ...]` | History response |
| `chat_history` | `[{ id, senderName, text, isTeacher, timestamp }, ...]` | Sent on connect |
| `new_message` | `{ id, senderName, text, isTeacher, timestamp }` | New chat message |
| `participants_update` | `[{ name, studentId, socketId }, ...]` | Student list changed |
| `kicked` | `{ message }` | Sent to kicked student only |
| `warning` | `{ message }` | Sent to warned student only |
| `error` | `{ message }` | Validation error |

---

## Database Schema

### `polls` table

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-incrementing poll ID |
| `question` | TEXT | The poll question |
| `options` | JSONB | Array of option strings |
| `duration` | INTEGER | Timer duration in seconds |
| `start_time` | BIGINT | Unix timestamp (ms) when poll started |
| `correct_answer` | VARCHAR(255) | The text of the correct option (nullable) |
| `marks` | INTEGER | Points for correct answer (default 0) |
| `status` | VARCHAR(20) | `'active'` or `'ended'` |
| `created_at` | TIMESTAMPTZ | Auto-set creation timestamp |

### `votes` table

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-incrementing vote ID |
| `poll_id` | INTEGER FK | References `polls(id)` ON DELETE CASCADE |
| `student_id` | VARCHAR(255) | UUID from client sessionStorage (unique per tab) |
| `student_name` | VARCHAR(255) | Display name entered at registration |
| `option_selected` | VARCHAR(255) | The option text the student chose |
| `created_at` | TIMESTAMPTZ | Auto-set vote timestamp |

**Constraint:** `UNIQUE(poll_id, student_id)` — prevents double-voting.

---

## Resilience Features

- **Server Restart Recovery** — Active polls are recovered from DB with remaining time recalculated
- **Leaderboard Persistence** — Scores rebuilt from DB on server boot via `getScoreboard()`
- **Late Joiner Support** — New connections receive full current state immediately
- **Student State Recovery** — If a student refreshes during an active poll, their name is restored from sessionStorage and they auto-rejoin without re-registering. If no active poll, the name form shows as usual
- **Deduplication** — sessionStorage-based `studentId` (unique per tab) + DB unique constraint prevents duplicate votes
- **Auto-cleanup** — Chat messages capped at 100; timer intervals properly cleared

---

## Inner Functionality Deep Dive

This section explains the exact internal code-level mechanics — how data flows, what SQL queries run, and how the real-time updates propagate.

---

### 1. Database Connection — How the Server Talks to PostgreSQL

The server uses the `pg` (node-postgres) library with a **connection pool**. The pool is created once at startup and shared across all requests:

```js
// server/src/config/db.js
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,  // e.g. postgresql://user:pass@localhost:5432/livepoll
});

export default pool;
```

**How it works internally:**
- `Pool` maintains a set of idle PostgreSQL connections (default max: 10)
- When `pool.query(...)` is called, it borrows a connection from the pool, executes the SQL, and returns the connection to the pool
- If all connections are busy, new queries wait in a queue until one frees up
- The `DATABASE_URL` is read from the `.env` file via `dotenv`

---

### 2. Socket.IO Connection — How Real-Time Communication Is Established

#### Client Side (`useSocket.js`)

When a page mounts (Teacher or Student), the `useSocket()` hook creates a persistent WebSocket connection:

```js
const socketInstance = io('http://localhost:5000', {
    reconnectionAttempts: 5,    // retry up to 5 times if connection drops
    reconnectionDelay: 1000,    // wait 1 second between retries
});
```

**Connection lifecycle:**
1. `io(URL)` initiates a WebSocket handshake with the server
2. Socket.IO first tries a WebSocket upgrade; if blocked, falls back to HTTP long-polling
3. On success → `'connect'` event fires → `isConnected` state becomes `true`
4. On failure → `'connect_error'` fires → error message stored in state
5. On page unmount → `socketInstance.disconnect()` is called in the `useEffect` cleanup

#### Server Side (`index.js`)

```js
const io = new Server(httpServer, { cors: { origin: '*' } });
```

- Socket.IO attaches to the existing Express HTTP server
- `cors: { origin: '*' }` allows connections from any frontend origin (for development)
- Each client connection gets a unique `socket.id` (e.g., `xRt3k9Yz...`)

#### What Happens on Every New Connection

When a client connects, the server immediately pushes 4 pieces of data:

```js
io.on('connection', (socket) => {
    // 1. Current poll state (active poll or { active: false })
    socket.emit('current_state', activePollState || { active: false });

    // 2. Chat history (last 100 messages from in-memory array)
    socket.emit('chat_history', chatMessages);

    // 3. Connected students list
    socket.emit('participants_update', Array.from(connectedStudents.values()));

    // 4. Current leaderboard scores
    socket.emit('leaderboard_update', Array.from(leaderboard.values()).sort((a, b) => b.score - a.score));
});
```

This ensures **late joiners** (students who connect after a poll has started) immediately see the question, chat history, and leaderboard.

---

### 3. Creating a Poll — Exact SQL and Data Flow

When the teacher clicks "Ask Question", here's the exact chain:

**Step 1: Client emits**
```js
socket.emit('start_poll', {
    question: "What is 2+2?",
    options: ["3", "4", "5"],
    duration: 60,
    correctAnswer: "4",      // the text of the correct option
    marks: 10                // points awarded for a correct vote
});
```

**Step 2: Server runs two SQL queries**

```sql
-- First: end any currently running poll
UPDATE polls SET status = 'ended' WHERE status = 'active';

-- Second: insert the new poll
INSERT INTO polls (question, options, duration, start_time, correct_answer, marks, status)
VALUES ('What is 2+2?', '["3","4","5"]', 60, 1709044800000, '4', 10, 'active')
RETURNING *;
```

- `options` is stored as **JSONB** (PostgreSQL JSON binary), so the array `["3","4","5"]` is serialized with `JSON.stringify()`
- `start_time` is `Date.now()` — a Unix timestamp in milliseconds
- `RETURNING *` gives back the full row including the auto-generated `id`

**Step 3: Server builds in-memory state**

```js
activePollState = {
    active: true,
    poll: { ...dbRow, voteCounts: {} },   // voteCounts starts empty
    duration: 60,
    startTime: 1709044800000,
    remainingTime: 60,
    correctAnswer: "4",
    marks: 10,
};
```

**Step 4: Server broadcasts to ALL clients**

```js
io.emit('start_poll', activePollState);
// io.emit = send to every connected socket (teacher + all students)
```

**Step 5: Timer starts**

```js
pollTimerInterval = setInterval(async () => {
    const elapsed = Math.floor((Date.now() - activePollState.startTime) / 1000);
    activePollState.remainingTime = activePollState.duration - elapsed;

    if (activePollState.remainingTime <= 0) {
        clearInterval(pollTimerInterval);
        await pollService.endActivePoll(activePollState.poll.id);  // UPDATE polls SET status='ended'
        activePollState.active = false;
        io.emit('poll_ended', activePollState);
    } else {
        io.emit('timer_sync', { remainingTime: activePollState.remainingTime, active: true });
    }
}, 1000);  // runs every 1 second
```

---

### 4. Timer Synchronization — How Client and Server Stay in Sync

The timer runs on **both** the client and server independently to avoid UI lag:

**Server timer** (authoritative):
- `setInterval` every 1s computes `remainingTime = duration - elapsed`
- Broadcasts `timer_sync` events
- When time hits 0, the server ends the poll (this is the source of truth)

**Client timer** (`usePollTimer` hook):
- Also runs its own `setInterval` every 1s
- Computes remaining time from `serverStartTime` — this is the original `Date.now()` from the server
- Formula: `remaining = max(0, duration - floor((Date.now() - serverStartTime) / 1000))`
- This is purely for **smooth UI display** — the client never decides when the poll ends

```js
// client/src/hooks/usePollTimer.js
useEffect(() => {
    const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - serverStartTime) / 1000);
        const remaining = Math.max(0, initialDuration - elapsed);
        setRemainingTime(remaining);
        if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
}, [initialDuration, serverStartTime]);
```

**Why both?** Network latency could make server-only timer updates feel choppy. The client runs its own countdown for smooth UX, while the server authoritatively ends the poll.

---

### 5. Voting — Deduplication and Score Computation

**Step 1: Client sends vote**
```js
socket.emit('submit_vote', {
    pollId: 42,
    studentId: "a1b2c3d4-...",     // from localStorage
    studentName: "Alice",
    optionSelected: "4"
});
```

**Step 2: Server validates**
```js
if (!activePollState || !activePollState.active || activePollState.poll.id !== pollId) {
    return socket.emit('error', { message: 'Poll is no longer active' });
}
```

**Step 3: Server checks for duplicate vote (SQL)**
```sql
SELECT * FROM votes WHERE poll_id = 42 AND student_id = 'a1b2c3d4-...';
```
- If a row exists → throws `"You have already voted in this poll"`
- If not → proceeds to insert

**Step 4: Insert vote (SQL)**
```sql
INSERT INTO votes (poll_id, student_id, student_name, option_selected)
VALUES (42, 'a1b2c3d4-...', 'Alice', '4')
RETURNING *;
```

**Backup deduplication:** The database also has a `UNIQUE(poll_id, student_id)` constraint. If the SELECT check somehow misses (race condition), the INSERT will fail with PostgreSQL error code `23505` (unique violation), which is caught:

```js
catch (error) {
    if (error.code === '23505') {
        throw new Error("You have already voted in this poll");
    }
    throw error;
}
```

**Step 5: Update in-memory vote counts**
```js
activePollState.poll.voteCounts["4"]++;  // increment the selected option
io.emit('poll_update', { voteCounts: activePollState.poll.voteCounts });
```

**Step 6: Score the vote (leaderboard)**
```js
if (activePollState.correctAnswer && optionSelected === activePollState.correctAnswer) {
    const current = leaderboard.get(studentId) || { name: studentName, score: 0 };
    current.score += activePollState.marks;  // e.g., +10 points
    leaderboard.set(studentId, current);
    broadcastLeaderboard(io);  // sends sorted array to ALL clients
}
```

---

### 6. Poll History — How Past Polls Are Fetched

**SQL executed by `getAllPolls()`:**

```sql
-- Step 1: Get all polls
SELECT * FROM polls ORDER BY created_at DESC;

-- Step 2: For EACH poll, get vote breakdown
SELECT option_selected, COUNT(*) as count
FROM votes WHERE poll_id = $1
GROUP BY option_selected;
```

**Data assembly in code:**
```js
for (const poll of polls) {
    const votesResult = await pool.query(
        "SELECT option_selected, COUNT(*) as count FROM votes WHERE poll_id = $1 GROUP BY option_selected",
        [poll.id]
    );

    // Initialize all options to 0
    const voteCounts = {};
    poll.options.forEach(opt => { voteCounts[opt] = 0; });

    // Fill in actual counts
    votesResult.rows.forEach(row => {
        voteCounts[row.option_selected] = parseInt(row.count, 10);
    });

    poll.voteCounts = voteCounts;  // attach to poll object
}
```

**Result shape sent to client:**
```json
[
    {
        "id": 42,
        "question": "What is 2+2?",
        "options": ["3", "4", "5"],
        "status": "ended",
        "start_time": "1709044800000",
        "correct_answer": "4",
        "marks": 10,
        "voteCounts": { "3": 2, "4": 8, "5": 1 }
    },
    ...
]
```

---

### 7. Leaderboard — Scoring Query and In-Memory Tracking

#### Building the Leaderboard from DB (on server restart)

```sql
SELECT v.student_id, v.student_name, COALESCE(SUM(p.marks), 0) AS score
FROM votes v
JOIN polls p ON v.poll_id = p.id
WHERE p.correct_answer IS NOT NULL
  AND v.option_selected = p.correct_answer
GROUP BY v.student_id, v.student_name
ORDER BY score DESC;
```

**How this works:**
- `JOIN`s the `votes` table with `polls` to match each vote to its poll
- `WHERE v.option_selected = p.correct_answer` — only counts **correct** votes
- `SUM(p.marks)` — adds up the marks from each poll where the student was right
- `GROUP BY student_id, student_name` — produces one row per student
- `ORDER BY score DESC` — highest score first

**Example result:**
```
student_id       | student_name | score
-----------------+--------------+------
a1b2c3d4-...     | Alice        | 30
e5f6g7h8-...     | Bob          | 20
```

#### Real-Time Updates (in memory)

During live operation, the leaderboard is tracked in a JavaScript `Map`:

```js
const leaderboard = new Map();
// Key: studentId (string)
// Value: { name: "Alice", score: 30 }
```

- When a student joins → `leaderboard.set(studentId, { name, score: 0 })`
- When a correct vote → `current.score += marks`
- On reset → `leaderboard.clear()` + re-add connected students at 0
- Broadcasting: convert to sorted array → `io.emit('leaderboard_update', sortedArray)`

---

### 8. Server Recovery — What Happens When the Server Restarts

The server handles two recovery tasks on boot:

#### Recovery Task 1: Leaderboard Restoration
```js
const dbScores = await pollService.getScoreboard();  // SQL query above
dbScores.forEach(s => leaderboard.set(s.studentId, { name: s.name, score: s.score }));
```

#### Recovery Task 2: Active Poll Recovery
```js
const poll = await pollService.getActivePoll();  // finds poll with status='active'

if (poll) {
    const startTime = parseInt(poll.start_time, 10);
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remainingTime = poll.duration - elapsed;

    if (remainingTime <= 0) {
        // Poll expired during downtime — end it
        await pollService.endActivePoll(poll.id);
    } else {
        // Poll still has time — resume it
        activePollState = { active: true, poll, duration, startTime, remainingTime };
        startTimer(io);  // resume the countdown
    }
}
```

This means if the server crashes mid-poll and restarts within the timer window, the poll continues seamlessly.

---

### 9. React State Update Flow — How the UI Reacts to Socket Events

#### Example: Vote comes in → progress bar animates

```
Server broadcasts: io.emit('poll_update', { voteCounts: { "3": 2, "4": 9, "5": 1 } })
    ↓
Client socket listener:
    socket.on('poll_update', ({ voteCounts }) =>
        setPollState(prev => prev ? { ...prev, poll: { ...prev.poll, voteCounts } } : prev)
    );
    ↓
React state update triggers re-render
    ↓
TeacherDashboard computes percentages:
    totalVotes = Object.values(voteCounts).reduce((s, v) => s + v, 0)  // 12
    getPct("4") = Math.round(9 / 12 * 100)  // 75%
    ↓
Progress bar div re-renders with:
    width: '75%'
    transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)'  // smooth CSS animation
```

The animation is purely CSS — no JavaScript animation library. The `transition` property on the bar `<div>` smoothly interpolates the width whenever the percentage changes.

---

### 10. Chat Messages — In-Memory Storage with Broadcast

Chat messages are **not stored in the database** — they live only in server memory:

```js
const chatMessages = [];  // in-memory array

socket.on('send_message', ({ senderName, text, isTeacher }) => {
    const msg = {
        id: Date.now(),                      // unique ID = current timestamp
        senderName,
        text,
        isTeacher: !!isTeacher,              // boolean: teacher or student
        timestamp: new Date().toISOString(), // ISO 8601 string
    };
    chatMessages.push(msg);

    // Cap at 100 messages to prevent memory leak
    if (chatMessages.length > 100) chatMessages.shift();  // remove oldest

    io.emit('new_message', msg);  // broadcast to ALL
});
```

**Implications:**
- Chat history is lost on server restart (by design — polls are the primary data)
- New connections receive the last 100 messages via `socket.emit('chat_history', chatMessages)`
- Messages appear instantly because they're broadcast without any DB write

---

### 11. Kick and Warn — Targeted Socket Events

These events are sent to **specific sockets** rather than broadcast to all:

```js
// Kick: server-side
socket.on('kick_student', ({ socketId }) => {
    const target = io.sockets.sockets.get(socketId);  // find the specific socket
    if (target) {
        target.emit('kicked', { message: 'You have been removed...' });  // tell only THAT client
        connectedStudents.delete(socketId);      // remove from participants map
        broadcastParticipants(io);               // tell everyone else the list changed
        target.disconnect(true);                 // forcefully close their WebSocket
    }
});
```

**On the student client:**
```js
socket.on('kicked', ({ message }) => {
    setIsKicked(true);        // triggers full-screen kicked UI
    setKickMessage(message);
});
```

The `target.disconnect(true)` call closes the WebSocket connection, and Socket.IO will **not** auto-reconnect because the server initiated the disconnect.

---

### 12. Student Identity — sessionStorage (Per-Tab)

```js
const getOrCreateStudentId = () => {
    let id = sessionStorage.getItem('pollStudentId');
    if (!id) {
        id = crypto.randomUUID();  // e.g., "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        sessionStorage.setItem('pollStudentId', id);
    }
    return id;
};
```

**Key behaviors:**
- Each new tab → generates a fresh UUID, stored in `sessionStorage`
- `sessionStorage` is isolated per tab (unlike `localStorage` which is shared)
- Opening Tab A and Tab B → two different students with unique IDs
- Refreshing the same tab → keeps the same UUID (sessionStorage persists on refresh)
- Student name starts empty — every new tab shows the registration form
- This lets you test with multiple students by simply opening multiple tabs

---

### 13. Delete Poll History — Cascading Delete

When the teacher clicks "Delete All" inside the History modal:

**Step 1: Confirmation**
```js
if (window.confirm('Delete all poll history? This cannot be undone.')) {
    socket.emit('delete_poll_history');
}
```

**Step 2: Server deletes (SQL)**
```sql
DELETE FROM polls;
```

Because the `votes` table has a foreign key with `ON DELETE CASCADE`:
```sql
-- votes table definition (from initDb.js)
poll_id INTEGER REFERENCES polls(id) ON DELETE CASCADE
```

Deleting all rows from `polls` **automatically** deletes every row in `votes` that references those polls. No separate `DELETE FROM votes` is needed.

**Step 3: Server responds**
```js
socket.emit('poll_history', []);  // send empty array → UI shows "No polls conducted yet"
```

