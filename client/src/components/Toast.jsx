import React, { useState, useCallback } from 'react';

// types: 'error', 'success', 'warning', 'info'
const COLORS = {
    error: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', icon: '✕' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', icon: '✓' },
    warning: { bg: '#fef3c7', border: '#fde68a', text: '#b45309', icon: '⚠' },
    info: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', icon: 'ℹ' },
};

function Toast({ toasts, onDismiss }) {
    if (toasts.length === 0) return null;

    return (
        <div style={{
            position: 'fixed', top: '16px', right: '16px',
            zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px',
            maxWidth: '380px', width: '100%', pointerEvents: 'none',
        }}>
            {toasts.map(toast => {
                const c = COLORS[toast.type] || COLORS.info;
                return (
                    <div key={toast.id} style={{
                        background: c.bg, border: `1px solid ${c.border}`,
                        borderRadius: '12px', padding: '12px 16px',
                        display: 'flex', alignItems: 'flex-start', gap: '10px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        animation: 'toastSlideIn 0.3s ease-out',
                        pointerEvents: 'auto', fontFamily: "'Inter', sans-serif",
                    }}>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: c.text, lineHeight: 1, marginTop: '1px' }}>
                            {c.icon}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            {toast.title && (
                                <div style={{ fontSize: '13px', fontWeight: 700, color: c.text, marginBottom: '2px' }}>
                                    {toast.title}
                                </div>
                            )}
                            <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.4 }}>
                                {toast.message}
                            </div>
                        </div>
                        <button
                            onClick={() => onDismiss(toast.id)}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                fontSize: '14px', color: '#9ca3af', padding: '0 2px', lineHeight: 1,
                            }}
                        >
                            ×
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

// hook to manage toasts - returns [toasts, addToast, dismissToast, ToastComponent]
export function useToast() {
    const [toasts, setToasts] = useState([]);

    const dismiss = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, type, title, message }]);

        // auto-dismiss after duration
        if (duration > 0) {
            setTimeout(() => dismiss(id), duration);
        }

        return id;
    }, [dismiss]);

    const ToastContainer = useCallback(() => (
        <Toast toasts={toasts} onDismiss={dismiss} />
    ), [toasts, dismiss]);

    return { toasts, addToast, dismiss, ToastContainer };
}

// inject the slide-in animation globally
const styleTag = document.createElement('style');
styleTag.textContent = `@keyframes toastSlideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`;
if (!document.querySelector('[data-toast-style]')) {
    styleTag.setAttribute('data-toast-style', '');
    document.head.appendChild(styleTag);
}

export default Toast;
