import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { usePollTimer } from '../hooks/usePollTimer';
import { useToast } from '../components/Toast';
import { Sparkles, ChevronDown, MessageCircle, X, Send, AlertTriangle, XCircle, History, ChevronRight, ChevronLeft, Trophy } from 'lucide-react';

const TIMER_OPTIONS = [30, 60, 90, 120];
const COLORS = ['#6c5ce7', '#a29bfe', '#00cec9', '#fdcb6e', '#e17055', '#0984e3'];

// all the inline styles live here so the JSX stays clean
const styles = {
    page: { minHeight: '100vh', background: '#fff', fontFamily: "'Inter',sans-serif", display: 'flex', flexDirection: 'column' },
    topBar: { position: 'fixed', top: 0, left: 0, width: '100%', height: '4px', background: 'linear-gradient(to right,#6c5ce7,#a29bfe,#6c5ce7)', zIndex: 100 },
    body: { flex: 1, padding: '36px 32px 120px', maxWidth: '720px', margin: '0 auto', width: '100%' },
    badge: { display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#6c5ce7', color: '#fff', fontSize: '12px', fontWeight: 600, padding: '5px 14px', borderRadius: '999px', marginBottom: '14px' },
    h1: { fontSize: '1.9rem', fontWeight: 800, color: '#111', marginBottom: '6px' },
    sub: { color: '#6b7280', fontSize: '14px', marginBottom: '32px', lineHeight: 1.6 },
    label: { fontSize: '14px', fontWeight: 700, color: '#111', display: 'block', marginBottom: '8px' },
    textarea: { width: '100%', background: '#f3f4f6', border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '16px', fontSize: '15px', color: '#111', resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box' },
    charCount: { textAlign: 'right', fontSize: '12px', color: '#9ca3af', marginTop: '6px' },
    timerSelect: { display: 'flex', alignItems: 'center', gap: '6px', border: '1.5px solid #e5e7eb', borderRadius: '8px', padding: '7px 14px', fontSize: '14px', fontWeight: 500, color: '#111', cursor: 'pointer', background: '#fff', userSelect: 'none', position: 'relative' },
    optionsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 32px', marginTop: '24px' },
    optionNum: (i) => ({ width: '26px', height: '26px', borderRadius: '50%', background: COLORS[i % COLORS.length], color: '#fff', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
    optionInput: { flex: 1, background: '#f3f4f6', border: '1.5px solid #e5e7eb', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: '#111', outline: 'none', fontFamily: 'inherit' },
    addBtn: { border: '1.5px solid #6c5ce7', color: '#6c5ce7', background: '#fff', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' },
    bottomBar: { position: 'fixed', bottom: 0, left: 0, width: '100%', background: '#fff', borderTop: '1px solid #f0f0f0', padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50 },
    askBtn: (off) => ({ background: off ? '#d1d5db' : '#6c5ce7', color: '#fff', border: 'none', borderRadius: '999px', padding: '13px 28px', fontSize: '15px', fontWeight: 700, cursor: off ? 'not-allowed' : 'pointer', boxShadow: off ? 'none' : '0 4px 16px rgba(108,92,231,0.3)', transition: 'all 0.2s' }),
    newQuBtn: { background: '#6c5ce7', color: '#fff', border: 'none', borderRadius: '999px', padding: '13px 28px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
    connBadge: (ok) => ({ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: ok ? '#f0fdf4' : '#fef2f2', color: ok ? '#16a34a' : '#dc2626', border: `1px solid ${ok ? '#bbf7d0' : '#fecaca'}` }),
    dot: (ok) => ({ width: '7px', height: '7px', borderRadius: '50%', background: ok ? '#22c55e' : '#ef4444' }),
    questionCard: { background: '#2d2d3a', borderRadius: '14px', padding: '18px 22px', color: '#fff', marginBottom: '16px', fontSize: '16px', fontWeight: 700 },
    barWrap: { background: '#f3f4f6', borderRadius: '10px', height: '48px', width: '100%', overflow: 'hidden', position: 'relative', marginBottom: '10px' },
    barFill: (pct, color) => ({ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: color, borderRadius: '10px', transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)' }),
    barLabel: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 1 },
    barPct: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: 700, zIndex: 1 },
    timerBadge: { display: 'flex', alignItems: 'center', gap: '6px', background: '#f5f3ff', color: '#6c5ce7', border: '1px solid #ddd6fe', borderRadius: '10px', padding: '7px 14px', fontFamily: 'monospace', fontWeight: 700, fontSize: '16px' },
    totalTag: { display: 'inline-block', background: '#f5f3ff', color: '#6c5ce7', borderRadius: '8px', padding: '4px 12px', fontSize: '13px', fontWeight: 600, marginBottom: '18px' },
    endedTag: { display: 'inline-block', background: '#fef3c7', color: '#b45309', borderRadius: '8px', padding: '4px 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '8px' },
    histBtn: { display: 'flex', alignItems: 'center', gap: '6px', background: '#f5f3ff', color: '#6c5ce7', border: '1.5px solid #ddd6fe', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
    chatFab: { position: 'fixed', bottom: '80px', right: '24px', width: '52px', height: '52px', borderRadius: '50%', background: '#6c5ce7', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 16px rgba(108,92,231,0.4)', zIndex: 99 },
    panel: { position: 'fixed', bottom: '70px', right: '24px', width: '340px', height: '440px', background: '#fff', borderRadius: '18px', border: '1.5px solid #e5e7eb', boxShadow: '0 12px 40px rgba(0,0,0,0.14)', zIndex: 99, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    panelHeader: { display: 'flex', borderBottom: '1px solid #f0f0f0', background: '#fff' },
    tab: (active) => ({ flex: 1, padding: '14px', fontSize: '14px', fontWeight: active ? 700 : 500, color: active ? '#6c5ce7' : '#6b7280', background: 'none', border: 'none', borderBottom: active ? '2px solid #6c5ce7' : '2px solid transparent', cursor: 'pointer' }),
    msgList: { flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' },
    msgBubble: (mine) => ({ background: mine ? '#6c5ce7' : '#f3f4f6', color: mine ? '#fff' : '#111', padding: '8px 12px', borderRadius: mine ? '12px 12px 2px 12px' : '12px 12px 12px 2px', fontSize: '13px', alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%' }),
    msgSender: { fontSize: '11px', color: '#9ca3af', marginBottom: '2px' },
    chatInputWrap: { display: 'flex', gap: '8px', padding: '10px 14px', borderTop: '1px solid #f0f0f0' },
    chatInputBox: { flex: 1, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' },
    sendBtn: { background: '#6c5ce7', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', color: '#fff' },
    participantRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '10px', background: '#f9fafb', marginBottom: '6px' },
    warnBtn: { background: '#fef3c7', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: '#b45309' },
    kickBtn: { background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: '#dc2626' },
    lbBtn: { display: 'flex', alignItems: 'center', gap: '6px', background: '#fffbeb', color: '#b45309', border: '1.5px solid #fde68a', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
};


// history modal - shows all past polls in expandable cards
function HistoryModal({ open, onClose, polls, expandedId, onToggle, onDelete }) {
    if (!open) return null;
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
            <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '620px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', background: '#f5f3ff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><History size={18} style={{ color: '#6c5ce7' }} /></div>
                        <div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#111' }}>Poll History</div>
                            <div style={{ fontSize: '12px', color: '#9ca3af' }}>{polls.length} poll{polls.length !== 1 ? 's' : ''} conducted</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {polls.length > 0 && (
                            <button onClick={() => { if (window.confirm('Delete all poll history? This cannot be undone.')) onDelete(); }} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Delete All</button>
                        )}
                        <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
                    </div>
                </div>
                <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px' }}>
                    {polls.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0', fontSize: '14px' }}>No polls conducted yet</div>
                    ) : polls.map((poll) => {
                        const totalV = poll.voteCounts ? Object.values(poll.voteCounts).reduce((s, v) => s + v, 0) : 0;
                        const isOpen = expandedId === poll.id;
                        const opts = Array.isArray(poll.options) ? poll.options : [];
                        const ts = poll.start_time ? parseInt(poll.start_time) : NaN;
                        const dateStr = isNaN(ts) ? '' : new Date(ts).toLocaleString();
                        return (
                            <div key={poll.id} style={{ border: '1.5px solid #e5e7eb', borderRadius: '14px', marginBottom: '12px', overflow: 'hidden' }}>
                                <div onClick={() => onToggle(poll.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', cursor: 'pointer', background: isOpen ? '#f9f8ff' : '#fff' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span style={{ background: poll.status === 'ended' ? '#f3f4f6' : '#dcfce7', color: poll.status === 'ended' ? '#6b7280' : '#16a34a', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>{poll.status}</span>
                                            <span style={{ fontSize: '11px', color: '#9ca3af' }}>{dateStr}</span>
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '12px' }}>{poll.question}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                                        <span style={{ fontSize: '13px', color: '#6c5ce7', fontWeight: 600 }}>{totalV} vote{totalV !== 1 ? 's' : ''}</span>
                                        {isOpen ? <ChevronLeft size={16} style={{ color: '#9ca3af' }} /> : <ChevronRight size={16} style={{ color: '#9ca3af' }} />}
                                    </div>
                                </div>
                                {isOpen && (
                                    <div style={{ padding: '8px 18px 16px', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
                                        {opts.map((opt, i) => {
                                            const count = poll.voteCounts?.[opt] || 0;
                                            const pct = totalV === 0 ? 0 : Math.round(count / totalV * 100);
                                            const color = COLORS[i % COLORS.length];
                                            return (
                                                <div key={i} style={{ marginTop: '10px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#374151', fontWeight: 600, marginBottom: '4px' }}>
                                                        <span>{i + 1}. {opt}</span>
                                                        <span style={{ color }}>{count} ({pct}%)</span>
                                                    </div>
                                                    <div style={{ background: '#e5e7eb', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '999px', transition: 'width 0.6s ease' }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// floating chat/participants panel
function ChatPanel({ messages, participants, activeTab, onTabChange, chatInput, onInputChange, onSend, onWarn, onKick, msgEndRef }) {
    return (
        <div style={styles.panel}>
            <div style={styles.panelHeader}>
                <button style={styles.tab(activeTab === 'chat')} onClick={() => onTabChange('chat')}>Chat</button>
                <button style={styles.tab(activeTab === 'participants')} onClick={() => onTabChange('participants')}>
                    Participants ({participants.length})
                </button>
            </div>
            {activeTab === 'chat' ? (
                <>
                    <div style={styles.msgList}>
                        {messages.length === 0 && <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '13px', marginTop: '20px' }}>No messages yet</div>}
                        {messages.map(msg => (
                            <div key={msg.id} style={{ alignSelf: msg.isTeacher ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                                <div style={styles.msgSender}>{msg.isTeacher ? 'You (Teacher)' : msg.senderName}</div>
                                <div style={styles.msgBubble(msg.isTeacher)}>{msg.text}</div>
                            </div>
                        ))}
                        <div ref={msgEndRef} />
                    </div>
                    <div style={styles.chatInputWrap}>
                        <input style={styles.chatInputBox} value={chatInput} onChange={e => onInputChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && onSend()} placeholder="Type a message..." />
                        <button style={styles.sendBtn} onClick={onSend}><Send size={15} /></button>
                    </div>
                </>
            ) : (
                <div style={styles.msgList}>
                    {participants.length === 0 && <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '13px', marginTop: '20px' }}>No students connected</div>}
                    {participants.map(p => (
                        <div key={p.socketId} style={styles.participantRow}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f5f3ff', color: '#6c5ce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>
                                    {p.name.charAt(0).toUpperCase()}
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>{p.name}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button style={styles.warnBtn} title="Warn" onClick={() => onWarn(p.socketId)}><AlertTriangle size={14} /></button>
                                <button style={styles.kickBtn} title="Kick" onClick={() => onKick(p.socketId)}><XCircle size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// renders a leaderboard modal with medal emojis and a reset button
function LeaderboardModal({ open, onClose, leaderboard, onReset }) {
    if (!open) return null;
    const medals = ['🥇', '🥈', '🥉'];
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
            <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '480px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Trophy size={20} style={{ color: '#f59e0b' }} />
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#111' }}>Live Leaderboard</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={onReset} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Reset Scores</button>
                        <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#6b7280' }}><X size={16} /></button>
                    </div>
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {leaderboard.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>No scores yet</div>
                    ) : leaderboard.map((entry, i) => (
                        <div key={entry.studentId} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f5f5f5' }}>
                            <div style={{ width: '28px', textAlign: 'center', fontSize: i < 3 ? '18px' : '14px', fontWeight: 700, color: '#9ca3af' }}>{i < 3 ? medals[i] : i + 1}</div>
                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: i === 0 ? '#fef3c7' : '#f5f3ff', color: i === 0 ? '#b45309' : '#6c5ce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>{entry.name.charAt(0).toUpperCase()}</div>
                            <div style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: '#111' }}>{entry.name}</div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: i === 0 ? '#f59e0b' : '#374151', minWidth: '50px', textAlign: 'right' }}>{entry.score} pts</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}


function TeacherDashboard() {
    const { socket, isConnected } = useSocket();
    const { addToast, ToastContainer } = useToast();
    const [view, setView] = useState('form');
    const [pollState, setPollState] = useState(null);

    // form fields
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [duration, setDuration] = useState(60);
    const [timerOpen, setTimerOpen] = useState(false);
    const [marks, setMarks] = useState(10);
    const [correctIndex, setCorrectIndex] = useState(0);

    // chat + participants
    const [panelOpen, setPanelOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('chat');
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [participants, setParticipants] = useState([]);
    const msgEndRef = useRef(null);

    // history
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyPolls, setHistoryPolls] = useState([]);
    const [expandedPoll, setExpandedPoll] = useState(null);

    // leaderboard
    const [leaderboard, setLeaderboard] = useState([]);
    const [lbOpen, setLbOpen] = useState(false);

    const remainingTime = usePollTimer(pollState?.duration, pollState?.startTime);

    // listen for socket events
    useEffect(() => {
        if (!socket) return;

        socket.on('current_state', (state) => {
            // Only restore live view if a poll is actively running.
            // Ended polls are not restored so new tabs always open on the fresh form.
            if (state.active) { setPollState(state); setView('live'); }
        });
        socket.on('start_poll', (state) => { setPollState(state); setView('live'); });
        socket.on('poll_update', ({ voteCounts }) => {
            setPollState(prev => prev ? { ...prev, poll: { ...prev.poll, voteCounts } } : prev);
        });
        socket.on('poll_ended', (state) => { setPollState(state); setView('live'); });
        socket.on('chat_history', (hist) => setMessages(hist));
        socket.on('new_message', (msg) => setMessages(prev => [...prev, msg]));
        socket.on('participants_update', (list) => setParticipants(list));
        socket.on('poll_history', (polls) => setHistoryPolls(polls));
        socket.on('leaderboard_update', (board) => setLeaderboard(board));

        // now that all listeners are ready, ask the server for current state
        socket.emit('request_state');

        return () => {
            ['current_state', 'start_poll', 'poll_update', 'poll_ended', 'chat_history',
                'new_message', 'participants_update', 'poll_history', 'leaderboard_update']
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
            addToast({ type: 'success', message: 'Reconnected to server' });
        }
        prevConnected.current = isConnected;
    }, [isConnected]);

    // auto-scroll chat
    useEffect(() => {
        if (panelOpen) msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, panelOpen]);

    function handleAsk() {
        const validOpts = options.filter(o => o.trim());
        if (!question.trim() || validOpts.length < 2) {
            addToast({ type: 'warning', message: 'Please enter a question and at least 2 options' });
            return;
        }
        if (!isConnected) {
            addToast({ type: 'error', message: 'Cannot create poll — not connected to server' });
            return;
        }
        const correctAnswer = validOpts[correctIndex] || validOpts[0];
        socket.emit('start_poll', { question, options: validOpts, duration, correctAnswer, marks });
        addToast({ type: 'success', message: 'Poll created successfully!' });
        setQuestion('');
        setOptions(['', '']);
        setCorrectIndex(0);
    }

    function handleNewQuestion() {
        setPollState(null);
        setView('form');
    }

    function openHistory() {
        if (socket) socket.emit('get_poll_history');
        setHistoryOpen(true);
    }

    function sendMessage() {
        if (!chatInput.trim() || !socket) return;
        socket.emit('send_message', { senderName: 'Teacher', text: chatInput.trim(), isTeacher: true });
        setChatInput('');
    }

    const kickStudent = (sid) => socket.emit('kick_student', { socketId: sid });
    const warnStudent = (sid) => socket.emit('warn_student', { socketId: sid, message: 'Please follow the class rules.' });

    function updateOption(i, val) {
        const copy = [...options];
        copy[i] = val;
        setOptions(copy);
    }

    function removeOption(i) {
        if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i));
    }

    // computed values for the results view
    const voteCounts = pollState?.poll?.voteCounts || {};
    const pollOptions = pollState?.poll?.options || [];
    const totalVotes = Object.values(voteCounts).reduce((s, v) => s + v, 0);
    const getPct = (opt) => totalVotes === 0 ? 0 : Math.round((voteCounts[opt] || 0) / totalVotes * 100);

    const historyProps = {
        open: historyOpen,
        onClose: () => setHistoryOpen(false),
        polls: historyPolls,
        expandedId: expandedPoll,
        onToggle: (id) => setExpandedPoll(prev => prev === id ? null : id),
        onDelete: () => { if (socket) socket.emit('delete_poll_history'); },
    };

    const chatProps = {
        messages, participants, activeTab,
        onTabChange: setActiveTab,
        chatInput, onInputChange: setChatInput,
        onSend: sendMessage, onWarn: warnStudent, onKick: kickStudent,
        msgEndRef,
    };

    // results view - shown after a poll is started
    if (view === 'live' && pollState) {
        return (
            <div style={styles.page}>
                <ToastContainer />
                <div style={styles.topBar} />
                <div style={styles.body}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                        <div>
                            <div style={styles.badge}><Sparkles size={12} /> Teacher Mode</div>
                            <h1 style={{ ...styles.h1, marginBottom: '2px' }}>Question</h1>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                            {pollState.active && <div style={styles.timerBadge}>⏱ {remainingTime}s</div>}
                            <div style={styles.connBadge(isConnected)}><span style={styles.dot(isConnected)} />{isConnected ? 'Live' : 'Offline'}</div>
                        </div>
                    </div>

                    <div style={styles.questionCard}>{pollState.poll.question}</div>

                    {pollState.poll.status === 'ended' && <span style={styles.endedTag}>Poll Ended</span>}
                    <div style={styles.totalTag}>Total Votes: {totalVotes}</div>

                    {pollOptions.map((opt, i) => {
                        const pct = getPct(opt);
                        const color = COLORS[i % COLORS.length];
                        return (
                            <div key={i}>
                                <div style={styles.barWrap}>
                                    <div style={styles.barFill(pct, color + '55')} />
                                    <div style={styles.barLabel}>
                                        <div style={{ ...styles.optionNum(i), width: '22px', height: '22px', fontSize: '11px' }}>{i + 1}</div>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>{opt}</span>
                                        <span style={{ fontSize: '13px', color: '#6b7280' }}>({voteCounts[opt] || 0})</span>
                                    </div>
                                    <div style={{ ...styles.barPct, color: pct > 0 ? color : '#9ca3af' }}>{pct}%</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={styles.bottomBar}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '13px', color: '#9ca3af' }}>{participants.length} student{participants.length !== 1 ? 's' : ''} connected</div>
                        <button onClick={openHistory} style={styles.histBtn}><History size={15} /> History</button>
                        <button onClick={() => setLbOpen(true)} style={styles.lbBtn}><Trophy size={15} /> Leaderboard</button>
                    </div>
                    <button onClick={handleNewQuestion} style={styles.newQuBtn}>+ Ask a new question</button>
                </div>

                <button style={styles.chatFab} onClick={() => setPanelOpen(p => !p)}>
                    {panelOpen ? <X size={20} /> : <MessageCircle size={20} />}
                </button>
                {panelOpen && <ChatPanel {...chatProps} />}
                <HistoryModal {...historyProps} />
                <LeaderboardModal open={lbOpen} onClose={() => setLbOpen(false)} leaderboard={leaderboard} onReset={() => { if (socket) socket.emit('reset_scores'); }} />
            </div>
        );
    }

    // create poll view - the default form
    return (
        <div style={styles.page}>
            <ToastContainer />
            <div style={styles.topBar} />
            <div style={styles.body}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div>
                        <div style={styles.badge}><Sparkles size={12} /> Intervue Poll</div>
                        <h1 style={styles.h1}>Let's <strong>Get Started</strong></h1>
                        <p style={styles.sub}>Create and manage polls, ask questions, and monitor your students' responses in real-time.</p>
                    </div>
                    <div style={styles.connBadge(isConnected)}><span style={styles.dot(isConnected)} />{isConnected ? 'Connected' : 'Reconnecting'}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                    <span style={styles.label}>Enter your question</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '8px', padding: '7px 12px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a' }}>Marks</span>
                            <input type="number" min="1" max="100" value={marks} onChange={e => setMarks(Math.max(1, parseInt(e.target.value) || 1))} style={{ width: '48px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '6px', padding: '4px 6px', fontSize: '14px', fontWeight: 700, color: '#111', textAlign: 'center', outline: 'none' }} />
                        </div>
                        <div style={{ position: 'relative' }}>
                            <div style={styles.timerSelect} onClick={() => setTimerOpen(t => !t)}>
                                {duration}s <ChevronDown size={14} />
                            </div>
                            {timerOpen && (
                                <div style={{ position: 'absolute', right: 0, top: '110%', background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 99, minWidth: '140px', overflow: 'hidden' }}>
                                    {TIMER_OPTIONS.map(t => (
                                        <div key={t} onClick={() => { setDuration(t); setTimerOpen(false); }}
                                            style={{ padding: '10px 16px', fontSize: '14px', cursor: 'pointer', color: duration === t ? '#6c5ce7' : '#374151', fontWeight: duration === t ? 700 : 400, background: duration === t ? '#f5f3ff' : '#fff' }}>
                                            {t} seconds
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <textarea value={question} onChange={e => { if (e.target.value.length <= 100) setQuestion(e.target.value); }} placeholder="Type your question here..." rows={4} style={styles.textarea} />
                <div style={styles.charCount}>{question.length}/100</div>

                <div style={styles.optionsGrid}>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#111', marginBottom: '14px' }}>Edit Options</div>
                        {options.map((opt, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <div style={styles.optionNum(i)}>{i + 1}</div>
                                <input value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`Option ${i + 1}`} style={styles.optionInput} />
                                {options.length > 2 && (
                                    <button type="button" onClick={() => removeOption(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '18px', lineHeight: 1 }}>×</button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={() => setOptions([...options, ''])} style={styles.addBtn}>+ Add More option</button>
                    </div>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#111', marginBottom: '14px' }}>Correct Answer</div>
                        {options.map((opt, i) => (
                            <div key={i} style={{ marginBottom: '14px', height: '40px', display: 'flex', alignItems: 'center' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: correctIndex === i ? 700 : 500, color: correctIndex === i ? '#16a34a' : '#6b7280' }}>
                                    <input type="radio" name="correctOption" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} style={{ accentColor: '#16a34a', width: '16px', height: '16px' }} />
                                    {correctIndex === i ? '✓ Correct' : 'Mark correct'}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={styles.bottomBar}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '13px', color: '#9ca3af' }}>{participants.length} student{participants.length !== 1 ? 's' : ''} connected</div>
                    <button onClick={openHistory} style={styles.histBtn}><History size={15} /> History</button>
                    <button onClick={() => setLbOpen(true)} style={styles.lbBtn}><Trophy size={15} /> Leaderboard</button>
                </div>
                <button onClick={handleAsk} disabled={!isConnected || !question.trim() || options.filter(o => o.trim()).length < 2} style={styles.askBtn(!isConnected || !question.trim() || options.filter(o => o.trim()).length < 2)}>
                    Ask Question
                </button>
            </div>

            <button style={styles.chatFab} onClick={() => setPanelOpen(p => !p)}>
                {panelOpen ? <X size={20} /> : <MessageCircle size={20} />}
            </button>
            {panelOpen && <ChatPanel {...chatProps} />}
            <HistoryModal {...historyProps} />
            <LeaderboardModal open={lbOpen} onClose={() => setLbOpen(false)} leaderboard={leaderboard} onReset={() => { if (socket) socket.emit('reset_scores'); }} />
        </div>
    );
}

export default TeacherDashboard;
