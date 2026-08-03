import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  Search as SearchIcon,
  X,
  Loader2,
  FileText,
  Plus,
  Upload,
  FolderOpen,
  MoreVertical,
  Trash2,
  Pencil,
  Check,
  Heart,
} from "lucide-react";
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


// ─────────────────────────────────────────────────────────────
// Upload Sheet
// ─────────────────────────────────────────────────────────────
function UploadSheet({ onClose, onUploaded }) {
  const fileInputRef = useRef();
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("anon_user") || "null");
  const batch = JSON.parse(localStorage.getItem("selectedBatch") || "null");

  const handlePick = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    const mapped = selected.map((file) => {
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");
      return {
        file,
        previewUrl: isPdf ? null : URL.createObjectURL(file),
        isPdf,
        name: file.name,
      };
    });

    setFiles((prev) => [...prev, ...mapped]);
    e.target.value = "";
  };

  const removeFile = (idx) => {
    setFiles((prev) => {
      const copy = [...prev];
      if (copy[idx].previewUrl) URL.revokeObjectURL(copy[idx].previewUrl);
      copy.splice(idx, 1);
      return copy;
    });
  };

  const handleUpload = async () => {
    if (!caption.trim()) {
      setError("Please add a caption");
      return;
    }
    if (files.length === 0) {
      setError("Add at least one image or PDF");
      return;
    }
    if (!currentUser) {
      setError("You must be logged in");
      return;
    }

    setUploading(true);
    setError("");
    setProgress(0);
    setStatusText("Creating resource...");

    try {
      const { data: resource, error: resErr } = await supabase
        .from("resources")
        .insert([
          {
            caption: caption.trim(),
            uploaded_by: currentUser.id,
            college_name: batch?.collegeName || null,
          },
        ])
        .select()
        .single();

      if (resErr) throw new Error(resErr.message);

      const total = files.length;

      for (let i = 0; i < files.length; i++) {
        const { file, isPdf } = files[i];
      const ext = file.name.split(".").pop()?.toLowerCase() || (isPdf ? "pdf" : "jpg");
const path = `${resource.id}/${Date.now()}_${i}.${ext}`;

        setStatusText(`Uploading ${i + 1} of ${total}...`);

        const { error: upErr } = await supabase.storage
          .from("resource-images")
          .upload(path, file, { contentType: file.type });

        if (upErr) throw new Error(upErr.message);

        const { data: urlData } = supabase.storage
          .from("resource-images")
          .getPublicUrl(path);

        const { error: imgErr } = await supabase.from("resource_images").insert([
          {
            resource_id: resource.id,
            image_url: urlData.publicUrl,
            position: i,
          },
        ]);

        if (imgErr) throw new Error(imgErr.message);

        setProgress(Math.round(((i + 1) / total) * 100));
      }

      files.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });

      onUploaded();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setStatusText("");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end"
      onClick={(e) => {
        if (e.target === e.currentTarget && !uploading) onClose();
      }}
    >
      <div
        className="w-full bg-slate-950 border-t border-white/10 rounded-t-3xl flex flex-col shadow-2xl max-w-lg mx-auto"
        style={{ maxHeight: "92vh", animation: "slideUp 0.3s cubic-bezier(0.32,0.72,0,1)" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <p className="font-bold text-white text-sm">Upload Notes / QP / PDF</p>
          {!uploading && (
            <button onClick={onClose} className="text-slate-400 hover:text-white transition">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm p-3 rounded-2xl mb-4">
              {error}
            </div>
          )}

          {uploading && (
            <div className="mb-5">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>{statusText}</span>
                <span className="font-bold text-fuchsia-300">{progress}%</span>
              </div>
              <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="mb-5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Caption *
            </label>
            <textarea
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value);
                setError("");
              }}
              disabled={uploading}
              placeholder="e.g. 2nd year Pathology QP — SSIMS"
              rows={3}
              className="w-full p-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-500 outline-none focus:border-fuchsia-400/50 transition resize-none text-sm leading-relaxed disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Files (Images or PDFs) *
            </label>

            <div className="grid grid-cols-3 gap-2.5">
              {files.map((f, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex flex-col items-center justify-center"
                >
                  {f.isPdf ? (
                    <>
                      <FileText size={26} className="text-rose-400 mb-1" />
                      <p className="text-[10px] text-slate-400 px-1.5 text-center line-clamp-2 leading-tight">
                        {f.name}
                      </p>
                    </>
                  ) : (
                    <img src={f.previewUrl} alt="" className="w-full h-full object-cover" />
                  )}

                  {!uploading && (
                    <button
                      onClick={() => removeFile(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}

              {!uploading && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-2xl border border-dashed border-white/20 bg-white/5 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-cyan-400/50 hover:text-cyan-300 transition active:scale-95"
                >
                  <Plus size={22} />
                  <span className="text-[10px] font-bold">Add</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              multiple
              onChange={handlePick}
              className="hidden"
            />
          </div>
        </div>

        <div
          className="px-5 py-4 border-t border-white/5"
          style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
        >
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white font-bold text-sm transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Uploading {progress}%
              </>
            ) : (
              <>
                <Upload size={16} /> Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// My Files Sheet
// ─────────────────────────────────────────────────────────────
function MyFilesSheet({ onClose, onChanged }) {
  const [myFiles, setMyFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editCaption, setEditCaption] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const menuRef = useRef();

  const currentUser = JSON.parse(localStorage.getItem("anon_user") || "null");

  useEffect(() => {
    fetchMyFiles();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpenId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchMyFiles = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("resources")
      .select(`id, caption, college_name, created_at, resource_images(id, image_url, position)`)
      .eq("uploaded_by", currentUser.id)
      .order("created_at", { ascending: false });

    setMyFiles(
      (data || []).map((r) => ({
        ...r,
        resource_images: (r.resource_images || []).slice().sort((a, b) => a.position - b.position),
      }))
    );
    setLoading(false);
  };

  const startEdit = (file) => {
    setMenuOpenId(null);
    setEditingId(file.id);
    setEditCaption(file.caption);
  };

  const saveEdit = async () => {
    if (!editCaption.trim()) return;
    await supabase.from("resources").update({ caption: editCaption.trim() }).eq("id", editingId);
    setMyFiles((prev) =>
      prev.map((f) => (f.id === editingId ? { ...f, caption: editCaption.trim() } : f))
    );
    setEditingId(null);
    onChanged?.();
  };

  const handleDelete = async (file) => {
    setMenuOpenId(null);
    setDeletingId(file.id);
    try {
      const paths = file.resource_images
        .map((img) => {
          const idx = img.image_url.indexOf("/resource-images/");
          return idx >= 0 ? img.image_url.slice(idx + "/resource-images/".length) : null;
        })
        .filter(Boolean);

      if (paths.length) {
        await supabase.storage.from("resource-images").remove(paths);
      }

      await supabase.from("resources").delete().eq("id", file.id);
      setMyFiles((prev) => prev.filter((f) => f.id !== file.id));
      onChanged?.();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full bg-slate-950 border-t border-white/10 rounded-t-3xl flex flex-col shadow-2xl max-w-lg mx-auto"
        style={{ maxHeight: "85vh", animation: "slideUp 0.3s cubic-bezier(0.32,0.72,0,1)" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <p className="font-bold text-white text-sm">My Uploads</p>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={22} className="animate-spin text-fuchsia-300" />
            </div>
          ) : myFiles.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <FolderOpen size={36} className="text-slate-600" />
              <p className="text-white font-semibold text-sm">No uploads yet</p>
              <p className="text-slate-500 text-xs">Files you upload will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myFiles.map((file) => {
                const first = file.resource_images[0];
                const isPdf = first?.image_url?.toLowerCase().endsWith(".pdf");

                return (
                  <div
                    key={file.id}
                    className={`flex gap-3 items-start p-3.5 rounded-2xl border border-white/10 bg-white/5 transition ${
                      deletingId === file.id ? "opacity-40" : ""
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl bg-white/5 overflow-hidden flex-shrink-0 border border-white/10 flex items-center justify-center">
                      {first ? (
                        isPdf ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <FileText size={20} className="text-rose-400" />
                            <span className="text-[9px] text-slate-400 font-bold">PDF</span>
                          </div>
                        ) : (
                          <img src={first.image_url} alt="" className="w-full h-full object-cover" />
                        )
                      ) : (
                        <FileText size={18} className="text-slate-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {editingId === file.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={editCaption}
                            onChange={(e) => setEditCaption(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                            className="flex-1 min-w-0 bg-white/5 border border-cyan-400/40 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none"
                          />
                          <button onClick={saveEdit} className="text-emerald-400">
                            <Check size={16} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-slate-400">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-white leading-snug line-clamp-2">
                          {file.caption}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-500 mt-1">
                        {file.resource_images.length} file
                        {file.resource_images.length !== 1 ? "s" : ""} · {timeAgo(file.created_at)}
                      </p>
                    </div>

                    {editingId !== file.id && (
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={() => setMenuOpenId(menuOpenId === file.id ? null : file.id)}
                          className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/5 transition"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {menuOpenId === file.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-0 top-9 z-20 bg-slate-900 shadow-xl rounded-xl border border-white/10 py-1 w-36"
                          >
                            <button
                              onClick={() => startEdit(file)}
                              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5 transition"
                            >
                              <Pencil size={13} className="text-cyan-300" /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(file)}
                              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)" }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Huduku Component
// ─────────────────────────────────────────────────────────────
export default function Huduku() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recent, setRecent] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showMyFiles, setShowMyFiles] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem("anon_user") || "null");

  useEffect(() => {
    fetchRecent();
  }, []);

  const fetchLikedSet = async (ids) => {
    if (!currentUser || !ids.length) return new Set();
    const { data } = await supabase
      .from("resource_likes")
      .select("resource_id")
      .eq("student_id", currentUser.id)
      .in("resource_id", ids);
    return new Set((data || []).map((r) => r.resource_id));
  };

 const fetchRecent = async () => {
    const { data } = await supabase
      .from("resources")
      .select(`
        id, caption, college_name, created_at, likes_count,
        students(full_name),
        resource_images(image_url, position)
      `)
      .order("created_at", { ascending: false })
      .limit(12);

    const rows = data || [];
    const liked = await fetchLikedSet(rows.map((r) => r.id));
    setRecent(rows.map((r) => ({ ...r, liked_by_me: liked.has(r.id) })));
  };

  const runSearch = async (text) => {
    if (!text.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);

    const { data } = await supabase
      .from("resources")
      .select(`
        id, caption, college_name, created_at, likes_count,
        students(full_name),
        resource_images(image_url, position)
      `)
      .ilike("caption", `%${text.trim()}%`)
      .order("likes_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30);

    const rows = data || [];
    const liked = await fetchLikedSet(rows.map((r) => r.id));
    setResults(rows.map((r) => ({ ...r, liked_by_me: liked.has(r.id) })));
    setLoading(false);
  };

  const toggleLike = async (resource, e) => {
    e.stopPropagation();
    if (!currentUser) return;

    const isLiked = resource.liked_by_me;
    const update = (list) =>
      list.map((r) =>
        r.id === resource.id
          ? {
              ...r,
              liked_by_me: !isLiked,
              likes_count: Math.max(0, r.likes_count + (isLiked ? -1 : 1)),
            }
          : r
      );

    setRecent(update);
    setResults(update);

    try {
      if (isLiked) {
        await supabase
          .from("resource_likes")
          .delete()
          .eq("resource_id", resource.id)
          .eq("student_id", currentUser.id);
        await supabase
          .from("resources")
          .update({ likes_count: Math.max(0, resource.likes_count - 1) })
          .eq("id", resource.id);
      } else {
        await supabase
          .from("resource_likes")
          .insert({ resource_id: resource.id, student_id: currentUser.id });
        await supabase
          .from("resources")
          .update({ likes_count: resource.likes_count + 1 })
          .eq("id", resource.id);
      }
    } catch (err) {
      console.error(err);
      setRecent(update);
      setResults(update);
    }
  };

  const list = searched ? results : recent;
  const sortedImages = (r) =>
    (r.resource_images || []).slice().sort((a, b) => a.position - b.position);

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-white flex flex-col pb-24 relative overflow-hidden">
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-fuchsia-500/20 blur-[110px] rounded-full" />
        <div className="pointer-events-none absolute bottom-28 right-0 w-56 h-56 bg-cyan-500/15 blur-[90px] rounded-full" />

        {/* Header */}
        <header className="sticky top-0 z-10 px-4 py-3 bg-slate-950/70 backdrop-blur-xl border-b border-white/5">
          <p className="font-black text-sm tracking-[0.18em] uppercase mb-3 bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
            HUDUKI
          </p>

          <div className="flex items-center bg-white/5 border border-white/10 rounded-full px-4 py-2.5 gap-2">
            <SearchIcon size={16} className="text-slate-400 flex-shrink-0" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                runSearch(e.target.value);
              }}
              placeholder="Search e.g. pathology 2nd internals"
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  setSearched(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full relative z-10">
          {!searched && (
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.16em] mb-3">
              Recent uploads
            </p>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="animate-spin text-fuchsia-300" />
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <FileText size={40} className="text-slate-600" />
              <p className="text-white font-bold text-sm">
                {searched ? "No results found" : "No uploads yet"}
              </p>
              <p className="text-slate-500 text-xs">
                {searched ? "Try different keywords" : "Be the first to share notes or QPs"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((r) => {
                const imgs = sortedImages(r);
                const first = imgs[0];
                const isPdf = first?.image_url?.toLowerCase().endsWith(".pdf");

                return (
                  <div
                    key={r.id}
                    onClick={() => navigate(`/resource/${r.id}`)}
                    className="w-full flex gap-3.5 items-start p-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/[0.07] transition active:scale-[0.99] cursor-pointer"
                  >
                    <div className="w-16 h-16 rounded-xl bg-white/5 overflow-hidden flex-shrink-0 border border-white/10 flex items-center justify-center">
                      {first ? (
                        isPdf ? (
                          <div className="flex flex-col items-center gap-1">
                            <FileText size={22} className="text-rose-400" />
                            <span className="text-[9px] text-slate-400 font-bold">PDF</span>
                          </div>
                        ) : (
                          <img
                            src={first.image_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <FileText size={20} className="text-slate-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white leading-snug line-clamp-2">
                        {r.caption}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {r.college_name && (
                          <span className="text-[11px] text-cyan-300 font-medium bg-cyan-500/10 border border-cyan-400/20 px-2 py-0.5 rounded-full">
                            {r.college_name}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500">{timeAgo(r.created_at)}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {imgs.length} file{imgs.length !== 1 ? "s" : ""} · by{" "}
                        {r.students?.full_name?.split(" ")[0] || "Unknown"}
                      </p>
                    </div>

                    <button
                      onClick={(e) => toggleLike(r, e)}
                      className="flex flex-col items-center gap-0.5 flex-shrink-0 self-center px-1 active:scale-90 transition"
                    >
                      <Heart
                        size={20}
                        className={r.liked_by_me ? "fill-rose-400 text-rose-400" : "text-slate-500"}
                      />
                      <span
                        className={`text-[10px] font-bold ${
                          r.liked_by_me ? "text-rose-300" : "text-slate-500"
                        }`}
                      >
                        {r.likes_count || 0}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* My Files Button */}
        <button
          onClick={() => setShowMyFiles(true)}
          className="fixed bottom-[152px] right-4 z-30 w-11 h-11 rounded-full bg-white/10 border border-white/15 backdrop-blur flex items-center justify-center text-slate-200 shadow-md active:scale-90 transition"
        >
          <FolderOpen size={18} />
        </button>

        {/* FAB */}
        <button
          onClick={() => setShowUpload(true)}
          className="fixed bottom-24 right-4 z-30 w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 flex items-center justify-center text-white shadow-lg shadow-fuchsia-500/25 active:scale-90 transition"
        >
          <Plus size={24} />
        </button>
      </div>

      {showUpload && (
        <UploadSheet onClose={() => setShowUpload(false)} onUploaded={fetchRecent} />
      )}
      {showMyFiles && (
        <MyFilesSheet onClose={() => setShowMyFiles(false)} onChanged={fetchRecent} />
      )}
    </>
  );
}
