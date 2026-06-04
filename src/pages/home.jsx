import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Heart, MessageCircle, Loader2 } from "lucide-react";

const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("posts")
      .select(`
        id,
        caption,
        full_name,
        user_id,
        created_at,
        post_images (
          id,
          image_url,
          position
        )
      `)
      .order("created_at", { ascending: false });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    // Sort images by position for each post
    const sorted = (data || []).map((p) => ({
      ...p,
      post_images: (p.post_images || []).sort((a, b) => a.position - b.position),
    }));

    setPosts(sorted);
    setLoading(false);
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-cyan-400" size={32} />
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-red-400 text-sm">Error: {error}</p>
        <button
          onClick={fetchPosts}
          className="text-cyan-400 border border-cyan-400/30 px-4 py-2 rounded-xl text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Empty ──
  if (posts.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500 text-sm">No posts yet</p>
      </div>
    );
  }

  // ── Feed ──
  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-4 h-14 flex items-center">
        <h1 className="text-cyan-400 font-bold text-lg mx-auto">STUDENTS HARATE</h1>
      </header>

      {/* Feed */}
      <div className="max-w-md mx-auto">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

    </div>
  );
}

function PostCard({ post }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [imgIdx, setImgIdx] = useState(0);

  const images = post.post_images || [];
  const letter = (post.full_name || "?")[0].toUpperCase();

  return (
    <div className="border-b border-slate-800">

      {/* Author */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-cyan-500 flex items-center justify-center font-bold text-slate-900 text-sm flex-shrink-0">
          {letter}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{post.full_name || "Unknown"}</p>
          <p className="text-xs text-slate-500">{timeAgo(post.created_at)}</p>
        </div>
      </div>

      {/* Images */}
      {images.length > 0 && (
        <div className="relative bg-black" style={{ aspectRatio: "1/1" }}>
          <img
            src={images[imgIdx]?.image_url}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { e.target.src = ""; e.target.alt = "Image failed"; }}
          />

          {/* Multi-image dots */}
          {images.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`rounded-full transition-all ${
                    i === imgIdx
                      ? "w-4 h-1.5 bg-white"
                      : "w-1.5 h-1.5 bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 pt-3 pb-2">
        <button
          onClick={() => { setLiked((v) => !v); setLikes((n) => liked ? n - 1 : n + 1); }}
          className={`transition ${liked ? "text-rose-500" : "text-slate-400 hover:text-white"}`}
        >
          <Heart size={22} className={liked ? "fill-rose-500" : ""} />
        </button>
        <button className="text-slate-400 hover:text-white transition">
          <MessageCircle size={22} />
        </button>
      </div>

      {/* Likes */}
      {likes > 0 && (
        <p className="px-4 text-sm font-semibold text-white pb-1">{likes} likes</p>
      )}

      {/* Caption */}
      {post.caption && (
        <p className="px-4 pb-4 text-sm text-slate-200 leading-relaxed">
          <span className="font-semibold text-white mr-1">
            {post.full_name?.split(" ")[0] || "user"}
          </span>
          {post.caption}
        </p>
      )}

    </div>
  );
}

