import pollService from '../services/pollService.js';

// REST API controller for polls — handles HTTP requests
// the socket controller handles real-time events separately

class PollRestController {
    async createPoll(req, res) {
        try {
            const { question, options, duration } = req.body;

            if (!question || !options || !Array.isArray(options) || options.length < 2 || !duration) {
                return res.status(400).json({ error: 'Invalid poll data. Provide question, options (array >= 2), and duration.' });
            }

            const poll = await pollService.createPoll(question, options, duration, Date.now());
            res.status(201).json(poll);
        } catch (error) {
            console.error('Error creating poll:', error);
            res.status(500).json({ error: 'Failed to create poll' });
        }
    }

    async getActivePoll(req, res) {
        try {
            const poll = await pollService.getActivePoll();
            if (!poll) return res.status(404).json({ error: 'No active poll found' });
            res.status(200).json(poll);
        } catch (error) {
            console.error('Error getting active poll:', error);
            res.status(500).json({ error: 'Failed to retrieve active poll' });
        }
    }

    async getAllPolls(req, res) {
        try {
            const polls = await pollService.getAllPolls();
            res.status(200).json(polls);
        } catch (error) {
            console.error('Error getting all polls:', error);
            res.status(500).json({ error: 'Failed to retrieve polls' });
        }
    }
}

export default new PollRestController();
