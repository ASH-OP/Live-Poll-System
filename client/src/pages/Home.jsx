import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

function Home() {
    const [selectedRole, setSelectedRole] = useState(null);
    const navigate = useNavigate();

    const handleContinue = () => {
        if (selectedRole === 'student') navigate('/student');
        else if (selectedRole === 'teacher') navigate('/teacher');
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Inter', sans-serif" }}>

            {/* gradient bar at the top */}
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '4px', background: 'linear-gradient(to right, #6c5ce7, #a29bfe, #6c5ce7)' }} />

            <div style={{ width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#6c5ce7', color: '#fff', fontSize: '13px', fontWeight: 600, padding: '6px 16px', borderRadius: '999px', marginBottom: '32px' }}>
                    <Sparkles size={13} />
                    Intervue Poll
                </div>

                <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#111', textAlign: 'center', lineHeight: 1.2, marginBottom: '12px' }}>
                    Welcome to the <span style={{ color: '#6c5ce7' }}>Live Polling System</span>
                </h1>
                <p style={{ color: '#6b7280', fontSize: '15px', textAlign: 'center', marginBottom: '40px', lineHeight: 1.6, maxWidth: '380px' }}>
                    Please select the role that best describes you to begin using the live polling system
                </p>

                {/* role selection cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', marginBottom: '40px' }}>
                    {['student', 'teacher'].map((role) => (
                        <button
                            key={role}
                            onClick={() => setSelectedRole(role)}
                            style={{
                                textAlign: 'left',
                                padding: '24px',
                                borderRadius: '16px',
                                border: `2px solid ${selectedRole === role ? '#6c5ce7' : '#e5e7eb'}`,
                                background: '#fff',
                                cursor: 'pointer',
                                boxShadow: selectedRole === role ? '0 4px 20px rgba(108,92,231,0.15)' : 'none',
                                transition: 'all 0.2s',
                                position: 'relative',
                            }}
                        >
                            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111', marginBottom: '8px' }}>
                                {role === 'student' ? "I'm a Student" : "I'm a Teacher"}
                            </h3>
                            <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
                                {role === 'student'
                                    ? 'Submit answers and view live poll results in real-time.'
                                    : 'Create live polls, ask questions, and monitor responses.'}
                            </p>
                            {selectedRole === role && (
                                <div style={{ position: 'absolute', top: '14px', right: '14px', width: '20px', height: '20px', background: '#6c5ce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5L4.5 8L9 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleContinue}
                    disabled={!selectedRole}
                    style={{
                        padding: '14px 48px',
                        borderRadius: '999px',
                        background: selectedRole ? '#6c5ce7' : '#d1d5db',
                        color: '#fff',
                        fontSize: '15px',
                        fontWeight: 600,
                        border: 'none',
                        cursor: selectedRole ? 'pointer' : 'not-allowed',
                        boxShadow: selectedRole ? '0 4px 16px rgba(108,92,231,0.3)' : 'none',
                        transition: 'all 0.2s',
                    }}
                >
                    Continue
                </button>
            </div>
        </div>
    );
}

export default Home;
