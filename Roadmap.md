# Roadmap: Resilient Live Polling System (PERN Stack + Socket.io)

This roadmap outlines the development steps to build the SDE Intern Assignment for Intervue.io. It focuses on the "Resilience" factor, strict architectural standards, and the specific requirement to use PostgreSQL (Supabase).

## 📅 Phase 1: Project Initialization & Database Design
**Goal:** Set up the repo, configure the database, and establish the "Source of Truth."

- [ ] **Repo Setup**
    - [ ] Initialize a monorepo or separate folders: `client/` (React + Vite) and `server/` (Node + Express).
    - [ ] Setup TypeScript for both (Assignment requirement).
    - [ ] Configure ESLint/Prettier to ensure code quality.

- [ ] **Supabase (PostgreSQL) Setup**
    - [ ] Create a new Supabase project.
    - [ ] **Schema Design:**
        - `polls`: `id`, `question`, `options` (JSONB), `created_at`, `duration`, `status` (active/ended).
        - `votes`: `id`, `poll_id`, `student_name`, `option_selected`, `created_at`.
        - *(Optional)* `chats`: For the bonus feature.
    - [ ] Set up connection in `server/.env`.

## 🏗️ Phase 2: Backend Architecture (The Foundation)
**Goal:** Implement the "Controller-Service" pattern to separate business logic from routes.

- [ ] **Express Server Setup**
    - [ ] Install `express`, `cors`, `dotenv`, `pg` (or `sequelize`/`prisma`).
    - [ ] **Folder Structure:**
        ```
        /src
          /controllers  (Request/Response handling)
          /services     (Business logic & DB calls)
          /routes       (API endpoints)
          /sockets      (Socket.io handlers)
          /utils        (Helpers)
        ```
- [ ] **Poll Management API**
    - [ ] `PollService.ts`: Methods to `createPoll`, `getPoll`, `saveVote`.
    - [ ] `PollController.ts`: Handle HTTP requests for poll creation/fetching.
    - [ ] **Crucial:** Ensure database validations (e.g., prevent duplicate votes from the same name/session).

## 🔌 Phase 3: Real-time Communication Core
**Goal:** Setup Socket.io and ensure the server controls the state.

- [ ] **Socket Setup**
    - [ ] Install `socket.io` (server) and `socket.io-client` (client).
    - [ ] Initialize `io` instance in `server/index.ts`.
- [ ] **Socket Architecture**
    - [ ] Create `PollSocketHandler.ts` to separate socket events from the main file.
    - [ ] **Events to Implement:**
        - `join_session`: Student joins.
        - `start_poll`: Teacher starts a poll.
        - `submit_vote`: Student votes.
        - `poll_update`: Broadcast live results.
        - `timer_sync`: Broadcast server-side time remaining.

## 🎨 Phase 4: Frontend Development (Teacher & Student)
**Goal:** Build the UI based on the Figma reference and implement "Custom Hooks."

- [ ] **Teacher Dashboard (Admin)**
    - [ ] Form to create a question (Question text, Options, Timer duration).
    - [ ] Live view of results (Bar chart or progress bars).
    - [ ] "Create New Poll" button (only enabled if previous poll ends).
- [ ] **Student Interface (User)**
    - [ ] Onboarding Screen: Enter Name (Save to `localStorage` or `sessionStorage` for persistence).
    - [ ] Waiting Screen: "Waiting for teacher..."
    - [ ] Active Poll Screen: Display question, options, and **Synced Timer**.
- [ ] **Custom Hooks (Strict Requirement)**
    - [ ] `useSocket()`: Manage socket connection and cleanup.
    - [ ] `usePollTimer()`: Handle countdown logic, syncing with server timestamps.

## 🛡️ Phase 5: The "Resilience" Factor (CRITICAL)
**Goal:** Handle refreshes and late joiners without losing state.

- [ ] **State Recovery (The "Refresh" Test)**
    - [ ] **Backend:** When a socket reconnects, emit the `current_state` event immediately (Is a poll active? What are the current votes? How much time is left?).
    - [ ] **Frontend:** On mount, check if a poll is active. If yes, restore the UI to that state.
- [ ] **Timer Synchronization**
    - [ ] **Server:** Store `poll_start_time` in the DB or memory.
    - [ ] **Logic:** `remaining_time = duration - (current_time - start_time)`.
    - [ ] **Client:** **Never** rely on a local `setInterval` starting from 60s. Always calculate based on the server's `start_time` to handle late joiners correctly.
- [ ] **Race Condition Handling**
    - [ ] Implement debouncing on the vote button.
    - [ ] Backend check: `SELECT * FROM votes WHERE poll_id = X AND student_name = Y`. If exists, reject new vote.

## ✨ Phase 6: Polish & Bonus Features
**Goal:** UI/UX refinements and "Brownie Points."

- [ ] **Visuals**
    - [ ] Match Figma design exactly (colors, spacing).
    - [ ] Add toast notifications for "Vote Submitted" or "Connection Lost."
- [ ] **Bonus: Chat Popup**
    - [ ] Add a simple socket event `send_message` and `receive_message`.
    - [ ] UI overlay for chat.
- [ ] **Past Poll Results**
    - [ ] Create a "History" tab for Teachers fetching from Postgres.

## 🚀 Phase 7: Deployment
**Goal:** Live hosting for submission.

- [ ] **Backend:** Deploy to Render (Web Service).
- [ ] **Frontend:** Deploy to Vercel or Netlify.
- [ ] **Final Check:**
    - [ ] Open Teacher tab.
    - [ ] Open Student tab.
    - [ ] Start Poll -> Refresh Student tab -> Verify Timer is correct (not reset).
    - [ ] Submit Vote -> Refresh Teacher tab -> Verify Votes persist.