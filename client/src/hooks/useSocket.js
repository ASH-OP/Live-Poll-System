import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function useSocket() {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const sock = io(SOCKET_URL, {
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        sock.on('connect', () => {
            setIsConnected(true);
            setError(null);
        });

        sock.on('disconnect', () => setIsConnected(false));

        sock.on('connect_error', (err) => {
            setIsConnected(false);
            setError('Failed to connect to server');
            console.error('Connection error:', err);
        });

        sock.on('error', (err) => {
            setError(err.message || 'Something went wrong');
            console.error('Socket error:', err);
        });

        setSocket(sock);

        return () => sock.disconnect();
    }, []);

    const clearError = useCallback(() => setError(null), []);

    return { socket, isConnected, error, clearError };
}
