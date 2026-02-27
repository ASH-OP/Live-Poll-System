import pollService from '../services/pollService.js';

// owns all the in-memory state and business logic for the polling system
// the socket handler calls these methods — it doesn't contain any logic itself

let activePollState = null;
let pollTimerInterval = null;

const connectedStudents = new Map();  // socketId -> { name, studentId, socketId }
const leaderboard = new Map();        // studentId -> { name, score }
const chatMessages = [];              // capped at 100

class PollController {

    // rebuilds leaderboard + recovers any active poll from DB (used on server restart)
    async initialize() {
        try {
            const dbScores = await pollService.getScoreboard();
            for (const s of dbScores) {
                leaderboard.set(s.studentId, { name: s.name, score: s.score });
            }
            console.log(`Restored leaderboard for ${dbScores.length} students`);
        } catch (err) {
            console.error('Could not restore leaderboard:', err);
        }

        try {
            const recovered = await pollService.recoverActivePoll();
            if (recovered) {
                activePollState = recovered;
                console.log(`Resumed poll #${recovered.poll.id}, ${recovered.remainingTime}s left`);
                return { needsTimer: true };
            } else {
                console.log('No active poll found on startup');
            }
        } catch (err) {
            console.error('Poll recovery failed:', err);
        }

        return { needsTimer: false };
    }

    // returns snapshot of current state for a newly connected client
    getInitialState() {
        return {
            currentState: activePollState || { active: false },
            chatHistory: chatMessages,
            participants: Array.from(connectedStudents.values()),
            leaderboard: this.getSortedLeaderboard(),
        };
    }

    getSortedLeaderboard() {
        return Array.from(leaderboard.values()).sort((a, b) => b.score - a.score);
    }

    getParticipantsList() {
        return Array.from(connectedStudents.values());
    }

    // fetches poll history from DB
    async getPollHistory() {
        return await pollService.getAllPolls();
    }

    // wipes all poll history from DB
    async deletePollHistory() {
        await pollService.deleteAllPolls();
    }

    // registers a student in the connected map and leaderboard
    addStudent(socketId, studentId, studentName) {
        connectedStudents.set(socketId, {
            name: studentName,
            studentId,
            socketId,
        });

        if (!leaderboard.has(studentId)) {
            leaderboard.set(studentId, { name: studentName, score: 0 });
        }
    }

    // creates a new poll, saves to DB, returns the state object
    async startPoll({ question, options, duration, correctAnswer, marks }) {
        const startTime = Date.now();

        const poll = await pollService.createPoll(
            question, options, duration, startTime,
            correctAnswer || null, marks || 0
        );

        activePollState = {
            active: true,
            poll: { ...poll, voteCounts: {} },
            duration,
            startTime,
            remainingTime: duration,
            correctAnswer: correctAnswer || null,
            marks: marks || 0,
        };

        return activePollState;
    }

    // processes a vote — validates, saves to DB, updates in-memory counts and leaderboard
    async submitVote({ pollId, studentId, studentName, optionSelected }) {
        if (!activePollState || !activePollState.active || activePollState.poll.id !== pollId) {
            throw new Error('Poll is no longer active');
        }

        await pollService.saveVote(pollId, studentId, studentName, optionSelected);

        // bump vote count
        if (!activePollState.poll.voteCounts[optionSelected]) {
            activePollState.poll.voteCounts[optionSelected] = 0;
        }
        activePollState.poll.voteCounts[optionSelected]++;

        // award points for correct answer
        let leaderboardChanged = false;
        if (activePollState.correctAnswer && optionSelected === activePollState.correctAnswer && activePollState.marks > 0) {
            const entry = leaderboard.get(studentId) || { name: studentName, score: 0 };
            entry.score += activePollState.marks;
            entry.name = studentName;
            leaderboard.set(studentId, entry);
            leaderboardChanged = true;
        }

        return {
            voteCounts: activePollState.poll.voteCounts,
            leaderboardChanged,
        };
    }

    // creates a chat message, caps history at 100
    createMessage({ senderName, text, isTeacher }) {
        const msg = {
            id: Date.now(),
            senderName,
            text,
            isTeacher: !!isTeacher,
            timestamp: new Date().toISOString(),
        };
        chatMessages.push(msg);
        if (chatMessages.length > 100) chatMessages.shift();
        return msg;
    }

    // removes a student from connectedStudents
    removeStudent(socketId) {
        connectedStudents.delete(socketId);
    }

    // resets everyone's score to 0
    resetScores() {
        leaderboard.clear();
        for (const [, student] of connectedStudents) {
            leaderboard.set(student.studentId, { name: student.name, score: 0 });
        }
    }

    // timer tick logic — returns what happened
    async timerTick() {
        if (!activePollState) return { expired: false };

        const elapsed = Math.floor((Date.now() - activePollState.startTime) / 1000);
        activePollState.remainingTime = activePollState.duration - elapsed;

        if (activePollState.remainingTime <= 0) {
            activePollState.remainingTime = 0;
            await pollService.endActivePoll(activePollState.poll.id);
            activePollState.active = false;
            activePollState.poll.status = 'ended';
            return { expired: true, state: activePollState };
        }

        return {
            expired: false,
            remainingTime: activePollState.remainingTime,
        };
    }

    // starts the poll timer — needs io reference for broadcasting
    startTimer(io) {
        if (pollTimerInterval) clearInterval(pollTimerInterval);

        pollTimerInterval = setInterval(async () => {
            const result = await this.timerTick();

            if (result.expired) {
                clearInterval(pollTimerInterval);
                io.emit('poll_ended', result.state);
                io.emit('leaderboard_update', this.getSortedLeaderboard());
            } else {
                io.emit('timer_sync', {
                    remainingTime: result.remainingTime,
                    active: true,
                });
            }
        }, 1000);
    }
}

export default new PollController();
