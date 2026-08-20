import { useState, useEffect, useRef } from 'react';

  export default function TypingIndicator({ channelRef, username }) {
  const [typingUsers, setTypingUsers] = useState({});

  useEffect(() => {
    if (!channelRef.current) return;

    channelRef.current.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.username === username) return;
      setTypingUsers(prev => {
        if (!payload.isTyping) {
          const updated = { ...prev };
          delete updated[payload.username];
          return updated;
        }
        return { ...prev, [payload.username]: Date.now() };
      });
    });
  }, [channelRef.current, username]); // ← depend on channelRef.current

  // Clean up stale typers every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(u => {
          if (Date.now() - updated[u] > 4000) delete updated[u];
        });
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const typers = Object.keys(typingUsers);
  if (typers.length === 0) return null;

  const label = typers.length === 1
    ? `${typers[0]} is typing...`
    : typers.length <= 3
      ? `${typers.join(', ')} are typing...`
      : `${typers.length} people are typing...`;

  return (
    <div className="px-4 pb-1">
      <p className="text-xs text-slate-500 italic">{label}</p>
    </div>
  );
}

// ── Hook to broadcast typing events ──────────────────────────────────────────
export function useTypingBroadcast(channelRef, username) {
  const timeoutRef = useRef(null);

  const broadcastTyping = (isTyping) => {
    try {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: { username, isTyping },
        });
      }
    } catch (err) {
      console.error('Typing broadcast error:', err);
    }
  };

  const onTyping = () => {
    broadcastTyping(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => broadcastTyping(false), 3000);
  };

  const stopTyping = () => {
    clearTimeout(timeoutRef.current);
    broadcastTyping(false);
  };

  return { onTyping, stopTyping };
}

