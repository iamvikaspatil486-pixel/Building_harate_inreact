import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { 
  Heart, 
  MessageCircle, 
  Loader2, 
  X, 
  Send, 
  MoreVertical, 
  Trash2,
  ChevronLeft,
  ChevronRight 
} from "lucide-react";

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

// Modern Blue for Comments
const COMMENT_AVATAR_GRAD = "from-blue-500 to-indigo-600";

// ─── Delete Comment Alert ─────────────────────────────────────────────────────
function DeleteCommentAlert({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center px-6">
      <div className="w-full max-w-xs bg-white rounded-2xl p-5 shadow-2xl">
        <p className="font-bold text-gray-900 text-base mb-1">Delete comment?</p>
        <p className="text-sm text-gray-500 mb-5">This action cannot be undone.</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm transition active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm transition active:scale-95"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Comment Sheet ────────────────────────────────────────────────────────────
function CommentSheet({ post, currentUser, onClose }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const inputRef = useRef();
  const backdropRef = useRef();

  useEffect(() => {
    fetchComments();
    setTimeout(() => inputRef.current?.focus(), 400);
  }, []);

  const handleBackdrop = (e) => {
    if (e.target === backdropRef.current) onClose();
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
    if (!error && data) { 
      setComments((p) => [...p, data]); 
      setText(""); 
    }
    setSending(false);
  };

  const confirmDelete = (id) => {
    setCommentToDelete(id);
  };

  const deleteComment = async () => {
    if (!commentToDelete) return;
    await supabase.from("comments").delete().eq("id", commentToDelete);
    setComments((p) => p.filter((c) => c.id !== commentToDelete));
    setCommentToDelete(null);
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 bg-black/40 flex items-end"
      style={{ backdropFilter: "blur(2px)" }}
    >
      <div
        className="w-full bg-white rounded-t-3xl flex flex-col shadow-2xl"
        style={{ maxHeight: "85vh", animation: "slideUp 0.3s cubic-bezier(0.32,0.72,0,1)" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <p className="font-bold text-gray-900 text-sm">Comments</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-gray-300" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No comments yet. Be first!</p>
          ) : (
            comments.map((c) => {
              const name = c.students?.full_name || "User";
              const isOwnComment = c.user_id === currentUser?.id;

              return (
                <div key={c.id} className="flex gap-3 group">
                  {/* Modern Blue Avatar */}
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${COMMENT_AVATAR_GRAD} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                    {name[0].toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-semibold mr-1.5">{name.split(" ")[0]}</span>
                      <span className="text-gray-700 font-normal">{c.comment}</span>
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(c.created_at)}</p>
                  </div>

                  {/* Trash bin for own comment */}
                  {isOwnComment && (
                    <button
                      onClick={() => confirmDelete(c.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition self-start mt-1 p-1"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Input Area */}
        <div className="px-3 py-3 border-t border-gray-100 flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${COMMENT_AVATAR_GRAD} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
            {(currentUser?.name || "?")[0].toUpperCase()}
          </div>
          <div className="flex-1 flex items-center bg-gray-100 rounded-full px-3 py-2 gap-2 min-w-0">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendComment()}
              placeholder="Add a comment…"
              className="flex-1 min-w-0 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
            />
            <button
              onClick={sendComment}
              disabled={!text.trim() || sending}
              className="text-blue-500 disabled:opacity-30 hover:text-blue-600 transition flex-shrink-0"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>

        <div style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)" }} />
      </div>

      {/* Delete Confirmation Alert */}
      {commentToDelete && (
        <DeleteCommentAlert 
          onConfirm={deleteComment} 
          onCancel={() => setCommentToDelete(null)} 
        />
      )}
    </div>
  );
}

// ─── Delete Post Alert (unchanged) ───────────────────────────────────────────
function DeleteAlert({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center px-6">
      <div className="w-full max-w-xs bg-white rounded-2xl p-5 shadow-2xl">
        <p className="font-bold text-gray-900 text-base mb-1">Delete post?</p>
        <p className="text-sm text-gray-500 mb-5">This action cannot be undone.</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm transition active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm transition active:scale-95"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Rest of the code remains the same (PostCard, Skeleton, Home) ─────────────
function PostCard({ post, currentUser, onDeleted }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [heartPop, setHeartPop] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [zoomedImg, setZoomedImg] = useState(null);
  const lastTap = useRef(0);
  const menuRef = useRef();

  const images = post.post_images || [];
  const name = post.full_name || "Unknown";
  const isOwner = post.user_id === currentUser?.id;

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

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  const goToPrev = () => setImgIdx((i) => (i > 0 ? i - 1 : i));
  const goToNext = () => setImgIdx((i) => (i < images.length - 1 ? i + 1 : i));

  const handleDelete = async () => {
    setShowDeleteAlert(false);
    await supabase.from("posts").delete().eq("id", post.id);
    onDeleted(post.id);
  };

  return (
    <>
      <div className="border-b border-gray-100 w-full bg-white">
        <div className="flex items-center gap-3 px-3 py-3">
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${grad(name)} flex items-center justify-center font-bold text-white text-sm flex-shrink-0`}>
            {name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
            <p className="text-xs text-gray-400">{timeAgo(post.created_at)}</p>
          </div>

          {isOwner && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition"
              >
                <MoreVertical size={18} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-9 z-20 bg-white shadow-xl rounded-xl border border-gray-100 py-1 w-36">
                  <button
                    onClick={() => { setMenuOpen(false); setShowDeleteAlert(true); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition"
                  >
                    <Trash2 size={14} /> Delete post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {images.length > 0 && (
          <div className="relative w-full bg-gray-100" style={{ aspectRatio: "1/1" }}>
            <img
              src={images[imgIdx]?.image_url}
              alt=""
              className="w-full h-full object-cover"
              onClick={handleImgTap}
              onDoubleClick={(e) => { e.stopPropagation(); setZoomedImg(images[imgIdx]?.image_url); }}
            />

            {heartPop && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Heart size={90} className="fill-white text-white drop-shadow-2xl" style={{ animation: "heartPop 0.8s ease forwards" }} />
              </div>
            )}

            {images.length > 1 && (
              <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
                {imgIdx + 1} / {images.length}
              </div>
            )}

            {images.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 px-6">
                <button
                  onClick={goToPrev}
                  disabled={imgIdx === 0}
                  className="w-9 h-9 flex items-center justify-center text-white bg-black/50 hover:bg-black/70 rounded-full transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={20} strokeWidth={3} />
                </button>

                <div className="flex items-center gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIdx(i)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === imgIdx 
                          ? "bg-white scale-125" 
                          : "bg-white/60 hover:bg-white/80"
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={goToNext}
                  disabled={imgIdx === images.length - 1}
                  className="w-9 h-9 flex items-center justify-center text-white bg-black/50 hover:bg-black/70 rounded-full transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={20} strokeWidth={3} />
                </button>
              </div>
            )}
          </div>
        )}

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

        {likeCount > 0 && (
          <p className="px-3 pb-1 text-sm font-semibold text-gray-900">
            {likeCount} {likeCount === 1 ? "like" : "likes"}
          </p>
        )}

        {post.caption && (
          <p className="px-3 pb-4 text-sm text-gray-800 leading-relaxed break-words">
            <span className="font-semibold text-gray-900 mr-1">{name.split(" ")[0]}</span>
            {post.caption}
          </p>
        )}
      </div>

      {showComments && (
        <CommentSheet post={post} currentUser={currentUser} onClose={() => setShowComments(false)} />
      )}

      {showDeleteAlert && (
        <DeleteAlert onConfirm={handleDelete} onCancel={() => setShowDeleteAlert(false)} />
      )}

      {zoomedImg && (
        <div
          className="fixed inset-0 z-[70] bg-black flex items-center justify-center"
          onClick={() => setZoomedImg(null)}
        >
          <img
            src={zoomedImg}
            alt=""
            className="max-w-full max-h-full object-contain"
            style={{ touchAction: "pinch-zoom" }}
          />
          <button
            onClick={() => setZoomedImg(null)}
            className="absolute top-4 right-4 text-white bg-black/40 rounded-full p-2"
          >
            <X size={22} />
          </button>
        </div>
      )}
    </>
  );
}

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

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  const [currentUser] = useState(() =>
    JSON.parse(localStorage.getItem("anon_user") || "null")
  );

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    setError(null);
    const { data, error: err } = await supabase
      .from("posts")
      .select(`id, caption, full_name, user_id, created_at, post_images(id, image_url, position)`)
      .order("created_at", { ascending: false });
    if (err) { setError(err.message); setLoading(false); setRefreshing(false); return; }
    const sorted = (data || []).map((p) => ({
      ...p,
      post_images: (p.post_images || []).sort((a, b) => a.position - b.position),
    }));
    setPosts(sorted);
    setLoading(false);
    setRefreshing(false);
  };

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling.current) return;
    const distance = e.touches[0].clientY - touchStartY.current;
    if (distance > 0) setPullDistance(Math.min(distance, 80));
  };

  const handleTouchEnd = () => {
    if (pullDistance > 50) {
      setRefreshing(true);
      fetchPosts();
    }
    setPullDistance(0);
    isPulling.current = false;
  };

  const handleDeleted = (id) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
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

 <div
        className="min-h-screen w-full bg-white text-gray-900 pb-24"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {(pullDistance > 0 || refreshing) && (
          <div
            className="flex justify-center items-center overflow-hidden transition-all"
            style={{ height: refreshing ? 50 : pullDistance }}
          >
            <Loader2 size={20} className={`text-gray-400 ${refreshing || pullDistance > 50 ? "animate-spin" : ""}`} />
          </div>
        )}

        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-center">
          <div className="border border-blue-500/30 rounded-2xl px-4 h-9 flex items-center shadow-[0_0_15px_rgba(37,99,235,0.2)] bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600">
            <p className="font-extrabold text-white text-sm uppercase tracking-wider drop-shadow-sm">harate</p>
          </div>
        </header>

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
            <PostCard key={post.id} post={post} currentUser={currentUser} onDeleted={handleDeleted} />
          ))
        )}
      </div>
    </>
  );
}
