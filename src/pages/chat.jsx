import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Send, MoreVertical, Pencil, Trash2, Check, X, Reply, Plus, Image, Mic, Play, Pause } from "lucide-react";

const SESSION_KEY = "chat_anon_session";
const HOURS = 10;
const EXAMPLES = ["truth_teller", "Batman", "princess", "night_viber"];
const SWIPE_THRESHOLD = 60; // px to trigger reply
const GIPHY_API_KEY = "4O3KmphtX0AmuqeXjq61mvOdzYJWe8gN";
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

//  USERNAME POPUP 
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
      .from("chat_messages").select("username")
      .ilike("username", `${clean}%`).gte("created_at", since);
    const taken = data?.map((d) => d.username.toLowerCase()) || [];
    let finalName = clean;
    if (taken.includes(clean.toLowerCase())) {
      let i = 1;
      while (taken.includes(`${clean.toLowerCase()}_0${i}`)) i++;
      finalName = `${clean}_0${i}`;
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      username: finalName,
      expiresAt: Date.now() + HOURS * 3600 * 1000,
    }));
    setLoading(false);
    onDone(finalName);
  };

  return (
    <div className="fixed inset-0 bg-[#090d16]/80 backdrop-blur-sm flex flex-col items-center justify-center px-6 z-50">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-2xl relative">
        {currentUsername && (
          <button onClick={onCancel}
            className="absolute top-6 left-6 text-slate-400 hover:text-slate-100 p-2.5 rounded-2xl bg-slate-950 border border-slate-800 transition active:scale-90 flex items-center justify-center">
            <ArrowLeft size={16} />
          </button>
        )}
        <div className="text-center mb-6 mt-4">
          <p className="text-4xl mb-2"></p>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">set your vibe</h1>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
            this username deletes in {HOURS} hours or you can change it anytime
          </p>
        </div>
        <div className={`flex items-center bg-slate-950 border rounded-2xl px-4 py-3 transition-all mb-2 ${error ? "border-red-500/50" : "border-slate-800 focus-within:border-blue-500/60"}`}>
          <span className="text-blue-400 font-black mr-2 text-sm">@</span>
          <input value={name}
            onChange={(e) => { setName(e.target.value.replace(/[^a-zA-Z0-9_]/g, '')); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && tryUsername(name)}
            placeholder="username" maxLength={20} autoFocus
            className="flex-1 bg-transparent text-slate-100 text-sm font-semibold outline-none placeholder-slate-700" />
        </div>
        {error && <p className="text-red-400 text-xs mb-2 ml-1">{error}</p>}
        <p className="text-[11px] text-slate-500 mb-2 mt-4 font-semibold uppercase tracking-wider"> suggestions</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {EXAMPLES.map((n) => (
            <button key={n} onClick={() => { setName(n); setError(""); }}
              className={`text-xs font-bold px-3 py-2 rounded-full border transition-all active:scale-95 ${name === n ? "bg-blue-600 text-white border-blue-500" : "bg-slate-950 text-slate-400 border-slate-800"}`}>
              @{n}
            </button>
          ))}
        </div>
        <button onClick={() => tryUsername(name)} disabled={loading || !name.trim()}
          className="w-full py-3.5 rounded-2xl font-black text-sm text-white transition-all active:scale-95 disabled:opacity-30"
          style={{ background: "linear-gradient(135deg, #2563eb, #0284c7)" }}>
          {loading ? "checking" : "save username "}
        </button>
      </div>
    </div>
  );
}

//  SWIPEABLE MESSAGE ROW 
function SwipeableMessage({ msg, isMe, children, onReply, msgRef, highlighted }) {
  const [dragX, setDragX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [triggered, setTriggered] = useState(false);
const [showTime, setShowTime] = useState(false);
  const startX = useRef(null);
  const startY = useRef(null);
  const isLocked = useRef(false); // locked to horizontal drag

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isLocked.current = false;
    setTriggered(false);
  };

  const handleTouchMove = (e) => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // On first move, decide axis lock
    if (!isLocked.current) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        // Vertical scroll  abort swipe
        startX.current = null;
        return;
      }
      isLocked.current = true;
    }

    // For received msgs: swipe right (dx > 0). For sent: swipe left (dx < 0)
    const direction = isMe ? -1 : 1;
    const raw = dx * direction;
