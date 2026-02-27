import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pollRoutes from './routes/pollRoutes.js';
import initializeSocket from './sockets/pollSocketHandler.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// allow the deployed frontend to connect (falls back to * for local dev)
const allowedOrigin = process.env.CLIENT_URL || '*';

const io = new Server(httpServer, {
    cors: { origin: allowedOrigin, methods: ['GET', 'POST'] }
});

app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

// REST routes for polls
app.use('/api/polls', pollRoutes);

app.get('/', (req, res) => {
    res.send('Live Poll System API running');
});

const PORT = process.env.PORT || 5000;

// set up socket handlers then start listening
(async () => {
    await initializeSocket(io);
    httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
})();
