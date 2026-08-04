import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Loader2, MessageCircleHeart, Inbox, Send } from 'lucide-react';

const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function SearchConfession() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('received'); // 'sent' | 'received'
  const [sent, setSent] = useState([]);
  const [received, setReceived] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');

  // Get all tokens this user sent (stored in localStorage)
  const myTokens = JSON.parse(localStorage.getItem('confession_tokens') || '[]');
  // { token, to_student_id, to_name, confession_id }

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchSent(), fetchReceived()]);
    setLoading(false);
  };

  const fetchSent = async () => {
    if (!myTokens.length) { setSent([]); return; }
    const tokens = myTokens.map((t) => t.token);
    const { data } = await supabase
      .from('confessions')
      .select('id, message, created_at, token, sender_alias, status, to_student_id, students!to_student_id(full_name)')
      .in('token', tokens)
      .order('created_at', { ascending: false });
    setSent(data || []);
  };

  const fetchReceived = async () => {
    if (!currentUser?.id) { setReceived([]); return; }
    const { data } = await supabase
      .from('confessions')
      .select('id, message, created_at, sender_alias, status, token')
      .eq('to_student_id', currentUser.id)
      .order('created_at', { ascending: false });
    setReceived(data || []);
  };

  const updateAlias = async (confessionId, newAlias) => {
    await supabase.from('confessions').update({ sender_alias: newAlias }).eq('id', confessionId);
    setReceived((prev) => prev.map((c) => c.id === confessionId ? { ...c, sender_alias: newAlias } : c));
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 active:scale-90 transition">
          <ArrowLeft size={22} />
        </button>
        <p className="font-bold text-gray-900 text-sm">Confessions</p>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 flex-shrink-0">
        {[
          { key: 'received', label: 'Received', icon: Inbox },
          { key: 'sent', label: 'Sent', icon: Send },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold border-b-2 transition ${
              tab === key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-400'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 pb-24">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={22} className="animate-spin text-gray-300" />
          </div>
        ) : tab === 'received' ? (
          <ReceivedList
            items={received}
            onOpen={(c) => navigate(`/viewconfession/${c.id}?role=receiver`)}
            onUpdateAlias={updateAlias}
          />
        ) : (
          <SentList
            items={sent}
            myTokens={myTokens}
            onOpen={(c) => navigate(`/viewconfession/${c.id}?role=confessor`)}
          />
        )}
      </main>
    </div>
  );
}

// ── Received list ─────────────────────────────────────────────────────────────
function ReceivedList({ items, onOpen, onUpdateAlias }) {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center px-6">
        <Inbox size={36} className="text-gray-200" />
        <p className="text-gray-500 font-semibold text-sm">No confessions yet</p>
        <p className="text-gray-400 text-xs">When someone confesses to you, it'll appear here</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {items.map((c, i) => {
        const displayName = c.sender_alias || `Anonymous ${i + 1}`;
        const isEditing = editingId === c.id;

        return (
          <div key={c.id} className="px-4 py-4">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-sm font-black flex-shrink-0">
                {displayName[0].toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            onUpdateAlias(c.id, editValue.trim() || displayName);
                            setEditingId(null);
                          }
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        placeholder="Set a name…"
                        className="flex-1 bg-gray-100 rounded-lg px-2 py-1 text-xs text-gray-900 outline-none"
                      />
                      <button
                        onClick={() => {
                          onUpdateAlias(c.id, editValue.trim() || displayName);
                          setEditingId(null);
                        }}
                        className="text-blue-500 text-xs font-bold"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-gray-900">{displayName}</p>
                      <button
                        onClick={() => { setEditingId(c.id); setEditValue(c.sender_alias || ''); }}
                        className="text-[10px] text-blue-400 font-medium"
                      >
                        rename
                      </button>
                    </>
                  )}
                </div>

                <p className="text-xs text-gray-500 line-clamp-2 mb-2">{c.message}</p>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">{timeAgo(c.created_at)}</span>
                  <button
                    onClick={() => onOpen(c)}
                    className="text-xs font-bold text-blue-500 bg-blue-50 px-3 py-1 rounded-full active:scale-95 transition"
                  >
                    Reply →
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Sent list ─────────────────────────────────────────────────────────────────
function SentList({ items, myTokens, onOpen }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center px-6">
        <MessageCircleHeart size={36} className="text-gray-200" />
        <p className="text-gray-500 font-semibold text-sm">No confessions sent</p>
        <p className="text-gray-400 text-xs">Go to someone's profile and confess!</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {items.map((c) => {
        const toName = c.students?.full_name || 'Unknown';

        return (
          <div
            key={c.id}
            onClick={() => onOpen(c)}
            className="px-4 py-4 flex items-start gap-3 active:bg-gray-50 transition cursor-pointer"
          >
            {/* Avatar with real name initial */}
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-sm font-black flex-shrink-0">
              {toName[0].toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-gray-900 truncate">To: {toName}</p>
                <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{timeAgo(c.created_at)}</span>
              </div>
              <p className="text-xs text-gray-500 line-clamp-2">{c.message}</p>
              <span className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                c.status === 'replied' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {c.status === 'replied' ? '💬 Replied' : '⏳ Pending'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