const leftMove = dx * -1;
if (leftMove > 20) {
  setShowTime(true);
} else {
  setShowTime(false);
}
    if (raw < 0) return; // wrong direction


    e.preventDefault(); // stop scroll only when swiping horizontally
    setSwiping(true);

    // Rubber-band resistance after threshold
    const clamped = raw < SWIPE_THRESHOLD
      ? raw
      : SWIPE_THRESHOLD + (raw - SWIPE_THRESHOLD) * 0.2;

    setDragX(clamped * direction);

    if (raw >= SWIPE_THRESHOLD && !triggered) {
      setTriggered(true);
      // Haptic if available
      if (navigator.vibrate) navigator.vibrate(30);
    }
  };

  const handleTouchEnd = () => {
    if (triggered) onReply(msg);
    setSwiping(false);
    setTriggered(false);
    setDragX(0);
    setShowTime(false); // ← add this
    startX.current = null;
    isLocked.current = false;
  };

  const replyIconOpacity = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1);
  const replyIconScale = 0.6 + replyIconOpacity * 0.4;

  return (
    <div
      ref={msgRef}
      className="relative rounded-2xl transition-colors duration-500"
      style={{ backgroundColor: highlighted ? "rgba(56, 189, 248, 0.15)" : "transparent" }}
    >
      {/* Reply icon revealed behind  clipped by its own wrapper */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-y-0 flex items-center"
        style={{
          [isMe ? "left" : "right"]: 0,
          opacity: replyIconOpacity,
          transform: `scale(${replyIconScale})`,
          transition: swiping ? "none" : "opacity 0.2s, transform 0.2s",
          padding: "0 12px",
        }}
      >
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
          <Reply size={14} className="text-sky-400" style={{ transform: isMe ? "scaleX(-1)" : "none" }} />
        </div>
      </div>
      </div>

      {/* Sliding content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: swiping ? "none" : "transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        {children}
      </div>
     {showTime && (
  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 font-medium pointer-events-none">
    {timeAgo(msg.created_at)}
  </div>
)}
    </div>
  );
}

//  GIF SHEET — search bar + grid using Giphy API 
function GifSheet({ onClose, onPick }) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef();

  useEffect(() => {
    fetchTrending();
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const fetchTrending = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=pg-13`
      );
      const json = await res.json();
      setGifs(json.data || []);
    } catch (err) {
      console.error("Giphy trending fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const runSearch = async (text) => {
    if (!text.trim()) { fetchTrending(); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(text.trim())}&limit=24&rating=pg-13`
      );
      const json = await res.json();
      setGifs(json.data || []);
    } catch (err) {
      console.error("Giphy search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    runSearch(val);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end"
      style={{ backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full bg-[#0f172a] rounded-t-3xl flex flex-col shadow-2xl max-w-lg mx-auto border-t border-slate-800"
        style={{ maxHeight: "75vh", animation: "slideUp 0.3s cubic-bezier(0.32,0.72,0,1)" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
          <p className="font-bold text-slate-200 text-sm">Send a GIF</p>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition">
            <X size={20} />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-4 py-3">
          <div className="flex items-center bg-slate-800 rounded-full px-4 py-2 gap-2">
            <input
              ref={inputRef}
              value={query}
              onChange={handleChange}
              placeholder="Search GIFs..."
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-slate-700 border-t-violet-400 rounded-full animate-spin" />
            </div>
          ) : gifs.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-12">No GIFs found</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {gifs.map((g) => (
                <button
                  key={g.id}
                  onClick={() => onPick(g.images.fixed_width.url)}
                  className="rounded-xl overflow-hidden bg-slate-800 active:scale-95 transition aspect-square"
                >
                  <img
                    src={g.images.fixed_width_small.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

//  MAIN CHAT COMPONENT 
export default function Chat() {
   const navigate = useNavigate();
  const [username, setUsername] = useState(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [replyTo, setReplyTo] = useState(null); // { id, username, message }
  const [attachOpen, setAttachOpen] = useState(false);
  const [showGifSheet, setShowGifSheet] = useState(false);

  // Photo upload
  const [pendingPhoto, setPendingPhoto] = useState(null); // { file, previewUrl }
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef();

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [waveLevels, setWaveLevels] = useState(Array(24).fill(4));
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const audioStreamRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const [uploadingVoice, setUploadingVoice] = useState(false);

  // Playback of voice messages in chat
  const [playingId, setPlayingId] = useState(null);
  const audioElRef = useRef(null);

  const bottomRef = useRef();
  const messageRefs = useRef({});
  const [highlightedId, setHighlightedId] = useState(null);
  const inputRef = useRef();
  const menuRef = useRef();

  const batch = JSON.parse(localStorage.getItem("selectedBatch") || "null");
  const currentUser = JSON.parse(localStorage.getItem("anon_user") || "null");
  const batchId = batch?.batchId;
  const batchName = batch?.batchName || "Batch Chat";

  // Close menu on outside tap
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null);
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
      if (Date.now() < session.expiresAt) setUsername(session.username);
      else localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  // Realtime
  useEffect(() => {
    if (!username || !batchId) return;
    fetchMessages();
    const ch = supabase.channel(`batch-chat-${batchId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `batch_id=eq.${batchId}` },
        (p) => setMessages((prev) => [...prev, p.new]))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages", filter: `batch_id=eq.${batchId}` },
        (p) => setMessages((prev) => prev.map((m) => m.id === p.new.id ? p.new : m)))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages", filter: `batch_id=eq.${batchId}` },
        (p) => setMessages((prev) => prev.filter((m) => m.id !== p.old.id)))
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [username, batchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("id, username, message, edited, reply_to, media_url, voice_url, type, created_at")
      .eq("batch_id", batchId)
      .order("created_at", { ascending: true })
      .limit(100);
    setMessages(data || []);
  };

  // — AUTO-DELETE media older than 10 hours (storage files + db rows) —
  const cleanupOldMedia = async () => {
    if (!batchId) return;
    const cutoff = new Date(Date.now() - HOURS * 3600 * 1000).toISOString();

    const { data: stale } = await supabase
      .from("chat_messages")
      .select("id, type, media_url, voice_url")
      .eq("batch_id", batchId)
      .lt("created_at", cutoff)
      .in("type", ["image", "voice"]);

    if (!stale?.length) return;

    for (const row of stale) {
      try {
        if (row.type === "image" && row.media_url) {
          const path = row.media_url.split("/chat-images/")[1];
          if (path) await supabase.storage.from("chat-images").remove([path]);
        }
        if (row.type === "voice" && row.voice_url) {
          const path = row.voice_url.split("/chat-voices/")[1];
          if (path) await supabase.storage.from("chat-voices").remove([path]);
        }
      } catch (err) {
        console.error("Cleanup storage delete failed:", err);
      }
    }

    const ids = stale.map((r) => r.id);
    await supabase.from("chat_messages").delete().in("id", ids);
  };

  useEffect(() => {
    if (!batchId) return;
    cleanupOldMedia();
    const interval = setInterval(cleanupOldMedia, 30 * 60 * 1000); // every 30 min
    return () => clearInterval(interval);
  }, [batchId]);

  // Helper: find quoted message by id
  const getQuoted = (replyToId) => messages.find((m) => m.id === replyToId);

  const jumpToMessage = (msgId) => {
    const el = messageRefs.current[msgId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedId(msgId);
      setTimeout(() => setHighlightedId(null), 1500);
    }
  };

  const jumpAndPlayVoice = (msg) => {
    jumpToMessage(msg.id);
    if (msg.voice_url) {
      setTimeout(() => togglePlay(msg.id, msg.voice_url), 400);
    }
  };

  //  SEND 
  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    inputRef.current?.blur();
    await supabase.from("chat_messages").insert({
      message: text.trim(),
      username,
      batch_id: batchId,
      user_id: currentUser?.id || null,
      type: "text",
      reply_to: replyTo?.id || null,
    });
    setText("");
    setReplyTo(null);
    setSending(false);
    if (inputRef.current) inputRef.current.style.height = "auto";
  };

  // — PHOTO: pick from gallery —
  const openGallery = () => {
    setAttachOpen(false);
    fileInputRef.current?.click();
  };

  const handlePhotoSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setPendingPhoto({ file, previewUrl });
    e.target.value = ""; // allow re-selecting same file later
  };

  const cancelPhoto = () => {
    if (pendingPhoto?.previewUrl) URL.revokeObjectURL(pendingPhoto.previewUrl);
    setPendingPhoto(null);
  };

  const sendPhoto = async () => {
    if (!pendingPhoto || uploadingPhoto) return;
    setUploadingPhoto(true);
    try {
      const ext = pendingPhoto.file.name.split(".").pop() || "jpg";
      const path = `${batchId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("chat-images")
        .upload(path, pendingPhoto.file, { contentType: pendingPhoto.file.type });

      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(path);

      await supabase.from("chat_messages").insert({
        message: "",
        username,
        batch_id: batchId,
        user_id: currentUser?.id || null,
        type: "image",
        media_url: urlData.publicUrl,
        reply_to: replyTo?.id || null,
      });

      setReplyTo(null);
      cancelPhoto();
    } catch (err) {
      console.error("Photo send failed:", err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // — GIF: send directly (no upload needed, Giphy hosts it) —
  const sendGif = async (gifUrl) => {
    setShowGifSheet(false);
    try {
      await supabase.from("chat_messages").insert({
        message: "",
        username,
        batch_id: batchId,
        user_id: currentUser?.id || null,
        type: "gif",
        media_url: gifUrl,
        reply_to: replyTo?.id || null,
      });
      setReplyTo(null);
    } catch (err) {
      console.error("GIF send failed:", err);
    }
  };

     // — VOICE: record on hold —
  const startRecording = async () => {
    if (isRecording) return; // already recording, ignore duplicate triggers
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);

      // Waveform visualizer via AnalyserNode
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = { analyser, audioCtx };

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        const levels = Array.from({ length: 24 }, (_, i) => {
          const v = dataArray[i % dataArray.length] || 0;
          return Math.max(4, Math.min(28, (v / 255) * 28));
        });
        setWaveLevels(levels);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      console.error("Mic permission denied or failed:", err);
    }
  };

  const cleanupRecording = () => {
    clearInterval(recordTimerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    if (analyserRef.current?.audioCtx) {
      analyserRef.current.audioCtx.close();
      analyserRef.current = null;
    }
    setIsRecording(false);
    setRecordSeconds(0);
    setWaveLevels(Array(24).fill(4));
  };

  // Stop recording, returns a Blob via promise
  const stopRecordingAndGetBlob = () =>
    new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) { resolve(null); return; }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        resolve(blob);
      };
      recorder.stop();
    });

  // Cancel recording — user left/aborted, don't send
  const cancelRecording = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      await stopRecordingAndGetBlob();
    }
    cleanupRecording();
  };

  // Stop + upload + send — fires on release of hold
  const finishAndSendRecording = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
      cleanupRecording();
      return;
    }
    const blob = await stopRecordingAndGetBlob();
    cleanupRecording();
    if (!blob || blob.size === 0) return;

    setUploadingVoice(true);
    try {
      const path = `${batchId}/${Date.now()}_${Math.random().toString(36).slice(2)}.webm`;
      const { error: upErr } = await supabase.storage
        .from("chat-voices")
        .upload(path, blob, { contentType: "audio/webm" });

      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("chat-voices").getPublicUrl(path);

      await supabase.from("chat_messages").insert({
        message: "",
        username,
        batch_id: batchId,
        user_id: currentUser?.id || null,
        type: "voice",
        voice_url: urlData.publicUrl,
        reply_to: replyTo?.id || null,
      });

      setReplyTo(null);
    } catch (err) {
      console.error("Voice send failed:", err);
    } finally {
      setUploadingVoice(false);
    }
  };

  // Stop recording if user navigates away mid-recording
  useEffect(() => {
    return () => {
      if (isRecording) cancelRecording();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const replyPreviewLabel = (r) => {
    if (!r) return "";
    if (r.type === "image") return "📷 Photo";
    if (r.type === "voice") return "🎤 Voice message";
    if (r.type === "gif") return "🎞️ GIF";
    return r.message;
  };

  const formatRecTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const r = (s % 60).toString().padStart(2, "0");
    return `${m}:${r}`;
  };

  const togglePlay = (msgId, url) => {
    if (playingId === msgId) {
      audioElRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioElRef.current) audioElRef.current.pause();
    const audio = new Audio(url);
    audioElRef.current = audio;
    audio.play();
    setPlayingId(msgId);
    audio.onended = () => setPlayingId(null);
  };

  //  EDIT 
  const originalTextRef = useRef("");
  const startEdit = (msg) => {
    setOpenMenuId(null);
    setEditingId(msg.id);
    setEditText(msg.message);
    originalTextRef.current = msg.message;
  };
  const saveEdit = async (id) => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    const changed = trimmed !== originalTextRef.current.trim();
    await supabase.from("chat_messages").update({
      message: trimmed,
      ...(changed ? { edited: true } : {}),
    }).eq("id", id);
    setEditingId(null);
    setEditText("");
  };
  const cancelEdit = () => { setEditingId(null); setEditText(""); };

  //  DELETE 
  const deleteMsg = async (id) => {
    setOpenMenuId(null);
    if (!window.confirm("Delete this message? This can't be undone.")) return;
    await supabase.from("chat_messages").delete().eq("id", id);
  };

  //  REPLY 
  const handleReply = useCallback((msg) => {
    setReplyTo({ id: msg.id, username: msg.username, message: msg.message, type: msg.type });
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

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
        <button onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-slate-100 p-2.5 rounded-2xl bg-slate-900 border border-slate-800/80 transition active:scale-90 shadow-md flex items-center justify-center flex-shrink-0">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0 border border-blue-500/30 rounded-2xl px-4 h-11 flex items-center shadow-[0_0_15px_rgba(37,99,235,0.2)] bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600">
          <p className="font-extrabold text-white text-sm truncate uppercase tracking-wider drop-shadow-sm">{batchName}</p>
        </div>
        {username && (
          <button onClick={() => setIsEditingUsername(true)}
            className="flex items-center gap-2 px-3.5 h-11 rounded-2xl border border-slate-800 bg-slate-900 active:scale-95 transition flex-shrink-0 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <span className="text-slate-200 font-bold text-xs max-w-[80px] truncate">@{username}</span>
          </button>
        )}
      </header>

      {/* MESSAGES */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-3xl w-full mx-auto overscroll-contain">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-4xl mb-2"></p>
            <p className="font-bold text-slate-400">loading...</p>
            <p className="text-slate-600 text-sm">messages auto delete after 10 hour</p>
      <p className="text-slate-600 text-sm">swipe slightly to left to see timings of msgs</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.username === username;
            const isEditing = editingId === msg.id;
            const menuOpen = openMenuId === msg.id;
            const quoted = msg.reply_to ? getQuoted(msg.reply_to) : null;



            return (
              <SwipeableMessage
                key={msg.id}
                msg={msg}
                isMe={isMe}
                onReply={handleReply}
                msgRef={(el) => (messageRefs.current[msg.id] = el)}
                highlighted={highlightedId === msg.id}
              >
                <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`flex items-start gap-1.5 max-w-[85%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>

                    {/* 3-DOT  own messages only, pinned top */}
                    {isMe && !isEditing && (
                      <div className="relative flex-shrink-0 self-start" ref={menuOpen ? menuRef : null}>
                        <button onClick={() => setOpenMenuId(menuOpen ? null : msg.id)}
                          className="p-1.5 rounded-xl text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition active:scale-90">
                          <MoreVertical size={15} />
                        </button>
                        {menuOpen && (
                          <div ref={menuRef}
                            className="absolute top-full right-0 mt-1 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden z-50 min-w-[120px]">
                            {msg.type !== "image" && msg.type !== "voice" && msg.type !== "gif" && (
                              <>
                                <button onClick={() => startEdit(msg)}
                                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 transition">
                                  <Pencil size={13} className="text-blue-400" /> Edit
                                </button>
                                <div className="h-px bg-slate-700" />
                              </>
                            )}
                            <button onClick={() => deleteMsg(msg.id)}
                              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-slate-700 transition">
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
    {/* BUBBLE COLUMN */}
                    <div className="flex flex-col space-y-1 min-w-0">
                      {!isMe && (
                        <p className="text-[10px] font-bold text-sky-400/90 px-1">@{msg.username}</p>
                      )}

                      {/* QUOTED PREVIEW */}
                      {quoted && (
                        <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-0.5`}>
                          <button
                            onClick={() =>
                              quoted.type === "voice"
                                ? jumpAndPlayVoice(quoted)
                                : jumpToMessage(quoted.id)
                            }
                            className={`flex items-stretch max-w-full rounded-2xl overflow-hidden border transition active:scale-[0.98] ${isMe ? "border-blue-400/30 bg-blue-950/40" : "border-slate-700 bg-slate-800/60"}`}
                          >
                            <div className={`w-1 flex-shrink-0 ${isMe ? "bg-blue-400" : "bg-sky-500"}`} />

                            {/* Thumbnail for image/gif replies */}
                            {(quoted.type === "image" || quoted.type === "gif") && quoted.media_url && (
                              <img
                                src={quoted.media_url}
                                alt=""
                                className="w-10 h-10 object-cover flex-shrink-0"
                              />
                            )}

                            {/* Play icon for voice replies */}
                            {quoted.type === "voice" && (
                              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                                <Play size={14} className={isMe ? "text-blue-300" : "text-sky-400"} />
                              </div>
                            )}

                            <div className="px-3 py-2 min-w-0">
                              <p className={`text-[10px] font-bold mb-0.5 ${isMe ? "text-blue-300" : "text-sky-400"}`}>
                                @{quoted.username}
                              </p>
                              <p className="text-xs text-slate-400 truncate max-w-[160px]">{replyPreviewLabel(quoted)}</p>
                            </div>
                          </button>
                        </div>
                      )}

                      {/* EDIT / IMAGE / VOICE / TEXT BUBBLE */}
                      {isEditing ? (
                        <div className="w-full max-w-[260px] bg-[#1e293b] border border-blue-500/50 rounded-3xl px-3 py-2.5 flex items-center gap-2">
                          <input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) saveEdit(msg.id); if (e.key === "Escape") cancelEdit(); }}
                            className="flex-1 min-w-0 bg-transparent text-sm text-slate-100 outline-none" />
                          <button onClick={() => saveEdit(msg.id)} className="text-emerald-400 hover:text-emerald-300 active:scale-90 transition p-0.5 flex-shrink-0"><Check size={15} /></button>
                          <button onClick={cancelEdit} className="text-slate-500 hover:text-slate-300 active:scale-90 transition p-0.5 flex-shrink-0"><X size={15} /></button>
                        </div>
                      ) : (msg.type === "image" || msg.type === "gif") && msg.media_url ? (
                        <div className={`rounded-3xl overflow-hidden border max-w-[220px] ${isMe ? "border-blue-500/30" : "border-slate-800/40"}`}>
                          <img
                            src={msg.media_url}
                            alt=""
                            className="w-full h-auto block"
                            onClick={() => window.open(msg.media_url, "_blank")}
                          />
                        </div>
                      ) : msg.type === "voice" && msg.voice_url ? (
                        <button
                          onClick={() => togglePlay(msg.id, msg.voice_url)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-3xl shadow-sm min-w-[180px] transition ${isMe ? "text-white" : "bg-[#1e293b] text-slate-100 border border-slate-800/40"}`}
                          style={isMe ? { background: "linear-gradient(135deg, #2563eb, #0284c7)" } : {}}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isMe ? "bg-white/20" : "bg-blue-500/20"}`}>
                            {playingId === msg.id ? <Pause size={14} /> : <Play size={14} />}
                          </div>
                          {/* static waveform bars look */}
                          <div className="flex items-center gap-0.5 flex-1">
                            {Array.from({ length: 18 }).map((_, i) => (
                              <div
                                key={i}
                                className={`w-0.5 rounded-full ${isMe ? "bg-white/60" : "bg-slate-500"}`}
                                style={{ height: 6 + ((i * 37) % 14) }}
                              />
                            ))}
                          </div>
                          <Mic size={13} className={isMe ? "text-white/70" : "text-slate-500"} />
                        </button>
                      ) : (
                        <div
                          className={`px-4 py-2.5 rounded-3xl text-sm leading-relaxed shadow-sm break-words ${isMe ? "text-white font-medium" : "bg-[#1e293b] text-slate-100 border border-slate-800/40"}`}
                          style={isMe ? { background: "linear-gradient(135deg, #2563eb, #0284c7)" } : {}}>
                          {msg.message}
                          {msg.edited && <span className="ml-1.5 text-[10px] opacity-60 font-normal">edited</span>}
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              </SwipeableMessage>
            );
          })
        )}
        <div ref={bottomRef} />
      </main>

      {/* REPLY PREVIEW BAR */}
      {replyTo && (
        <div className="flex-shrink-0 mx-3 mb-2 flex items-stretch bg-[#0f172a] border border-slate-700 rounded-2xl overflow-hidden">
          <div className="w-1 bg-sky-500 flex-shrink-0" />
          <div className="flex-1 px-3 py-2 min-w-0">
            <p className="text-[10px] font-bold text-sky-400 mb-0.5">replying to @{replyTo.username}</p>
            <p className="text-xs text-slate-400 truncate">{replyPreviewLabel(replyTo)}</p>
          </div>
          <button onClick={() => setReplyTo(null)}
            className="px-3 text-slate-500 hover:text-slate-300 transition active:scale-90 flex-shrink-0">
            <X size={15} />
          </button>
        </div>
      )}

