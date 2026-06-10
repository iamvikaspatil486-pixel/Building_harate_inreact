import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Heart, MessageCircle, Loader2, X, Send, Bell } from "lucide-react";
import { setupNotifications } from "../lib/notifications";

function formatTimeAgo(timestamp) {
  if (!timestamp) return "";
  const createdDate = new Date(timestamp);
  if (isNaN(createdDate.getTime())) return ""; 
  
  const nowDate = new Date();
  const createdUTC = createdDate.getTime() - (createdDate.getTimezoneOffset() * 60000);
  const nowUTC = nowDate.getTime() - (nowDate.getTimezoneOffset() * 60000);
  const differenceInSeconds = Math.floor((nowUTC - createdUTC) / 1000);
  
  if (differenceInSeconds < 0) return "1s"; 
  if (differenceInSeconds < 60) return `${Math.max(1, differenceInSeconds)}s`;
  
  const differenceInMinutes = Math.floor(differenceInSeconds / 60);
  if (differenceInMinutes < 60) return `${differenceInMinutes}m`;
  
  const differenceInHours = Math.floor(differenceInMinutes / 60);
  if (differenceInHours < 24) return `${differenceInHours}h`;
  
  const differenceInDays = Math.floor(differenceInHours / 24);
  if (differenceInDays < 7) return `${differenceInDays}d`;
  
  return createdDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const GRAD = [
  "from-rose-400 to-pink-500",
  "from-violet-400 to-purple-500",
  "from-cyan-400 to-blue-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-400",
  "from-fuchsia-400 to-pink-400",
];
const grad = (name = "") => GRAD[(name.charCodeAt(0) || 0) % GRAD.length];

// ─── Comment Sheet Component ───────────────────────────────────────────────────
function CommentSheet({ post, currentUser, onClose }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const inputRef = useRef();
  const backdropRef = useRef();

  useEffect(() => {
    document.body.className = "comments-open";
    fetchComments();
    setTimeout(() => inputRef.current?.focus(), 400);
    return () => { document.body.className = ""; };
  }, []);

  const handleBackdrop = (e) => {
    if (e.target === backdropRef.current) {
      document.body.className = "";
      onClose();
    }
  };

  const handleCloseSheet = () => {
    document.body.className = "";
    onClose();
  };

  const fetchComments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("comments")
      .select("id, comment, created_at, user_id, students(full_name)")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    setComments(data || []);
    setLoading(false);
  };

  const sendComment = async () => {
    if (!text.trim() || sending || !currentUser?.id) return;
    setSending(true);
    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: post.id, user_id: currentUser.id, comment: text.trim() })
      .select("id, comment, created_at, user_id, students(full_name)")
      .single();
    if (!error && data) { setComments((p) => [...p, data]); setText(""); }
    setSending(false);
  };

  return (
    <div ref={backdropRef} onClick={handleBackdrop} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center overscroll-none select-none animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-t-[28px] flex flex-col overflow-hidden shadow-2xl transition-all duration-300 transform translate-y-0" style={{ height: "85vh", maxHeight: "85vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex-shrink-0 px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-sm font-black text-gray-900 tracking-tight">Comments</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Students Harate</p>
          </div>
          <button onClick={handleCloseSheet} className="text-gray-400 hover:text-gray-600 text-xs font-bold px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100/70 transition active:scale-95">Close</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gray-50/50 overscroll-contain">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-2">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Loading Feed...</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center justify-center space-y-1">
              <span className="text-sm font-bold text-gray-700">No comments yet</span>
              <span className="text-xs text-gray-400 max-w-[200px]">Be the first one in your batch to say something!</span>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-2.5 items-start animate-slide-up">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-sky-600 flex items-center justify-center font-black text-white text-xs flex-shrink-0 shadow-sm shadow-blue-500/10">
                  {c.students?.full_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl px-3.5 py-2.5 max-w-[82%] shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-black text-gray-900">{c.students?.full_name}</p>
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    <span className="text-[10px] font-bold text-gray-400">{formatTimeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-gray-700 mt-1 text-xs leading-relaxed font-medium whitespace-pre-wrap">{c.comment}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex-shrink-0 border-t border-gray-100 bg-white px-3.5 py-3 flex items-center gap-2 z-10" style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}>
          <input ref={inputRef} type="text" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendComment()} placeholder="Write a responsive comment..." className="flex-1 min-w-0 bg-gray-50 border border-gray-200/80 rounded-full px-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:bg-white transition-all duration-200 shadow-inner" />
          <button onClick={sendComment} disabled={!text.trim() || sending} className="flex-shrink-0 h-9 px-4 rounded-full bg-blue-600 text-white font-black text-xs uppercase tracking-wider transition-all duration-150 active:scale-95 disabled:opacity-20 disabled:scale-100 flex items-center justify-center shadow-md shadow-blue-600/10">{sending ? <Loader2 size={14} className="animate-spin" /> : "Send"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Post Card Component ───────────────────────────────────────────────────────
function PostCard({ post, currentUser }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [activeOverlayImage, setActiveOverlayImage] = useState(null);
  const lastTap = useRef(0);
  const [heartPop, setHeartPop] = useState(false);

  const images = post.post_images || [];
  const name = post.full_name || "Unknown";

  useEffect(() => {
    const fetchLikes = async () => {
      const { data } = await supabase
        .from("likes")
        .select("id, user_id")
        .eq("post_id", post.id);
      setLikeCount(data?.length || 0);
      if (currentUser?.id) setLiked(data?.some((l) => l.user_id === currentUser.id) || false);
    };
    fetchLikes();
  }, [post.id, currentUser]);

  const toggleLike = async () => {
    if (!currentUser?.id) return;
    if (liked) {
      await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", currentUser.id);
      setLiked(false); setLikeCount((n) => n - 1);
    } else {
      await supabase.from("likes").insert({ post_id: post.id, user_id: currentUser.id });
      setLiked(true); setLikeCount((n) => n + 1);
    }
  };

  const handleImgTap = (imgUrl) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!liked) { 
        toggleLike(); 
        setHeartPop(true); 
        setTimeout(() => setHeartPop(false), 800); 
      }
    } else {
      // Single tap triggers the full-screen interactive viewport overlay
      setActiveOverlayImage(imgUrl);
    }
    lastTap.current = now;
  };

  return (
    <>
      <div className="border-b border-gray-100 w-full bg-white">
        <div className="flex items-center gap-3 px-3 py-3">
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${grad(name)} flex items-center justify-center font-bold text-white text-sm flex-shrink-0`}>
            {name[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">{name}</p>
            <p className="text-xs text-gray-400">{timeAgo(post.created_at)}</p>
          </div>
        </div>

        {images.length > 0 && (
          <div className="relative w-full bg-gray-100" style={{ aspectRatio: "1/1" }}>
            <div className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth">
              {images
                .sort((a, b) => a.position - b.position)
                .map((image, index) => (
                  <div key={image.id || index} className="w-full h-full flex-shrink-0 snap-start snap-always relative" onClick={() => handleImgTap(image.image_url)}>
                    {image.image_url.endsWith('.mp4') ? (
                      <video src={image.image_url} className="w-full h-full object-cover" controls muted loop />
                    ) : (
                      <img src={image.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    )}
                  </div>
                ))}
            </div>

            {images.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
                {images.map((_, dotIndex) => (
                  <div key={dotIndex} className="w-1.5 h-1.5 rounded-full bg-white/50 border border-black/10 shadow-sm" />
                ))}
              </div>
            )}
            
            {images.length > 1 && (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/70 text-[10px] font-black text-slate-200 tracking-wider backdrop-blur-md z-10">
                Multi-Post
              </div>
            )}

            {heartPop && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <Heart size={90} className="fill-white text-white drop-shadow-2xl" style={{ animation: "heartPop 0.8s ease forwards" }} />
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 px-3 pt-3 pb-1">
          <button onClick={toggleLike} className={`transition-transform active:scale-90 ${liked ? "text-rose-500" : "text-gray-700 hover:text-gray-400"}`}>
            <Heart size={25} className={liked ? "fill-rose-500" : ""} />
          </button>
          <button onClick={() => setShowComments(true)} className="text-gray-700 hover:text-gray-400 transition">
            <MessageCircle size={25} />
          </button>
        </div>

        {likeCount > 0 && <p className="px-3 pb-1 text-sm font-semibold text-gray-900">{likeCount} {likeCount === 1 ? "like" : "likes"}</p>}

        {post.caption && (
          <p className="px-3 pb-4 text-sm text-gray-800 leading-relaxed">
            <span className="font-semibold text-gray-900 mr-1">{name.split(" ")[0]}</span>
            {post.caption}
          </p>
        )}
      </div>

      {showComments && <CommentSheet post={post} currentUser={currentUser} onClose={() => setShowComments(false)} />}
      {activeOverlayImage && <ImageOverlayModal imageUrl={activeOverlayImage} onClose={() => setActiveOverlayImage(null)} />}
    </>
  );
}

// ─── Skeleton Component ────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="border-b border-gray-100 bg-white animate-pulse">
      <div className="flex items-center gap-3 px-3 py-3">
        <div className="w-9 h-9 rounded-full bg-gray-200" />
        <div className="space-y-1.5">
          <div className="h-3 w-24 rounded-full bg-gray-200" />
          <div className="h-2 w-16 rounded-full bg-gray-100" />
        </div>
      </div>
      <div className="w-full bg-gray-100" style={{ aspectRatio: "1/1" }} />
      <div className="px-3 py-3 space-y-2">
        <div className="h-3 w-16 rounded-full bg-gray-200" />
        <div className="h-3 w-3/4 rounded-full bg-gray-100" />
      </div>
    </div>
  );
}

// ─── Image Zoom View Overlay Component ──────────────────────────────────────────
function ImageOverlayModal({ imageUrl, onClose }) {
  if (!imageUrl) return null;
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const touchStartRef = useRef({ distance: 0, x: 0, y: 0 });

  const handleClose = () => {
    setScale(1); setPosition({ x: 0, y: 0 });
    onClose();
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0]; const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchStartRef.current.distance = dist;
    } else if (e.touches.length === 1 && scale > 1) {
      const t = e.touches[0];
      touchStartRef.current.x = t.clientX - position.x;
      touchStartRef.current.y = t.clientY - position.y;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchStartRef.current.distance > 0) {
      e.preventDefault();
      const t1 = e.touches[0]; const t2 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const factor = currentDist / touchStartRef.current.distance;
      setScale(Math.min(Math.max(1, scale * factor), 4));
      touchStartRef.current.distance = currentDist;
    } else if (e.touches.length === 1 && scale > 1) {
      const t = e.touches[0];
      setPosition({ x: t.clientX - touchStartRef.current.x, y: t.clientY - touchStartRef.current.y });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center select-none touch-none animate-fade-in" onClick={handleClose}>
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none">
        <span className="text-[10px] font-black text-white/50 tracking-widest uppercase">Pinch to Zoom</span>
        <button onClick={handleClose} className="pointer-events-auto h-8 px-4 rounded-full bg-white/10 text-white font-bold text-xs border border-white/10 backdrop-blur-md active:scale-95 transition">Close</button>
      </div>
      <div className="w-full h-full flex items-center justify-center p-2 overflow-hidden" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={() => touchStartRef.current.distance = 0}>
        <img src={imageUrl} alt="Zoomable view" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl transition-transform duration-75 will-change-transform" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }} onClick={(e) => e.stopPropagation()} />
      </div>
    </div>
  );
}

// ─── Main Home Core Feed ────────────────────────────────────────────────────────
export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);

// replace line 354 with this
const [currentUser] = useState(() => 
  JSON.parse(localStorage.getItem("anon_user") || "null")
);
  useEffect(() => { 
    fetchPosts(); 
    evaluateNotificationOnboarding();
  }, []);

  async function evaluateNotificationOnboarding() {
    try {
      if (!currentUser?.id) return;

      const { data: studentRecord, error: fetchError } = await supabase
        .from('students')
        .select('fcm_token')
        .eq('id', currentUser.id)
        .single();

      if (fetchError) throw fetchError;
      if (studentRecord?.fcm_token) return; 
      if (Notification.permission === 'granted' || Notification.permission === 'denied') return;

      const lockTimestamp = localStorage.getItem('harate_notification_cooldown');
      if (lockTimestamp && Date.now() < parseInt(lockTimestamp)) {
        console.log("Notification banner is on a 10-hour cooldown lock.");
        return; 
      }

      setShowNotificationPopup(true);
    } catch (err) {
      console.error('Error tracking permission requirements:', err);
    }
  }

  async function handleRequestPermission() {
    setShowNotificationPopup(false);
    if (currentUser?.id) {
      await setupNotifications(currentUser.id);
    }
  }

  function handleDismissNotification() {
    setShowNotificationPopup(false);
    const tenHoursInMs = 10 * 60 * 60 * 1000;
    const expiration = Date.now() + tenHoursInMs;
    localStorage.setItem('harate_notification_cooldown', expiration.toString());
  }

  const fetchPosts = async () => {
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .from("posts")
      .select(`id, caption, full_name, user_id, created_at, post_images(id, image_url, position)`)
      .order("created_at", { ascending: false });
    if (err) { setError(err.message); setLoading(false); return; }
    const sorted = (data || []).map((p) => ({
      ...p,
      post_images: (p.post_images || []).sort((a, b) => a.position - b.position),
    }));
    setPosts(sorted);
    setLoading(false);
  };

  return (
    <>
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes heartPop {
          0%   { transform: scale(0);   opacity: 0; }
          40%  { transform: scale(1.2); opacity: 1; }
          70%  { transform: scale(0.9); opacity: 1; }
          100% { transform: scale(1.1); opacity: 0; }
        }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      <div className="min-h-screen w-full bg-white text-gray-900 pb-24 relative">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-center">
          <h1 className="font-bold text-gray-900 text-lg tracking-tight">Students Harate</h1>
        </header>

 {loading ? (
          <><Skeleton /><Skeleton /><Skeleton /></>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center px-6">
            <p className="text-red-500 text-sm">{error}</p>
            <button onClick={fetchPosts} className="text-blue-500 border border-blue-200 px-4 py-2 rounded-xl text-sm">Retry</button>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-gray-400 text-sm">No posts yet</p>
          </div>
        ) : (
          <div className="w-full max-w-md mx-auto">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} currentUser={currentUser} />
            ))}
          </div>
        )}

        {/* ─── 🚀 FIXED LOCATION: CUSTOM PERSISTENT NOTIFICATION OVERLAY ─── */}
        {showNotificationPopup && (
          <div className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto bg-white text-slate-900 rounded-2xl p-4 shadow-2xl border border-slate-100 flex items-start gap-3 animate-slide-up">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Bell size={20} className="stroke-[2.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Enable Chat Notifications</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">Get instant push updates when a classmate sends you a message in the chat portal room!</p>
              <div className="flex items-center gap-3 mt-3">
                <button onClick={handleRequestPermission} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-wider rounded-lg shadow-sm active:scale-95 transition">Allow</button>
                <button onClick={handleDismissNotification} className="text-[11px] font-bold text-slate-400 hover:text-slate-600 px-2 py-1">Maybe Later</button>
              </div>
            </div>
            <button onClick={handleDismissNotification} className="text-slate-400 hover:text-slate-600 transition p-0.5"><X size={14} /></button>
          </div>
        )}
      </div>
    </>
  );
}          
