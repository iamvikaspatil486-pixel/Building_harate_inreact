import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Send, MoreVertical, Pencil, Trash2, Check, X } from "lucide-react";

const SESSION_KEY = "chat_anon_session";
const HOURS = 10;
const EXAMPLES = ["truth_teller", "Batman", "princess", "night_viber"];

// ─── USERNAME POPUP COMPONENT ────────────────────────────────────────────────
function UsernamePicker({ onDone, currentUsername, onCancel }) {
  const [name, setName] = useState(currentUsername || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const tryUsername = async (raw) => {
    let clean = raw.trim();
    if (!clean) { setError("enter a username"); return; }
    if (clean.length < 2) { setError("at least 2 characters"); return; }

    setLoading(true);

    const since = new Date(Date.now() - HOURS * 3600 * 1000).toISOString();
    const { data } = await supabase
      .from("chat_messages")
      .select("username")
      .ilike("username", `${clean}%`)
      .gte("created_at", since);

    const taken = data?.map((d) => d.username.toLowerCase()) || [];

    let finalName = clean;
    if (taken.includes(clean.toLowerCase())) {
      let i = 1;
      while (taken.includes(`${clean.toLowerCase()}_0${i}`)) i++;
      finalName = `${clean}_0${i}`;
    }

    const session = {
      username: finalName,
      expiresAt: Date.now() + HOURS * 3600 * 1000,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setLoading(false);
    onDone(finalName);
  };

  return (
    <div className="fixed inset-0 bg-[#090d16]/80 backdrop-blur-sm flex flex-col items-center justify-center px-6 z-50">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-2xl relative">
        {currentUsername && (
          <button
            onClick={onCancel}
            className="absolute top-6 left-6 text-slate-400 hover:text-slate-100 p-2.5 rounded-2xl bg-slate-950 border border-slate-800 transition active:scale-90 flex items-center justify-center"
          >
            <ArrowLeft size={16} />
          </button>
        )}

        <div className="text-center mb-6 mt-4">
          <p className="text-4xl mb-2">🎭</p>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">set your vibe</h1>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
            this username deletes in {HOURS} hours or you can change it anytime
          </p>
        </div>

        <div className={`flex items-center bg-slate-950 border rounded-2xl px-4 py-3 transition-all mb-2 ${error ? "border-red-500/50" : "border-slate-800 focus-within:border-blue-500/60"}`}>
          <span className="text-blue-400 font-black mr-2 text-sm">@</span>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value.replace(/[^a-zA-Z0-9_]/g, '')); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && tryUsername(name)}
            placeholder="username"
            maxLength={20}
            autoFocus
            className="flex-1 bg-transparent text-slate-100 text-sm font-semibold outline-none placeholder-slate-700"
          />
        </div>
        {error && <p className="text-red-400 text-xs mb-2 ml-1">{error}</p>}

        <p className="text-[11px] text-slate-500 mb-2 mt-4 font-semibold uppercase tracking-wider">✨ suggestions</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {EXAMPLES.map((n) => (
            <button
              key={n}
              onClick={() => { setName(n); setError(""); }}
              className={`text-xs font-bold px-3 py-2 rounded-full border transition-all active:scale-95 ${
                name === n
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-slate-950 text-slate-400 border-slate-800"
              }`}
            >
              @{n}
            </button>
          ))}
        </div>

        <button
          onClick={() => tryUsername(name)}
          disabled={loading || !name.trim()}
          className="w-full py-3.5 rounded-2xl font-black text-sm text-white transition-all active:scale-95 disabled:opacity-30"
          style={{ background: "linear-gradient(135deg, #2563eb, #0284c7)" }}
        >
          {loading ? "checking…" : "save username →"}
        </button>
      </div>
    </div>
  );
}

