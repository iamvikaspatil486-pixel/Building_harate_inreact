import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Heart, MessageCircle, Loader2, X, Send } from "lucide-react";

function formatTimeAgo(timestamp) {
  if (!timestamp) return "";
  
  // 1. Parse the DB string securely into a JavaScript Date object
  const createdDate = new Date(timestamp);
  if (isNaN(createdDate.getTime())) return ""; // Safety check
  
  // 2. Get the current local time
  const nowDate = new Date();
  
  // 🚀 THE TIMEZONE EQUALIZER:
  // Convert both dates to their raw UTC millisecond values.
  // This completely wipes out the +5:30 IST offset discrepancy!
  const createdUTC = createdDate.getTime() - (createdDate.getTimezoneOffset() * 60000);
  const nowUTC = nowDate.getTime() - (nowDate.getTimezoneOffset() * 60000);
  
  // 3. Calculate absolute difference in seconds
  const differenceInSeconds = Math.floor((nowUTC - createdUTC) / 1000);
  
  // Fallback if local system clock is slightly out of sync with Supabase server
  if (differenceInSeconds < 0) {
    return "1s"; 
  }
  
  // 4. Standard Instagram-style shorthand mapping
  if (differenceInSeconds < 60) {
    return `${Math.max(1, differenceInSeconds)}s`; // Seconds (e.g., 5s)
  }
  
  const differenceInMinutes = Math.floor(differenceInSeconds / 60);
  if (differenceInMinutes < 60) {
    return `${differenceInMinutes}m`; // Minutes (e.g., 2m)
  }
  
  const differenceInHours = Math.floor(differenceInMinutes / 60);
  if (differenceInHours < 24) {
    return `${differenceInHours}h`; // Hours (e.g., 3h)
  }
  
  const differenceInDays = Math.floor(differenceInHours / 24);
  if (differenceInDays < 7) {
    return `${differenceInDays}d`; // Days (e.g., 4d)
  }
  
  return createdDate.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric' 
  });
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

// ─── Comment Sheet ────────────────────────────────────────────────────────────
function CommentSheet({ post, currentUser, onClose }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const inputRef = useRef();
  const backdropRef = useRef();

  useEffect(() => {
    // 🚀 FORCE OVERRIDE: Set the class directly so nothing can intercept it
    document.body.className = "comments-open";

    fetchComments();
    setTimeout(() => inputRef.current?.focus(), 400);

    // 🚀 CLEANUP: Wipe it clean when the sheet unmounts completely
    return () => {
      document.body.className = "";
    };
  }, []);

  const handleBackdrop = (e) => {
    if (e.target === backdropRef.current) {
      // 🚀 RESET BODY STRING
      document.body.className = "";
      onClose();
    }
  };

  const handleCloseSheet = () => {
    // 🚀 RESET BODY STRING
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
    if (!text.trim() || sending || !currentUser) return;
    setSending(true);
    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: post.id, user_id: currentUser.id, comment: text.trim() })
      .select("id, comment, created_at, user_id, students(full_name)")
      .single();
    if (!error && data) { setComments((p) => [...p, data]); setText(""); }
    setSending(false);
  };

  const deleteComment = async (id) => {
    await supabase.from("comments").delete().eq("id", id);
    setComments((p) => p.filter((c) => c.id !== id));
  };

  return (
    /* 1. BACKDROP OVERLAY: Fills the screen, blurs background feed, handles dismiss taps */
    <div 
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center overscroll-none select-none animate-fade-in"
    >
      
      {/* 2. MAIN SHEET CONTAINER: Fixed layout size prevents keyboard displacement bugs */}
      <div 
        className="w-full max-w-md bg-white rounded-t-[28px] flex flex-col overflow-hidden shadow-2xl transition-all duration-300 transform translate-y-0"
        style={{ 
          height: "85vh", 
          maxHeight: "85vh" 
        }}
        onClick={(e) => e.stopPropagation()} // Stops clicks inside the sheet from accidentally closing it
      >
        
        {/* SHEET HEADER HANDLEBAR & CONTROL BAR */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-sm font-black text-gray-900 tracking-tight">Comments</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Students Harate</p>
          </div>
          
          <button 
            onClick={handleCloseSheet}
            className="text-gray-400 hover:text-gray-600 text-xs font-bold px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100/70 transition active:scale-95"
          >
            Close
          </button>
        </div>

       {/* 3. SCROLLABLE MIDDLE MIDDLE STREAM: Freezes background scroll, handles inner touch */}
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
        {/* User initials avatar - 🚀 FIXED SYNTAX STRINGS HERE */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-sky-600 flex items-center justify-center font-black text-white text-xs flex-shrink-0 shadow-sm shadow-blue-500/10">
          {c.students?.full_name?.[0]?.toUpperCase() || "?"}
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl px-3.5 py-2.5 max-w-[82%] shadow-sm">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-black text-gray-900">{c.students?.full_name}</p>

            {/* The Dot Separator */}
            <span className="w-1 h-1 rounded-full bg-gray-300" />

            {/* 🚀 FIXED REAL-TIME MAPPING TICKET */}
            <span className="text-[10px] font-bold text-gray-400">
              {formatTimeAgo(c.created_at)}
            </span>
          </div>
          <p className="text-gray-700 mt-1 text-xs leading-relaxed font-medium whitespace-pre-wrap">{c.comment}</p>
        </div>
      </div>
    ))
  )}
