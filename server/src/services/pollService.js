import pool from '../config/db.js';

class PollService {

    // creates a new poll and closes any existing active one
    async createPoll(question, options, duration, startTime, correctAnswer = null, marks = 0) {
        await pool.query("UPDATE polls SET status = 'ended' WHERE status = 'active'");

        const result = await pool.query(
            `INSERT INTO polls (question, options, duration, start_time, correct_answer, marks, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'active') RETURNING *`,
            [question, JSON.stringify(options), duration, startTime, correctAnswer, marks]
        );
        return result.rows[0];
    }

    async getActivePoll() {
        const result = await pool.query(
            "SELECT * FROM polls WHERE status = 'active' ORDER BY created_at DESC LIMIT 1"
        );
        if (result.rows.length === 0) return null;

        const poll = result.rows[0];

        // grab vote counts for this poll
        const votesResult = await pool.query(
            "SELECT option_selected, COUNT(*) as count FROM votes WHERE poll_id = $1 GROUP BY option_selected",
            [poll.id]
        );

        // build a map like { "Option A": 5, "Option B": 2 }
        const voteCounts = {};
        if (Array.isArray(poll.options)) {
            poll.options.forEach(opt => { voteCounts[opt] = 0; });
        }
        votesResult.rows.forEach(row => {
            voteCounts[row.option_selected] = parseInt(row.count, 10);
        });

        return { ...poll, voteCounts };
    }

    async endActivePoll(pollId) {
        const result = await pool.query(
            "UPDATE polls SET status = 'ended' WHERE id = $1 RETURNING *",
            [pollId]
        );
        return result.rows[0];
    }

    async saveVote(pollId, studentId, studentName, optionSelected) {
        try {
            // check if they already voted
            const existing = await pool.query(
                "SELECT id FROM votes WHERE poll_id = $1 AND student_id = $2",
                [pollId, studentId]
            );

            if (existing.rows.length > 0) {
                throw new Error("You have already voted in this poll");
            }

            const result = await pool.query(
                "INSERT INTO votes (poll_id, student_id, student_name, option_selected) VALUES ($1, $2, $3, $4) RETURNING *",
                [pollId, studentId, studentName, optionSelected]
            );
            return result.rows[0];
        } catch (err) {
            // postgres unique constraint violation as a safety net
            if (err.code === '23505') {
                throw new Error("You have already voted in this poll");
            }
            throw err;
        }
    }

    // gets all polls with their vote breakdowns (for history)
    async getAllPolls() {
        const pollsResult = await pool.query("SELECT * FROM polls ORDER BY created_at DESC");
        const polls = pollsResult.rows;

        for (const poll of polls) {
            const votesResult = await pool.query(
                "SELECT option_selected, COUNT(*) as count FROM votes WHERE poll_id = $1 GROUP BY option_selected",
                [poll.id]
            );
            const voteCounts = {};
            if (Array.isArray(poll.options)) {
                poll.options.forEach(opt => { voteCounts[opt] = 0; });
            }
            votesResult.rows.forEach(row => {
                voteCounts[row.option_selected] = parseInt(row.count, 10);
            });
            poll.voteCounts = voteCounts;
        }

        return polls;
    }

    // tries to pick up where we left off if the server restarted mid-poll
    async recoverActivePoll() {
        const poll = await this.getActivePoll();
        if (!poll) return null;

        const startTime = parseInt(poll.start_time, 10);
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remainingTime = poll.duration - elapsed;

        if (remainingTime <= 0) {
            // poll already expired while server was down, just end it
            await this.endActivePoll(poll.id);
            return null;
        }

        return {
            active: true,
            poll: { ...poll },
            duration: poll.duration,
            startTime,
            remainingTime
        };
    }

    // calculates total score for each student across all polls
    async getScoreboard() {
        const result = await pool.query(`
            SELECT v.student_id, v.student_name, COALESCE(SUM(p.marks), 0) AS score
            FROM votes v
            JOIN polls p ON v.poll_id = p.id
            WHERE p.correct_answer IS NOT NULL
              AND v.option_selected = p.correct_answer
            GROUP BY v.student_id, v.student_name
            ORDER BY score DESC
        `);

        return result.rows.map(r => ({
            studentId: r.student_id,
            name: r.student_name,
            score: parseInt(r.score, 10)
        }));
    }

    // wipes everything - votes get cleaned up automatically (cascade)
    async deleteAllPolls() {
        await pool.query('DELETE FROM polls');
    }
}

export default new PollService();
