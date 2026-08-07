import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Loader2, MessageCircleHeart, Inbox, Send, MoreVertical, Trash2 } from 'lucide-react';

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

export default function SearchConfession() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('received'); // 'sent' | 'received'
  const [sent, setSent] = useState([]);
  const [received, setReceived] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');
  const myTokens = JSON.parse(localStorage.getItem('confession_tokens') || '[]');

  useEffect(() => {
    fetchAll();
  }, []); 

  // Mark all received confessions as read when page opens
  useEffect(() => {
    if (!currentUser?.id) return;
    const markRead = async () => {
      const { error } = await supabase
        .from('confessions')
        .update({ is_read: true })
        .eq('to_student_id', currentUser.id)
        .eq('is_read', false);
      if (error) console.error('markRead error:', error);
    };
    markRead();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchSent(), fetchReceived()]);
    setLoading(false);
  };

  const fetchSent = async () => {
    if (!currentUser?.id) {
      setSent([]);
      return;
    }

    const { data } = await supabase
      .from('confessions')
      .select('id, message, created_at, token, sender_alias, status, to_student_id, students!to_student_id(full_name)')
      .eq('from_student_id', currentUser.id)
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

  // ── Delete Handler with Confirmation Alert ─────────────────────────────
  const handleDeleteCard = async (confessionId, isSent = false) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this confession card?');
    if (!confirmDelete) return;

    // Optional: Hide locally for user or mark deleted in Supabase
    const { error } = await supabase
      .from('confessions')
      .delete()
      .eq('id', confessionId);

    if (!error) {
      if (isSent) {
        setSent((prev) => prev.filter((c) => c.id !== confessionId));
      } else {
        setReceived((prev) => prev.filter((c) => c.id !== confessionId));
      }
    } else {
      alert('Failed to delete confession.');
    }
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
            onDelete={(id) => handleDeleteCard(id, false)}
          />
        ) : (
          <SentList
            items={sent}
            myTokens={myTokens}
            onOpen={(c) => navigate(`/viewconfession/${c.id}?role=confessor`)}
            onDelete={(id) => handleDeleteCard(id, true)}
          />
        )}
      </main>
    </div>
  );
}

// ── Received list ─────────────────────────────────────────────────────────────
function ReceivedList({ items, onOpen, onUpdateAlias, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [activeMenuId, setActiveMenuId] = useState(null);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center px-6">
  <video
        src="https://ntfglwfrhljjkzecifuh.supabase.co/storage/v1/object/public/app-assests/VID_20260807_231336.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="w-36 h-36 object-contain opacity-80 pointer-events-none"
      />
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
        const isMenuOpen = activeMenuId === c.id;

        return (
          <div key={c.id} className="px-4 py-4 relative">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-sm font-black flex-shrink-0">
                {displayName[0].toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
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
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">{displayName}</p>
                      <button
                        onClick={() => { setEditingId(c.id); setEditValue(c.sender_alias || ''); }}
                        className="text-[10px] text-blue-400 font-medium"
                      >
                        rename
                      </button>
                    </div>
                  )}

                  {/* 3 Dots Menu Button */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(isMenuOpen ? null : c.id);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded-full active:bg-gray-100 transition"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {/* Popover Dropdown */}
                    {isMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setActiveMenuId(null)}
                        />
                        <div className="absolute right-0 top-6 z-20 bg-white border border-gray-100 shadow-lg rounded-xl py-1 min-w-[120px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              onDelete(c.id);
                            }}
                            className="w-full px-3 py-2 text-left text-xs text-red-600 font-medium flex items-center gap-2 hover:bg-red-50 active:bg-red-100"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
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
function SentList({ items, onOpen, onDelete }) {
  const [activeMenuId, setActiveMenuId] = useState(null);

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
        const isMenuOpen = activeMenuId === c.id;

        return (
          <div
            key={c.id}
            className="px-4 py-4 flex items-start gap-3 active:bg-gray-50 transition relative"
          >
            {/* Avatar */}
            <div
              onClick={() => onOpen(c)}
              className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-sm font-black flex-shrink-0 cursor-pointer"
            >
              {toName[0].toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div onClick={() => onOpen(c)} className="cursor-pointer flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">To: {toName}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="text-[10px] text-gray-400">{timeAgo(c.created_at)}</span>

                  {/* 3 Dots Menu Button */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(isMenuOpen ? null : c.id);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded-full active:bg-gray-100 transition"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {/* Popover Dropdown */}
                    {isMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(null);
                          }}
                        />
                        <div className="absolute right-0 top-6 z-20 bg-white border border-gray-100 shadow-lg rounded-xl py-1 min-w-[120px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              onDelete(c.id);
                            }}
                            className="w-full px-3 py-2 text-left text-xs text-red-600 font-medium flex items-center gap-2 hover:bg-red-50 active:bg-red-100"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div onClick={() => onOpen(c)} className="cursor-pointer">
                <p className="text-xs text-gray-500 line-clamp-2">{c.message}</p>
                <span className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  c.status === 'replied' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {c.status === 'replied' ? '💬 Replied' : '⏳ Pending'}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

