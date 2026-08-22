import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import CmBubble from "../components/CmBubble"; // adjust path if needed

const timeAgo = (ts) => {
  if (!ts) return 'just now';

  const utcDate = new Date(ts);
  const localDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000)); // IST

  const now = new Date();
  const diffMs = now - localDate;
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 0) return 'just now';
  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
};

export default function ViewConfession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'receiver'; // 'confessor' | 'receiver'

  const [confession, setConfession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [isOtherOnline, setIsOtherOnline] = useState(false);

  const bottomRef = useRef();
  const inputRef = useRef();
  const channelRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');
  const myTokens = JSON.parse(localStorage.getItem('confession_tokens') || '[]');
  const myToken = myTokens.find((t) => t.confession_id === id);

  useEffect(() => {
    fetchData();

    const ch = supabase
      .channel(`confession-${id}`, {
        config: {
          presence: {
            key: role,
          },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'confession_messages',
          filter: `confession_id=eq.${id}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.from_role !== role) {
          setIsOtherTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setIsOtherTyping(false);
          }, 2500);
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const presenceState = ch.presenceState();
        const otherRole = role === 'confessor' ? 'receiver' : 'confessor';
        const isOnline = Boolean(presenceState[otherRole]);
        setIsOtherOnline(isOnline);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await ch.track({ online_at: new Date().toISOString(), role });
        }
      });

    channelRef.current = ch;

    return () => {
      supabase.removeChannel(ch);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [id, role]);

  const fetchData = async () => {
    setLoading(true);
    const { data: conf } = await supabase
      .from('confessions')
      .select('id, message, created_at, sender_alias, status, to_student_id, students!to_student_id(full_name)')
      .eq('id', id)
      .single();

    const { data: msgs } = await supabase
      .from('confession_messages')
      .select('*')
      .eq('confession_id', id)
      .order('created_at', { ascending: true });

    setConfession(conf);
    setMessages(msgs || []);
    setLoading(false);

    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleInputChange = (e) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { from_role: role },
      });
    }
  };

  // Dismiss keyboard when user scrolls through messages
  const handleScrollMessages = () => {
    if (document.activeElement === inputRef.current) {
      inputRef.current?.blur();
    }
  };

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await supabase.from('confession_messages').insert({
        confession_id: id,
        from_role: role,
        message: text.trim(),
      });

      if (role === 'receiver' && confession?.status === 'pending') {
        await supabase.from('confessions').update({ status: 'replied' }).eq('id', id);
      }

      setText('');

      // Reset input height & close keyboard cleanly
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        inputRef.current.blur();
      }
    } catch (err) {
      console.error('Send failed:', err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-pink-400" />
      </div>
    );
  }

  if (!confession) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center gap-3">
        <p className="text-gray-400 text-sm">Confession not found</p>
        <button onClick={() => navigate(-1)} className="text-pink-500 text-sm font-bold">
          Go back
        </button>
      </div>
    );
  }

  const myLabel =
    role === 'confessor'
      ? 'You (Anonymous)'
      : `You (${confession.students?.full_name?.split(' ')[0] || 'Receiver'})`;

  const theirLabel =
    role === 'confessor'
      ? confession.students?.full_name?.split(' ')[0] || 'Receiver'
      : confession.sender_alias || 'Anonymous';

  const isMe = (msgRole) => msgRole === role;

  const originalIsMine = role === 'confessor';

  return (
    <div className="fixed inset-0 h-[100dvh] bg-[#fafafa] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 h-14 flex items-center gap-3 z-10">
        <button
          onClick={() => navigate('/')}
          className="text-gray-500 active:scale-90 transition p-1"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm truncate">
            {role === 'confessor'
              ? `To: ${confession.students?.full_name || 'Unknown'}`
              : `From: ${theirLabel}`}
          </p>
          <p className="text-[11px] text-gray-400">Anonymous confession</p>
        </div>
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-sm shadow-sm">
            💌
          </div>
          <span
            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
              isOtherOnline ? 'bg-emerald-500' : 'bg-gray-300'
            }`}
            title={isOtherOnline ? 'Online' : 'Offline'}
          />
        </div>
      </header>

      {/* Notice */}
      <div className="flex-shrink-0 text-center px-4 py-1.5 bg-[#fafafa]">
        <p className="text-[10px] text-gray-400">
          You cannot edit or delete messages
        </p>
      </div>

      {/* Messages Feed */}
      <main
        onScroll={handleScrollMessages}
        onTouchMove={handleScrollMessages}
        className="flex-1 overflow-y-auto px-4 py-5 space-y-4"
      >
        {/* Original confession bubble */}
        <CmBubble
          message={{
            message: confession.message,
            created_at: confession.created_at,
            type: "text",
          }}
          fromMe={originalIsMine}
          showName={!originalIsMine}
          nameLabel={theirLabel}
          isOriginal
        />

        {/* Reply messages */}
        {messages.map((msg) => (
          <CmBubble
            key={msg.id}
            message={msg}
            fromMe={isMe(msg.from_role)}
          />
        ))}

        {messages.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-400 text-xs">
              {role === 'receiver'
                ? 'Reply to start the anonymous conversation'
                : 'Waiting for a reply…'}
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* Typing Indicator Bar */}
      {isOtherTyping && (
        <div className="flex-shrink-0 px-5 py-1.5 flex items-center gap-2 text-xs text-gray-400 bg-[#fafafa]">
          <span>{theirLabel} is typing</span>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" />
          </div>
        </div>
      )}

      {/* Input bar */}
      <div
        className="flex-shrink-0 bg-white border-t border-gray-100 px-3 py-3 flex items-end gap-2"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5">
          <textarea
            ref={inputRef}
            value={text}
            rows={1}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Reply anonymously…"
            className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none resize-none leading-relaxed"
            style={{ maxHeight: 100 }}
          />
        </div>
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white disabled:opacity-30 active:scale-90 transition flex-shrink-0 bg-blue-500"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-slide-in {
          animation: slideIn 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>
    </div>
  );
}