{/* FOOTER */}
      <div className="flex-shrink-0 border-t border-slate-900/60 px-3 py-3 bg-[#090d16] z-10"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>

        {/* Hidden file input for gallery picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelected}
          className="hidden"
        />

        {/* PHOTO PREVIEW — confirm before sending */}
        {pendingPhoto && (
          <div className="flex items-center gap-3 mb-2.5 bg-[#0f172a] border border-slate-800 rounded-2xl p-2.5">
            <img src={pendingPhoto.previewUrl} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-200">Send this photo?</p>
              <p className="text-[11px] text-slate-500">{username}</p>
            </div>
            <button
              onClick={cancelPhoto}
              disabled={uploadingPhoto}
              className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 active:scale-90 transition flex-shrink-0"
            >
              <X size={15} />
            </button>
            <button
              onClick={sendPhoto}
              disabled={uploadingPhoto}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white active:scale-90 transition disabled:opacity-40 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #2563eb, #0284c7)" }}
            >
              {uploadingPhoto ? (
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Send size={14} />
              )}
            </button>
          </div>
        )}

        {/* Attachment row — shows above input when + is tapped */}
        {attachOpen && !isRecording && !pendingPhoto && (
          <div className="flex items-center gap-3 mb-2.5 px-1 animate-in fade-in duration-150">
            <button
              onClick={openGallery}
              className="flex flex-col items-center gap-1 active:scale-90 transition"
            >
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <Image size={18} className="text-emerald-400" />
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">Photo</span>
            </button>
       <button
onClick={() => { navigate('/gamelist'); setAttachOpen(false); }}
  className="flex flex-col items-center gap-1 active:scale-90 transition"
>
  <div className="w-11 h-11 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
    <span className="text-xl">🎮</span>
  </div>
  <span className="text-[10px] text-slate-500 font-semibold">Games</span>
</button>

            <button
              onClick={() => { setShowGifSheet(true); setAttachOpen(false); }}
              className="flex flex-col items-center gap-1 active:scale-90 transition"
            >
              <div className="w-11 h-11 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                <span className="text-[10px] font-black text-violet-400">GIF</span>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">Gifs</span>
            </button>
          </div>
        )}

        {/* INPUT ROW — entire row replaced by waveform bar while recording */}
        {!pendingPhoto && (
          isRecording ? (
            /* — RECORDING WAVE BAR replaces whole input row — */
            <div className="flex items-center gap-2 w-full">
              <div
                className="flex-1 flex items-center gap-3 rounded-2xl px-4 py-3 select-none"
                style={{ background: "linear-gradient(135deg, #2563eb, #0284c7)" }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse flex-shrink-0" />
                <span className="text-white text-xs font-bold flex-shrink-0 tabular-nums">
                  {formatRecTime(recordSeconds)}
                </span>
                <div className="flex items-center gap-[2px] flex-1 h-7 overflow-hidden">
                  {waveLevels.map((h, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-white/80 flex-shrink-0 transition-all duration-75"
                      style={{ height: `${h}px` }}
                    />
                  ))}
                </div>
                <button onClick={cancelRecording} className="text-white/70 hover:text-white active:scale-90 transition flex-shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Tap this to stop + send */}
              <button
                onClick={finishAndSendRecording}
                disabled={uploadingVoice}
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white active:scale-90 transition flex-shrink-0 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #2563eb, #0284c7)" }}
              >
                {uploadingVoice ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1 flex items-end bg-[#0f172a] border border-slate-800 rounded-2xl pl-2 pr-2 py-2 gap-2 focus-within:border-blue-500/50 transition min-w-0">

                {/* + icon, left side */}
                {!attachOpen && text.trim() === "" && (
                  <button
                    onClick={() => setAttachOpen(true)}
                    className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 active:scale-90 transition self-end"
                  >
                    <Plus size={16} />
                  </button>
                )}
                {attachOpen && (
                  <button
                    onClick={() => setAttachOpen(false)}
                    className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 active:scale-90 transition self-end"
                  >
                    <X size={16} />
                  </button>
                )}

                <textarea
                  ref={inputRef}
                  value={text}
                  rows={1}
                  onChange={(e) => {
                    setText(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  onFocus={() => setAttachOpen(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={username ? `message as @${username}...` : "Type a message..."}
                  className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-700 outline-none w-full min-w-0 resize-none leading-relaxed py-1.5"
                  style={{ maxHeight: 120 }}
                />
              </div>

              {/* Right button: Send (typing) OR Mic (tap to start) OR Send (tap to stop+send) */}
              {text.trim() ? (
                <button onClick={send} disabled={sending}
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white disabled:opacity-20 active:scale-90 transition flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #2563eb, #0284c7)" }}>
                  <Send size={16} />
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white active:scale-90 transition flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #2563eb, #0284c7)" }}
                >
                  <Mic size={17} />
                </button>
              )}
            </div>
          )
        )}
      </div>

      {showGifSheet && (
        <GifSheet
          onClose={() => setShowGifSheet(false)}
          onPick={sendGif}
        />
      )}

    </div>
  );
}
