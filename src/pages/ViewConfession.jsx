import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';

const timeAgo = (ts) => {
  if (!ts) return 'just now';

  // Convert UTC to local Indian time properly
  const utcDate = new Date(ts);
  const localDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000)); // Add IST offset

  const now = new Date();
  const diffMs = now - localDate;
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 0) return 'just now';           // Safety for small differences
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
  const bottomRef = useRef();
  const inputRef = useRef();

  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');
  const myTokens = JSON.parse(localStorage.getItem('confession_tokens') || '[]');
  const myToken = myTokens.find((t) => t.confession_id === id);

  useEffect(() => {
    fetchData();

    // Realtime subscription
    const ch = supabase.channel(`confession-${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'confession_messages',
        filter: `confession_id=eq.${id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [id]);

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

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await supabase.from('confession_messages').insert({
        confession_id: id,
        from_role: role,
        message: text.trim(),
      });

      // Mark as replied if receiver sends first reply
      if (role === 'receiver' && confession?.status === 'pending') {
        await supabase.from('confessions').update({ status: 'replied' }).eq('id', id);
      }

      setText('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Send failed:', err);
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Loader2 size={24} className="animate-spin text-gray-300" />
    </div>
  );

  if (!confession) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
      <p className="text-gray-400 text-sm">Confession not found</p>
      <button onClick={() => navigate(-1)} className="text-blue-500 text-sm font-bold">Go back</button>
    </div>
  );

  // Labels
  const myLabel = role === 'confessor' ? 'You (Anonymous)' : `You (${confession.students?.full_name?.split(' ')[0] || 'Receiver'})`;
  const theirLabel = role === 'confessor'
    ? (confession.students?.full_name?.split(' ')[0] || 'Receiver')
    : (confession.sender_alias || 'Anonymous');

  const isMe = (msgRole) => msgRole === role;

  return (
    <div className="fixed inset-0 bg-white flex flex-col">

      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 active:scale-90 transition">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm truncate">
            {role === 'confessor' ? `To: ${confession.students?.full_name || 'Unknown'}` : `From: ${theirLabel}`}
          </p>
          <p className="text-[11px] text-gray-400">Anonymous confession</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
          💌
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {/* Original confession as first bubble */}
        <div className="flex justify-start">
          <div className="max-w-[80%]">
            <p className="text-[10px] text-gray-400 mb-1 px-1">{theirLabel}</p>
            <div className="bg-gray-100 rounded-3xl rounded-tl-sm px-4 py-3">
              <p className="text-sm text-gray-900 leading-relaxed">{confession.message}</p>
            </div>
            <p className="text-[10px] text-gray-400 mt-1 px-1">{timeAgo(confession.created_at)}</p>
          </div>
        </div>

        {/* Reply messages */}
        {messages.map((msg) => {
          const fromMe = isMe(msg.from_role);
          return (
            <div key={msg.id} className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%]`}>
                {!fromMe && (
                  <p className="text-[10px] text-gray-400 mb-1 px-1">{theirLabel}</p>
                )}
                <div className={`px-4 py-3 rounded-3xl text-sm leading-relaxed ${
                  fromMe
                    ? 'bg-blue-500 text-white rounded-tr-sm'
                    : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                }`}>
                  {msg.message}
                </div>
                <p className={`text-[10px] text-gray-400 mt-1 px-1 ${fromMe ? 'text-right' : 'text-left'}`}>
                  {timeAgo(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}

        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400 text-xs">
              {role === 'receiver' ? 'Reply to start the anonymous conversation' : 'Waiting for a reply…'}
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-100 px-3 py-3 flex items-end gap-2"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
     <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white disabled:opacity-30 active:scale-90 transition flex-shrink-0 bg-blue-500"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
        <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5">
          <textarea
            ref={inputRef}
            value={text}
            rows={1}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Reply anonymously…"
            className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none resize-none leading-relaxed"
            style={{ maxHeight: 100 }}
          />
        </div>
      </div>

    </div>
  );
}

