import { useState, useEffect } from 'react';

// calculates how many seconds are left based on when the poll started
export function usePollTimer(duration, serverStartTime) {
    const [remaining, setRemaining] = useState(duration);

    useEffect(() => {
        if (!duration || !serverStartTime) return;

        const tick = setInterval(() => {
            const elapsed = Math.floor((Date.now() - serverStartTime) / 1000);
            const timeLeft = Math.max(0, duration - elapsed);
            setRemaining(timeLeft);

            if (timeLeft <= 0) clearInterval(tick);
        }, 1000);

        return () => clearInterval(tick);
    }, [duration, serverStartTime]);

    return remaining;
}