</div>

        {/* 4. PINNED BOTTOM INPUT ZONE: Stays 100% visible on top of mobile keyboards */}
        <div 
          className="flex-shrink-0 border-t border-gray-100 bg-white px-3.5 py-3 flex items-center gap-2 z-10"
          style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}
        >
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendComment()}
            placeholder="Write a responsive comment..."
            className="flex-1 min-w-0 bg-gray-50 border border-gray-200/80 rounded-full px-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:bg-white transition-all duration-200 shadow-inner"
          />

          <button
            onClick={sendComment}
            disabled={!text.trim() || sending}
            className="flex-shrink-0 h-9 px-4 rounded-full bg-blue-600 text-white font-black text-xs uppercase tracking-wider transition-all duration-150 active:scale-95 disabled:opacity-20 disabled:scale-100 flex items-center justify-center shadow-md shadow-blue-600/10"
          >
            {sending ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Send"
            )}
          </button>
        </div>

      </div>

      {/* Embedded keyframe layouts for micro-animations */}
      <style>{`
        .animate-fade-in {
          animation: overlayFade 0.2s ease-out forwards;
        }
        .animate-slide-up {
          animation: commentSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes overlayFade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes commentSlide {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );

        {/* Input Container */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${grad(currentUser?.name || "")} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
            {(currentUser?.name || "?")[0].toUpperCase()}
          </div>
          
          <div className="flex-1 flex items-center bg-gray-100 rounded-full px-4 py-2.5 gap-2">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendComment()}
              placeholder="Add a comment…"
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
            />
            <button
              onClick={sendComment}
              disabled={!text.trim() || sending}
              className="text-blue-500 disabled:opacity-30 hover:text-blue-600 transition"
            >
              {sending ? "..." : "Send"}
            </button>
          </div>
        </div>;

        <div style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)" }} />
      
  
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({ post, currentUser }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
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
      if (currentUser) setLiked(data?.some((l) => l.user_id === currentUser.id) || false);
    };
    fetchLikes();
  }, [post.id]);

  const toggleLike = async () => {
    if (!currentUser) return;
    if (liked) {
      await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", currentUser.id);
      setLiked(false); setLikeCount((n) => n - 1);
    } else {
      await supabase.from("likes").insert({ post_id: post.id, user_id: currentUser.id });
      setLiked(true); setLikeCount((n) => n + 1);
    }
  };

  const handleImgTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!liked) { toggleLike(); setHeartPop(true); setTimeout(() => setHeartPop(false), 800); }
    }
    lastTap.current = now;
  };

  return (
    <>
      <div className="border-b border-gray-100 w-full bg-white">

        {/* Author */}
        <div className="flex items-center gap-3 px-3 py-3">
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${grad(name)} flex items-center justify-center font-bold text-white text-sm flex-shrink-0`}>
            {name[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">{name}</p>
            <p className="text-xs text-gray-400">{timeAgo(post.created_at)}</p>
          </div>
        </div>

        {/* Images */}
        {/* Images */}
        {images.length > 0 && (
          <div className="relative w-full bg-gray-100" style={{ aspectRatio: "1/1" }} onClick={handleImgTap}>
            
            {/* 🚀 START OF INSTAGRAM-STYLE SWIPER */}
            <div className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth">
              {images
                .sort((a, b) => a.position - b.position) // Sorts images by layout position
                .map((image, index) => (
                  <div 
                    key={image.id || index} 
                    className="w-full h-full flex-shrink-0 snap-start snap-always relative"
                  >
                    {image.image_url.endsWith('.mp4') ? (
                      <video 
                        src={image.image_url} 
                        className="w-full h-full object-cover" 
                        controls 
                        muted 
                        loop
                      />
                    ) : (
                      <img 
                        src={image.image_url} 
                        alt="" 
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                ))}
            </div>

            {/* Instagram Dot Indicators */}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
                {images.map((_, dotIndex) => (
                  <div
                    key={dotIndex}
                    className="w-1.5 h-1.5 rounded-full bg-white/50 border border-black/10 shadow-sm"
                  />
                ))}
              </div>
            )}
            
            {/* Image Count Badge */}
            {images.length > 1 && (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/70 text-[10px] font-black text-slate-200 tracking-wider backdrop-blur-md z-10">
                Multi-Post
              </div>
            )}
            {/* 🚀 END OF INSTAGRAM-STYLE SWIPER */}

            {/* Double tap heart animation (Kept safely on top of the slider layer) */}
            {heartPop && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <Heart size={90} className="fill-white text-white drop-shadow-2xl" style={{ animation: "heartPop 0.8s ease forwards" }} />
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 px-3 pt-3 pb-1">
          <button
            onClick={toggleLike}
            className={`transition-transform active:scale-90 ${liked ? "text-rose-500" : "text-gray-700 hover:text-gray-400"}`}
          >
            <Heart size={25} className={liked ? "fill-rose-500" : ""} />
          </button>
          <button onClick={() => setShowComments(true)} className="text-gray-700 hover:text-gray-400 transition">
            <MessageCircle size={25} />
          </button>
        </div>

        {/* Like count */}
        {likeCount > 0 && (
          <p className="px-3 pb-1 text-sm font-semibold text-gray-900">
            {likeCount} {likeCount === 1 ? "like" : "likes"}
          </p>
        )}

        {/* Caption */}
        {post.caption && (
          <p className="px-3 pb-4 text-sm text-gray-800 leading-relaxed">
            <span className="font-semibold text-gray-900 mr-1">{name.split(" ")[0]}</span>
            {post.caption}
          </p>
        )}

      </div>

      {showComments && (
        <CommentSheet post={post} currentUser={currentUser} onClose={() => setShowComments(false)} />
      )}
    </>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
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

// ─── Home ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentUser = JSON.parse(localStorage.getItem("anon_user") || "null");

  useEffect(() => { fetchPosts(); }, []);

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
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes heartPop {
          0%   { transform: scale(0);   opacity: 0; }
          40%  { transform: scale(1.2); opacity: 1; }
          70%  { transform: scale(0.9); opacity: 1; }
          100% { transform: scale(1.1); opacity: 0; }
        }
      `}</style>

      <div className="min-h-screen w-full bg-white text-gray-900 pb-24">

        {/* Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-center">
          <h1 className="font-bold text-gray-900 text-lg tracking-tight">Students Harate</h1>
        </header>

        {/* Feed */}
        {loading ? (
          <><Skeleton /><Skeleton /><Skeleton /></>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center px-6">
            <p className="text-red-500 text-sm">{error}</p>
            <button onClick={fetchPosts} className="text-blue-500 border border-blue-200 px-4 py-2 rounded-xl text-sm">
              Retry
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-gray-400 text-sm">No posts yet</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} currentUser={currentUser} />
          ))
        )}

      </div>
    </>
  );
}

