import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { usePollTimer } from '../hooks/usePollTimer';
import { useToast } from '../components/Toast';
import { Sparkles, MessageCircle, X, Send, AlertTriangle, Trophy } from 'lucide-react';

// each tab gets its own student id so multiple tabs = multiple students
function getOrCreateStudentId() {
    let id = sessionStorage.getItem('pollStudentId');
    if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem('pollStudentId', id);
    }
    return id;
}

const COLORS = ['#6c5ce7', '#a29bfe', '#00cec9', '#fdcb6e', '#e17055', '#0984e3'];

const styles = {
    page: { minHeight: '100vh', background: '#fff', fontFamily: "'Inter',sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' },
    topBar: { position: 'fixed', top: 0, left: 0, width: '100%', height: '4px', background: 'linear-gradient(to right,#6c5ce7,#a29bfe,#6c5ce7)', zIndex: 100 },
    card: { background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '460px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' },
    badge: { display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#6c5ce7', color: '#fff', fontSize: '12px', fontWeight: 600, padding: '5px 14px', borderRadius: '999px', marginBottom: '14px' },
    input: { width: '100%', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '12px 16px', fontSize: '15px', color: '#111', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
    btn: { width: '100%', background: '#6c5ce7', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' },

    mainPage: { minHeight: '100vh', background: '#fafafa', fontFamily: "'Inter',sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' },
    mainLayout: { width: '100%', maxWidth: '960px', display: 'flex', gap: '16px', paddingTop: '12px', paddingBottom: '90px' },
    mainCol: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '14px' },
    sideCol: { width: '260px', flexShrink: 0 },
    headerCard: { background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '14px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    avatar: { width: '36px', height: '36px', background: '#f5f3ff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c5ce7', fontWeight: 700, fontSize: '15px' },
    liveDot: { display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '999px', padding: '4px 12px', fontSize: '12px', fontWeight: 600 },
    disconnDot: { display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '999px', padding: '4px 12px', fontSize: '12px', fontWeight: 600 },

    waitCard: { background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '20px', padding: '56px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '14px' },
    pollCard: { background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '20px', overflow: 'hidden' },
    pollHeader: { background: '#2d2d3a', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' },
    liveTag: { display: 'inline-block', background: 'rgba(108,92,231,0.3)', color: '#a29bfe', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' },
    timerBadge: { display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '10px', padding: '7px 12px', fontFamily: 'monospace', fontWeight: 700, fontSize: '16px', whiteSpace: 'nowrap' },
    optionsList: { padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' },

    optionBtn: (selected, voted) => ({
        width: '100%', padding: '14px 18px', borderRadius: '12px',
        border: `2px solid ${voted && selected ? '#6c5ce7' : '#e5e7eb'}`,
        background: voted && selected ? '#f5f3ff' : '#fff',
        cursor: voted ? 'not-allowed' : 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '15px', fontWeight: 600,
        color: voted && !selected ? '#9ca3af' : '#111',
        opacity: voted && !selected ? 0.6 : 1,
        transition: 'all 0.2s', textAlign: 'left', fontFamily: 'inherit',
    }),
    successBanner: { margin: '0 20px 20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px', color: '#16a34a', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' },
    errorBanner: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px 16px', color: '#dc2626', fontSize: '14px', fontWeight: 500 },
    kickedPage: { minHeight: '100vh', background: '#fff', fontFamily: "'Inter',sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' },

    chatFab: { position: 'fixed', bottom: '20px', right: '20px', width: '50px', height: '50px', borderRadius: '50%', background: '#6c5ce7', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 16px rgba(108,92,231,0.4)', zIndex: 99 },
    panel: { position: 'fixed', bottom: '80px', right: '16px', width: '300px', height: '380px', background: '#fff', borderRadius: '18px', border: '1.5px solid #e5e7eb', boxShadow: '0 12px 40px rgba(0,0,0,0.14)', zIndex: 99, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    msgList: { flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' },
    msgBubble: (fromTeacher) => ({ background: fromTeacher ? '#6c5ce7' : '#f3f4f6', color: fromTeacher ? '#fff' : '#111', padding: '8px 12px', borderRadius: fromTeacher ? '12px 12px 2px 12px' : '12px 12px 12px 2px', fontSize: '13px', alignSelf: fromTeacher ? 'flex-end' : 'flex-start', maxWidth: '85%' }),
    msgSender: { fontSize: '11px', color: '#9ca3af', marginBottom: '2px' },
    chatInputWrap: { display: 'flex', gap: '8px', padding: '10px 12px', borderTop: '1px solid #f0f0f0' },
    chatInputBox: { flex: 1, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' },
    sendBtn: { background: '#6c5ce7', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', color: '#fff' },
};

// sidebar that shows the ranked scores
function LeaderboardPanel({ leaderboard, studentId }) {
    const medals = ['🥇', '🥈', '🥉'];
    return (
        <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '20px', overflow: 'hidden', position: 'sticky', top: '20px' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trophy size={18} style={{ color: '#f59e0b' }} />
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#111' }}>Leaderboard</span>
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>{leaderboard.length} players</span>
            </div>
            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                {leaderboard.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No scores yet</div>
                ) : leaderboard.map((entry, i) => {
                    const isMe = entry.studentId === studentId;
                    return (
                        <div key={entry.studentId} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 18px',
                            background: isMe ? '#f5f3ff' : (i % 2 === 0 ? '#fff' : '#fafafa'),
                            borderLeft: isMe ? '3px solid #6c5ce7' : '3px solid transparent',
                            transition: 'background 0.2s',
                        }}>
                            <div style={{ width: '24px', textAlign: 'center', fontSize: i < 3 ? '16px' : '13px', fontWeight: 700, color: '#9ca3af' }}>
                                {i < 3 ? medals[i] : i + 1}
                            </div>
                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: isMe ? '#6c5ce7' : '#f3f4f6', color: isMe ? '#fff' : '#6c5ce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>
                                {entry.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: isMe ? 700 : 600, color: isMe ? '#6c5ce7' : '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {entry.name} {isMe && <span style={{ fontSize: '11px', fontWeight: 500, color: '#a29bfe' }}>(You)</span>}
                                </div>
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: i === 0 ? '#f59e0b' : (isMe ? '#6c5ce7' : '#374151'), minWidth: '40px', textAlign: 'right' }}>
                                {entry.score}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}


function StudentView() {
    const { socket, isConnected } = useSocket();
    const { addToast, ToastContainer } = useToast();
    const [studentName, setStudentName] = useState('');
    const [studentId] = useState(() => getOrCreateStudentId());
    const [isRegistered, setIsRegistered] = useState(false);
    const [pollState, setPollState] = useState(null);
    const [selectedOption, setSelectedOption] = useState(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [voteError, setVoteError] = useState('');
    const [isKicked, setIsKicked] = useState(false);
    const [kickMessage, setKickMessage] = useState('');
    const [warning, setWarning] = useState('');
    const [panelOpen, setPanelOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [leaderboard, setLeaderboard] = useState([]);
    const msgEndRef = useRef(null);

    const remainingTime = usePollTimer(pollState?.duration, pollState?.startTime);

    // socket event handlers
    useEffect(() => {
        if (!socket) return;

        socket.on('current_state', (state) => {
            setPollState(state);
            if (state.active) {
                setHasVoted(false);
                setSelectedOption(null);
                setVoteError('');

                // if the student refreshed mid-poll, restore their name and skip registration
                const savedName = sessionStorage.getItem('pollStudentName');
                if (savedName && !isRegistered) {
                    setStudentName(savedName);
                    setIsRegistered(true);
                }
            }
        });
        socket.on('start_poll', (state) => {
            setPollState(state);
            setHasVoted(false);
            setSelectedOption(null);
            setVoteError('');
        });
        socket.on('poll_ended', (state) => setPollState(state));
        socket.on('error', (err) => {
            if (err.message?.includes('already voted')) setHasVoted(true);
            setVoteError(err.message);
            addToast({ type: 'error', title: 'Error', message: err.message || 'Something went wrong' });
        });
        socket.on('chat_history', (hist) => setMessages(hist));
        socket.on('new_message', (msg) => setMessages(prev => [...prev, msg]));
        socket.on('kicked', ({ message }) => { setIsKicked(true); setKickMessage(message); });
        socket.on('warning', ({ message }) => {
            setWarning(message);
            setTimeout(() => setWarning(''), 6000);
        });
        socket.on('leaderboard_update', (board) => setLeaderboard(board));

        // all listeners set up, now ask the server for current state
        socket.emit('request_state');

        return () => {
            ['current_state', 'start_poll', 'poll_ended', 'error', 'chat_history',
                'new_message', 'kicked', 'warning', 'leaderboard_update']
                .forEach(evt => socket.off(evt));
        };
    }, [socket]);

    // toast on connection changes
    const prevConnected = useRef(isConnected);
    useEffect(() => {
        if (prevConnected.current && !isConnected) {
            addToast({ type: 'error', title: 'Disconnected', message: 'Lost connection to the server. Trying to reconnect...' });
        }
        if (!prevConnected.current && isConnected) {
            addToast({ type: 'success', message: 'Connected to server' });
        }
        prevConnected.current = isConnected;
    }, [isConnected]);

    // tell the server we joined
    useEffect(() => {
        if (socket && isRegistered && studentName) {
            socket.emit('join_session', { studentId, studentName });
        }
    }, [socket, isRegistered, studentName, studentId]);

    // auto scroll chat to bottom
    useEffect(() => {
        if (panelOpen) msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, panelOpen]);

    function handleRegister(e) {
        e.preventDefault();
        if (studentName.trim()) {
            sessionStorage.setItem('pollStudentName', studentName.trim());
            setIsRegistered(true);
        }
    }

    function handleSelect(option) {
        if (hasVoted || !pollState?.active || !isConnected) return;
        setSelectedOption(option);
    }

    function handleSubmitVote() {
        if (!selectedOption || hasVoted) return;
        if (!pollState?.active) {
            addToast({ type: 'warning', message: 'This poll has ended' });
            return;
        }
        if (!isConnected) {
            addToast({ type: 'error', message: 'Cannot submit — not connected to server' });
            return;
        }
        socket.emit('submit_vote', {
            pollId: pollState.poll.id,
            studentId,
            studentName,
            optionSelected: selectedOption
        });
        setHasVoted(true);
        addToast({ type: 'success', message: 'Vote submitted!' });
    }

    function sendMessage() {
        if (!chatInput.trim() || !socket) return;
        socket.emit('send_message', { senderName: studentName, text: chatInput.trim(), isTeacher: false });
        setChatInput('');
    }

    // kicked screen
    if (isKicked) {
        return (
            <div style={styles.kickedPage}>
                <ToastContainer />
                <div style={styles.topBar} />
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111', marginBottom: '10px' }}>Removed from Session</h2>
                <p style={{ color: '#6b7280', maxWidth: '320px', lineHeight: 1.6 }}>{kickMessage}</p>
            </div>
        );
    }

    // name entry screen
    if (!isRegistered) {
        return (
            <div style={styles.page}>
                <ToastContainer />
                <div style={styles.topBar} />
                <div style={styles.card}>
                    <div style={styles.badge}><Sparkles size={12} /> Intervue Poll</div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111', marginBottom: '6px' }}>Join Live Session</h2>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '28px' }}>Enter your name to participate</p>
                    <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '8px' }}>Your Name</label>
                            <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="John Doe" style={styles.input} required />
                        </div>
                        <button type="submit" style={styles.btn}>Join Session</button>
                    </form>
                </div>
            </div>
        );
    }

    // main poll view with leaderboard sidebar
    return (
        <div style={styles.mainPage}>
            <ToastContainer />
            <div style={styles.topBar} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

            <div style={styles.mainLayout}>
                {/* poll area */}
                <div style={styles.mainCol}>
                    {warning && (
                        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px 16px', color: '#b45309', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertTriangle size={18} /> {warning}
                        </div>
                    )}

                    <div style={styles.headerCard}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={styles.avatar}>{studentName.charAt(0).toUpperCase()}</div>
                            <div>
                                <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500 }}>Voting as</div>
                                <div style={{ fontSize: '15px', fontWeight: 700, color: '#111' }}>{studentName}</div>
                            </div>
                        </div>
                        {isConnected
                            ? <div style={styles.liveDot}><span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />Live</div>
                            : <div style={styles.disconnDot}>Disconnected</div>
                        }
                    </div>

                    {voteError && <div style={styles.errorBanner}>⚠ {voteError}</div>}

                    {!pollState || !pollState.active ? (
                        // waiting for teacher
                        <div style={styles.waitCard}>
                            <div style={{ width: '52px', height: '52px', background: '#f5f3ff', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                                    <circle cx="12" cy="12" r="10" stroke="#ddd6fe" strokeWidth="3" />
                                    <path d="M12 2a10 10 0 0 1 10 10" stroke="#6c5ce7" strokeWidth="3" strokeLinecap="round" />
                                </svg>
                            </div>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111', margin: 0 }}>Waiting for Teacher</h3>
                            <p style={{ color: '#6b7280', fontSize: '14px', maxWidth: '300px', lineHeight: 1.6, margin: 0 }}>
                                {pollState?.poll?.status === 'ended' ? 'Previous poll ended. Waiting for the next one.' : 'A question will appear here when the teacher starts.'}
                            </p>
                        </div>
                    ) : (
                        // active poll
                        <div style={styles.pollCard}>
                            <div style={styles.pollHeader}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <div style={styles.liveTag}>Live Question</div>
                                        {pollState.marks > 0 && (
                                            <div style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: 700 }}>
                                                {pollState.marks} pts
                                            </div>
                                        )}
                                    </div>
                                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.3 }}>{pollState.poll.question}</h3>
                                </div>
                                <div style={styles.timerBadge}>⏱ {remainingTime}s</div>
                            </div>

                            <div style={styles.optionsList}>
                                {pollState.poll.options.map((option, i) => {
                                    const isSelected = selectedOption === option;
                                    return (
                                        <button key={i} onClick={() => handleSelect(option)} disabled={hasVoted || !isConnected} style={styles.optionBtn(isSelected, hasVoted)}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: COLORS[i % COLORS.length], color: '#fff', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                                                <span>{option}</span>
                                            </div>
                                            {!hasVoted && (
                                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${isSelected ? '#6c5ce7' : '#d1d5db'}`, background: isSelected ? '#6c5ce7' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                                                    {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />}
                                                </div>
                                            )}
                                            {hasVoted && isSelected && (
                                                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="11" fill="#6c5ce7" /><path d="M6 11l3.5 3.5L16 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {!hasVoted && (
                                <div style={{ padding: '0 20px 20px' }}>
                                    <button
                                        onClick={handleSubmitVote}
                                        disabled={!selectedOption || !isConnected}
                                        style={{ width: '100%', background: selectedOption ? '#6c5ce7' : '#d1d5db', color: '#fff', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: 700, cursor: selectedOption ? 'pointer' : 'not-allowed', boxShadow: selectedOption ? '0 4px 16px rgba(108,92,231,0.25)' : 'none', transition: 'all 0.2s' }}
                                    >
                                        Submit Answer
                                    </button>
                                </div>
                            )}

                            {hasVoted && (
                                <div style={styles.successBanner}>
                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="9" fill="#22c55e" /><path d="M5 9l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    Vote recorded!
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* leaderboard sidebar */}
                <div style={styles.sideCol}>
                    <LeaderboardPanel leaderboard={leaderboard} studentId={studentId} />
                </div>
            </div>

            {/* chat toggle */}
            <button style={styles.chatFab} onClick={() => setPanelOpen(p => !p)}>
                {panelOpen ? <X size={20} /> : <MessageCircle size={20} />}
            </button>

            {panelOpen && (
                <div style={styles.panel}>
                    <div style={{ padding: '14px 16px', fontWeight: 700, fontSize: '14px', color: '#111', borderBottom: '1px solid #f0f0f0' }}>Chat</div>
                    <div style={styles.msgList}>
                        {messages.length === 0 && <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '13px', marginTop: '20px' }}>No messages yet</div>}
                        {messages.map(msg => (
                            <div key={msg.id} style={{ alignSelf: !msg.isTeacher && msg.senderName === studentName ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                                <div style={styles.msgSender}>{msg.isTeacher ? '👨‍🏫 Teacher' : msg.senderName}</div>
                                <div style={styles.msgBubble(msg.isTeacher)}>{msg.text}</div>
                            </div>
                        ))}
                        <div ref={msgEndRef} />
                    </div>
                    <div style={styles.chatInputWrap}>
                        <input style={styles.chatInputBox} value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." />
                        <button style={styles.sendBtn} onClick={sendMessage}><Send size={14} /></button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default StudentView;