// ─── MAIN CHAT ROOM COMPONENT ─────────────────────────────────────────────────
export default function Chat() {
  const navigate = useNavigate();
  const [username, setUsername] = useState(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // 3-dot menu state
  const [openMenuId, setOpenMenuId] = useState(null);

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const bottomRef = useRef();
  const inputRef = useRef();
  const menuRef = useRef();

  const batch = JSON.parse(localStorage.getItem("selectedBatch") || "null");
  const currentUser = JSON.parse(localStorage.getItem("anon_user") || "null");
  const batchId = batch?.batchId;
  const batchName = batch?.batchName || "Batch Chat";

  // Close menu on outside tap
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  // Restore session
  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const session = JSON.parse(raw);
      if (Date.now() < session.expiresAt) {
        setUsername(session.username);
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!username || !batchId) return;
    fetchMessages();

    const ch = supabase
      .channel(`batch-chat-${batchId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public",
        table: "chat_messages",
        filter: `batch_id=eq.${batchId}`,
      }, (p) => {
        setMessages((prev) => [...prev, p.new]);
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public",
        table: "chat_messages",
        filter: `batch_id=eq.${batchId}`,
      }, (p) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === p.new.id ? p.new : m))
        );
      })
      .on("postgres_changes", {
        event: "DELETE", schema: "public",
        table: "chat_messages",
        filter: `batch_id=eq.${batchId}`,
      }, (p) => {
        setMessages((prev) => prev.filter((m) => m.id !== p.old.id));
      })
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [username, batchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("id, username, message, edited")
      .eq("batch_id", batchId)
      .order("created_at", { ascending: true })
      .limit(100);
    setMessages(data || []);
  };

  // ── SEND ──
  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    // Blur input so keyboard closes on mobile
    inputRef.current?.blur();
    await supabase.from("chat_messages").insert({
      message: text.trim(),
      username,
      batch_id: batchId,
      user_id: currentUser?.id || null,
      type: "text",
    });
    setText("");
    setSending(false);
  };

  // ── EDIT ──
  const startEdit = (msg) => {
    setOpenMenuId(null);
    setEditingId(msg.id);
    setEditText(msg.message);
  };

  const saveEdit = async (id) => {
    if (!editText.trim()) return;
    await supabase
      .from("chat_messages")
      .update({ message: editText.trim(), edited: true })
      .eq("id", id);
    setEditingId(null);
    setEditText("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  // ── DELETE ──
  const deleteMsg = async (id) => {
    setOpenMenuId(null);
    const confirmed = window.confirm("Delete this message? This can't be undone.");
    if (!confirmed) return;
    await supabase.from("chat_messages").delete().eq("id", id);
  };

  return (
    <div className="fixed inset-0 bg-[#090d16] text-slate-100 flex flex-col overflow-hidden overscroll-none">

      {(!username || isEditingUsername) && (
        <UsernamePicker
          onDone={(name) => { setUsername(name); setIsEditingUsername(false); }}
          currentUsername={username}
          onCancel={() => setIsEditingUsername(false)}
        />
      )}

      {/* HEADER */}
      <header className="flex-shrink-0 h-16 border-b border-slate-900/60 px-4 flex items-center gap-3 bg-[#090d16]/90 backdrop-blur-md z-10">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-slate-100 p-2.5 rounded-2xl bg-slate-900 border border-slate-800/80 transition active:scale-90 shadow-md flex items-center justify-center flex-shrink-0"
        >
          <ArrowLeft size={18} />
        </button>

        <div
          className="flex-1 min-w-0 border border-blue-500/30 rounded-2xl px-4 h-11 flex items-center shadow-[0_0_15px_rgba(37,99,235,0.2)] animate-gradient-xy bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600"
          style={{ backgroundSize: "200% 200%" }}
        >
          <p className="font-extrabold text-white text-sm truncate uppercase tracking-wider drop-shadow-sm">
            {batchName}
          </p>
        </div>

        {username && (
          <button
            onClick={() => setIsEditingUsername(true)}
            className="flex items-center gap-2 px-3.5 h-11 rounded-2xl border border-slate-800 bg-slate-900 active:scale-95 transition flex-shrink-0 shadow-md"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <span className="text-slate-200 font-bold text-xs max-w-[80px] truncate">@{username}</span>
          </button>
        )}
      </header>

      {/* MESSAGES */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-3xl w-full mx-auto overscroll-contain">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-4xl mb-2">💬</p>
            <p className="font-bold text-slate-400">No messages yet</p>
            <p className="text-slate-600 text-sm">Send a message to start the conversation</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.username === username;
            const isEditing = editingId === msg.id;
            const menuOpen = openMenuId === msg.id;

            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`flex items-end gap-1.5 max-w-[85%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>

                  {/* 3-DOT MENU — only on own messages, pinned to top */}
                  {isMe && !isEditing && (
                    <div className="relative flex-shrink-0 self-start mt-0" ref={menuOpen ? menuRef : null}>
                      <button
                        onClick={() => setOpenMenuId(menuOpen ? null : msg.id)}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition active:scale-90"
                      >
                        <MoreVertical size={15} />
                      </button>

                      {menuOpen && (
                        <div
                          ref={menuRef}
                          className="absolute top-full right-0 mt-1 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden z-30 min-w-[120px]"
                        >
                          <button
                            onClick={() => startEdit(msg)}
                            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 transition"
                          >
                            <Pencil size={13} className="text-blue-400" />
                            Edit
                          </button>
                          <div className="h-px bg-slate-700" />
                          <button
                            onClick={() => deleteMsg(msg.id)}
                            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-slate-700 transition"
                          >
                            <Trash2 size={13} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* BUBBLE */}
                  <div className="flex flex-col space-y-1">
                    {!isMe && (
                      <p className="text-[10px] font-bold text-sky-400/90 px-1 text-left">
                        @{msg.username}
                      </p>
                    )}

                    {isEditing ? (
                      /* EDIT MODE */
                      <div className="bg-[#1e293b] border border-blue-500/50 rounded-3xl px-3 py-2.5 flex items-center gap-2 min-w-[180px]">
                        <input
                          autoFocus
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) saveEdit(msg.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="flex-1 bg-transparent text-sm text-slate-100 outline-none"
                        />
                        <button onClick={() => saveEdit(msg.id)} className="text-emerald-400 hover:text-emerald-300 active:scale-90 transition p-0.5">
                          <Check size={15} />
                        </button>
                        <button onClick={cancelEdit} className="text-slate-500 hover:text-slate-300 active:scale-90 transition p-0.5">
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      /* NORMAL BUBBLE */
                      <div
                        className={`px-4 py-2.5 rounded-3xl text-sm leading-relaxed shadow-sm break-words max-w-full ${
                          isMe ? "text-white font-medium" : "bg-[#1e293b] text-slate-100 border border-slate-800/40"
                        }`}
                        style={isMe ? { background: "linear-gradient(135deg, #2563eb, #0284c7)" } : {}}
                      >
                        {msg.message}
                        {msg.edited && (
                          <span className="ml-1.5 text-[10px] opacity-60 font-normal">edited</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </main>

      {/* FOOTER */}
      <div
        className="flex-shrink-0 border-t border-slate-900/60 px-3 py-3 flex items-center gap-2 bg-[#090d16] z-10"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex-1 flex items-center bg-[#0f172a] border border-slate-800 rounded-2xl px-4 py-2.5 gap-2 focus-within:border-blue-500/50 transition min-w-0">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder={username ? `message as @${username}…` : "Type a message..."}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-700 outline-none w-full min-w-0"
          />
        </div>
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white disabled:opacity-20 active:scale-90 transition flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #2563eb, #0284c7)" }}
        >
          <Send size={16} />
        </button>
      </div>

    </div>
  );
}

