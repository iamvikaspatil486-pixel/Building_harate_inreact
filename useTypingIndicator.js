import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useTypingIndicator(channelName, currentUser) {
  const [typingUsers, setTypingUsers] = useState({});
  const channelRef = useRef(null);
  const timeoutRefs = useRef({});

  useEffect(() => {
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const { userId, userName } = payload;
        if (userId === currentUser?.id) return;

        // Mark user as typing
        setTypingUsers((prev) => ({ ...prev, [userId]: userName }));

        // Clear existing timeout for this user
        if (timeoutRefs.current[userId]) {
          clearTimeout(timeoutRefs.current[userId]);
        }

        // Auto-remove user after 2.5 seconds of inactivity
        timeoutRefs.current[userId] = setTimeout(() => {
          setTypingUsers((prev) => {
            const copy = { ...prev };
            delete copy[userId];
            return copy;
          });
        }, 2500);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      Object.values(timeoutRefs.current).forEach(clearTimeout);
    };
  }, [channelName, currentUser?.id]);

  // Function to broadcast typing event
  const sendTyping = () => {
    if (channelRef.current && currentUser) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: currentUser.id,
          userName: currentUser.full_name?.split(' ')[0] || 'Someone',
        },
      });
    }
  };

  return { typingUsers: Object.values(typingUsers), sendTyping };
}

