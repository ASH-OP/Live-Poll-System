import pollController from '../controllers/pollController.js';

// thin socket handler — wires events to controller methods, no business logic here

async function initializeSocket(io) {
    // recover state from DB on startup
    const { needsTimer } = await pollController.initialize();
    if (needsTimer) pollController.startTimer(io);

    io.on('connection', (socket) => {
        console.log(`Connected: ${socket.id}`);

        // client asks for state after setting up its listeners (avoids race condition)
        socket.on('request_state', () => {
            const initial = pollController.getInitialState();
            socket.emit('current_state', initial.currentState);
            socket.emit('chat_history', initial.chatHistory);
            socket.emit('participants_update', initial.participants);
            socket.emit('leaderboard_update', initial.leaderboard);
        });

        // poll history
        socket.on('get_poll_history', async () => {
            try {
                const polls = await pollController.getPollHistory();
                socket.emit('poll_history', polls);
            } catch (err) {
                console.error('Failed to fetch history:', err);
                socket.emit('poll_history', []);
            }
        });

        // delete all poll history
        socket.on('delete_poll_history', async () => {
            try {
                await pollController.deletePollHistory();
                socket.emit('poll_history', []);
                console.log('Teacher deleted poll history');
            } catch (err) {
                console.error('Failed to delete history:', err);
            }
        });

        // student joins with their name
        socket.on('join_session', ({ studentId, studentName }) => {
            pollController.addStudent(socket.id, studentId, studentName);
            io.emit('participants_update', pollController.getParticipantsList());
            io.emit('leaderboard_update', pollController.getSortedLeaderboard());
        });

        // teacher starts a new poll
        socket.on('start_poll', async (pollData) => {
            try {
                const state = await pollController.startPoll(pollData);
                io.emit('start_poll', state);
                pollController.startTimer(io);
            } catch (error) {
                console.error('Error starting poll:', error);
                socket.emit('error', { message: 'Failed to start poll' });
            }
        });

        // student submits their vote
        socket.on('submit_vote', async (voteData) => {
            try {
                const result = await pollController.submitVote(voteData);
                io.emit('poll_update', { voteCounts: result.voteCounts });
                if (result.leaderboardChanged) {
                    io.emit('leaderboard_update', pollController.getSortedLeaderboard());
                }
            } catch (error) {
                console.error('Vote error:', error);
                socket.emit('error', { message: error.message || 'Failed to submit vote' });
            }
        });

        // chat message
        socket.on('send_message', (data) => {
            const msg = pollController.createMessage(data);
            io.emit('new_message', msg);
        });

        // teacher kicks a student
        socket.on('kick_student', ({ socketId }) => {
            const target = io.sockets.sockets.get(socketId);
            if (target) {
                target.emit('kicked', {
                    message: 'You have been removed from this session by the teacher.'
                });
                pollController.removeStudent(socketId);
                io.emit('participants_update', pollController.getParticipantsList());
                target.disconnect(true);
            }
        });

        // teacher warns a student
        socket.on('warn_student', ({ socketId, message }) => {
            const target = io.sockets.sockets.get(socketId);
            if (target) {
                target.emit('warning', {
                    message: message || 'You have received a warning from the teacher.'
                });
            }
        });

        // reset leaderboard scores
        socket.on('reset_scores', () => {
            pollController.resetScores();
            io.emit('leaderboard_update', pollController.getSortedLeaderboard());
            console.log('Leaderboard was reset');
        });

        socket.on('disconnect', () => {
            console.log(`Disconnected: ${socket.id}`);
            pollController.removeStudent(socket.id);
            io.emit('participants_update', pollController.getParticipantsList());
        });
    });
}

export default initializeSocket;
