import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Send } from "lucide-react";

const SESSION_KEY = "chat_anon_session";
const HOURS = 10;
const EXAMPLES = ["truth_teller", "Batman", "princess", "night_viber"];

// ─── Username Picker Component ────────────────────────────────────────────────
function UsernamePicker({ onDone, currentUsername, onCancel }) {
  const [name, setName] = useState(currentUsername || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const tryUsername = async (raw) => {
    let clean = raw.trim();
    if (!clean) { setError("enter a username"); return; }
    if (clean.length < 2) { setError("at least 2 characters"); return; }

    setLoading(true);

    // Scan recent messages in the last 10 hours for name tracking duplicate checks
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
    <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center px-6 relative">
      
      {/* Absolute top-left navigation back control override */}
      {currentUsername && (
        <button 
    onClick={() => navigate(-1)} 
    className="text-slate-400 hover:text-slate-100 p-2.5 rounded-2xl bg-slate-900 border border-slate-800/80 transition active:scale-90 shadow-md shadow-black/20 flex items-center justify-center"
  >
    <ArrowLeft size={18} />
  </button>
      )}

      {/* Picker Modal Display */}
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-2xl shadow-blue-500/5">
        <div className="text-center mb-6">
          <p className="text-4xl mb-2">🎭</p>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">pick your vibe</h1>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
            this username deletes in {HOURS} hours or you can change it anytime
          </p>
        </div>

        {/* Input Text Box */}
        <div className={`flex items-center bg-slate-950 border rounded-2xl px-4 py-3 transition-all mb-2 ${error ? "border-red-500/50" : "border-slate-800 focus-within:border-blue-500/60"}`}>
          <span className="text-blue-400 font-black mr-2 text-sm">@</span>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value.replace(/[^a-zA-Z0-9_]/g, '')); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && tryUsername(name)}
            placeholder="yourusername"
            maxLength={20}
            autoFocus
            className="flex-1 bg-transparent text-slate-100 text-sm font-semibold outline-none placeholder-slate-700"
          />
        </div>
        {error && <p className="text-red-400 text-xs mb-2 ml-1">{error}</p>}

        {/* Suggestions Quick-Select Fields */}
        <p className="text-[11px] text-slate-500 mb-2 mt-4 font-semibold uppercase tracking-wider">✨ suggestions</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {EXAMPLES.map((n) => (
            <button
              key={n}
              onClick={() => { setName(n); setError(""); }}
              className={`text-xs font-bold px-3 py-2 rounded-full border transition-all active:scale-95 ${
                name === n
                  ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              @{n}
            </button>
          ))}
        </div>

        {/* Action Button */}
        <button
          onClick={() => tryUsername(name)}
          disabled={loading || !name.trim()}
          className="w-full py-3.5 rounded-2xl font-black text-sm text-white transition-all active:scale-95 disabled:opacity-30 shadow-xl shadow-blue-600/10"
          style={{ background: "linear-gradient(135deg, #2563eb, #0284c7)" }}
        >
          {loading ? "checking…" : "enter chat →"}
        </button>

        <p className="text-center text-[11px] text-slate-600 mt-3">
          if your name is taken, we'll add _01 automatically
        </p>
      </div>
    </div>
  );
}

// ─── Main Chat Room Component ─────────────────────────────────────────────────
export default function Chat() {
  const navigate = useNavigate();
  const [username, setUsername] = useState(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef();
  const inputRef = useRef();

  const batch = JSON.parse(localStorage.getItem("selectedBatch") || "null");
  const currentUser = JSON.parse(localStorage.getItem("anon_user") || "null");
  const batchId = batch?.batchId;
  const batchName = batch?.batchName || "Batch Chat";

  // Check storage token validation on mount
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

  // Fetch messages and establish secure real-time listener subscription loop
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
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [username, batchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("id, username, message, created_at")
      .eq("batch_id", batchId)
      .order("created_at", { ascending: true })
      .limit(100);
    setMessages(data || []);
  };

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    await supabase.from("chat_messages").insert({
      message: text.trim(),
      username,
      batch_id: batchId,
      user_id: currentUser?.id || null,
      type: "text",
    });
    setText("");
    setSending(false);
    inputRef.current?.focus();
  };

  const handleUsernameDone = (newUsername) => {
    setUsername(newUsername);
    setIsEditingUsername(false);
  };

  if (!username || isEditingUsername) {
    return (
      <UsernamePicker 
        onDone={handleUsernameDone} 
        currentUsername={username} 
        onCancel={() => setIsEditingUsername(false)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">

      {/* Header Layout */}
      <header className="sticky top-0 z-20 border-b border-slate-900 px-4 h-14 flex items-center gap-3 backdrop-blur-md bg-[#090d16]/80">
        <button 
    onClick={() => navigate(-1)} 
    className="text-slate-400 hover:text-slate-100 p-2.5 rounded-2xl bg-slate-900 border border-slate-800/80 transition active:scale-90 shadow-md shadow-black/20 flex items-center justify-center"
  >
    <ArrowLeft size={18} />
  </button>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-200 text-sm truncate">{batchName}</p>
          <p className="text-[11px] text-slate-500">anonymous batch chat</p>
        </div>

        {/* Identity Token Chip */}
        <button
          onClick={() => setIsEditingUsername(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 active:scale-95 transition hover:bg-blue-500/10"
        >
          <span className="text-blue-400 font-bold text-[11px]">@{username}</span>
          <span className="text-[9px] text-slate-500 font-medium">change</span>
        </button>
      </header>

      {/* Messages Stream Feed Panel */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-3xl w-full mx-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-center">
            <p className="text-4xl">💬</p>
            <p className="font-bold text-slate-400">no messages yet</p>
            <p className="text-slate-600 text-sm">start the harate as @{username}</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.username === username;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`flex flex-col max-w-[78%] ${isMe ? "items-end" : "items-start"}`}>
                  
                  {/* Alias Header Handles for incoming messages */}
                  {!isMe && (
                    <p className="text-[10px] font-bold text-sky-400 mb-1 ml-1.5">@{msg.username}</p>
                  )}

                  {/* Fully-Rounded Symmetrical Sized Chat Pill Bubbles */}
                  <div
                    className={`px-4 py-2.5 rounded-3xl text-sm leading-relaxed shadow-sm ${
                      isMe
                        ? "text-white font-medium"
                        : "bg-[#1e293b] text-slate-100 border border-slate-800/40"
                    }`}
                    style={isMe ? { background: "linear-gradient(135deg, #2563eb, #0284c7)" } : {}}
                  >
                    {msg.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </main>

      {/* Message Text Input Footer Section */}
      <div
        className="border-t border-slate-900 px-3 py-3 flex items-center gap-2 bg-[#090d16]"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex-1 flex items-center bg-[#0f172a] border border-slate-800 rounded-2xl px-4 py-2.5 gap-2 focus-within:border-blue-500/50 transition">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder={`message as @${username}…`}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-700 outline-none"
          />
        </div>
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white disabled:opacity-20 active:scale-90 transition flex-shrink-0 shadow-lg shadow-blue-600/5"
          style={{ background: "linear-gradient(135deg, #2563eb, #0284c7)" }}
        >
          <Send size={16} />
        </button>
      </div>

    </div>
  );
}

