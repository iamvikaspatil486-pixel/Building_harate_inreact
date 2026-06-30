import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Search as SearchIcon, X, Loader2, FileText, Plus, Image as ImageIcon, Upload, FolderOpen, MoreVertical, Trash2, Pencil, Check, Heart } from "lucide-react";

const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

// ─── Upload Sheet ─────────────────────────────────────────────────────────────
function UploadSheet({ onClose, onUploaded }) {
  const fileInputRef = useRef();
  const [caption, setCaption] = useState("");
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("anon_user") || "null");
  const batch = JSON.parse(localStorage.getItem("selectedBatch") || "null");

  const handlePick = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const mapped = files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...mapped]);
    e.target.value = "";
  };

  const removeImage = (idx) => {
    setImages((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[idx].previewUrl);
      copy.splice(idx, 1);
      return copy;
    });
  };

  const handleUpload = async () => {
    if (!caption.trim()) { setError("Add a caption — e.g. '2nd year Pathology QP'"); return; }
    if (images.length === 0) { setError("Add at least one image"); return; }
    if (!currentUser) { setError("You must be logged in"); return; }

    setUploading(true);
    setError("");

    try {
      const { data: resource, error: resErr } = await supabase
        .from("resources")
        .insert([{
          caption: caption.trim(),
          uploaded_by: currentUser.id,
          college_name: batch?.collegeName || null,
        }])
        .select()
        .single();

      if (resErr) throw resErr;

      for (let i = 0; i < images.length; i++) {
        const { file } = images[i];
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${resource.id}/${Date.now()}_${i}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from("resource-images")
          .upload(path, file, { contentType: file.type });

        if (upErr) throw upErr;

        const { data: urlData } = supabase.storage.from("resource-images").getPublicUrl(path);

        await supabase.from("resource_images").insert([{
          resource_id: resource.id,
          image_url: urlData.publicUrl,
          position: i,
        }]);
      }

      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      onUploaded();
      onClose();

    } catch (err) {
      setError(err.message || "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end"
      style={{ backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full bg-white rounded-t-3xl flex flex-col shadow-2xl max-w-lg mx-auto"
        style={{ maxHeight: "90vh", animation: "slideUp 0.3s cubic-bezier(0.32,0.72,0,1)" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <p className="font-bold text-gray-900 text-sm">Upload Notes / QP</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          <div className="mb-5">
            <label className="block text-[11px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
              Caption *
            </label>
            <textarea
              value={caption}
              onChange={(e) => { setCaption(e.target.value); setError(""); }}
              placeholder="e.g. 2nd year Pathology QP — SSIMS, 2nd Internals"
              rows={3}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 transition-colors resize-none text-sm leading-relaxed"
            />
            <p className="text-[11px] text-gray-400 mt-1.5">
              💡 Write a clear, searchable caption so others or other college students can find this easily.
            </p>
          </div>

          <div className="mb-3">
            <label className="block text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2">
              Images *
            </label>

            <div className="grid grid-cols-3 gap-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white active:scale-90 transition"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}

              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition active:scale-95"
              >
                <ImageIcon size={22} />
                <span className="text-[10px] font-bold">Add</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePick}
              className="hidden"
            />
          </div>
        </div>

        <div className="px-4 py-3 border-t border-gray-100" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Uploading...
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

// ─── My Files Sheet ───────────────────────────────────────────────────────────
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
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpenId(null); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchMyFiles = async () => {
    if (!currentUser) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("resources")
      .select(`id, caption, college_name, created_at, resource_images(id, image_url, position)`)
      .eq("uploaded_by", currentUser.id)
      .order("created_at", { ascending: false });
    setMyFiles((data || []).map((r) => ({
      ...r,
      resource_images: (r.resource_images || []).slice().sort((a, b) => a.position - b.position),
    })));
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
    setMyFiles((prev) => prev.map((f) => f.id === editingId ? { ...f, caption: editCaption.trim() } : f));
    setEditingId(null);
    onChanged?.();
  };

  const handleDelete = async (file) => {
    setMenuOpenId(null);
    setDeletingId(file.id);
    try {
      // Delete storage files first
      const paths = file.resource_images.map((img) => {
        const idx = img.image_url.indexOf("/resource-images/");
        return idx >= 0 ? img.image_url.slice(idx + "/resource-images/".length) : null;
      }).filter(Boolean);

      if (paths.length) {
        await supabase.storage.from("resource-images").remove(paths);
      }

      await supabase.from("resources").delete().eq("id", file.id);
      setMyFiles((prev) => prev.filter((f) => f.id !== file.id));
      onChanged?.();
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end"
      style={{ backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full bg-white rounded-t-3xl flex flex-col shadow-2xl max-w-lg mx-auto"
        style={{ maxHeight: "85vh", animation: "slideUp 0.3s cubic-bezier(0.32,0.72,0,1)" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <p className="font-bold text-gray-900 text-sm">My Uploads</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={20} className="animate-spin text-gray-300" />
            </div>
          ) : myFiles.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <FolderOpen size={32} className="text-gray-300" />
              <p className="text-gray-900 font-semibold text-sm">No uploads yet</p>
              <p className="text-gray-400 text-xs">Files you upload will show up here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myFiles.map((file) => (
                <div
                  key={file.id}
                  className={`flex gap-3 items-start p-3 rounded-2xl border border-gray-100 transition ${deletingId === file.id ? "opacity-40" : ""}`}
                >
                  <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                    {file.resource_images[0] ? (
                      <img src={file.resource_images[0].image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText size={18} className="text-gray-300" />
                      </div>
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
                          className="flex-1 min-w-0 bg-gray-50 border border-blue-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 outline-none"
                        />
                        <button onClick={saveEdit} className="text-emerald-500 active:scale-90 transition flex-shrink-0">
                          <Check size={16} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-gray-400 active:scale-90 transition flex-shrink-0">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
                        {file.caption}
                      </p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1">
                      {file.resource_images.length} image{file.resource_images.length !== 1 ? "s" : ""} · {timeAgo(file.created_at)}
                    </p>
                  </div>

                  {editingId !== file.id && (
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={() => setMenuOpenId(menuOpenId === file.id ? null : file.id)}
                        className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {menuOpenId === file.id && (
                        <div ref={menuRef} className="absolute right-0 top-9 z-20 bg-white shadow-xl rounded-xl border border-gray-100 py-1 w-36">
                          <button
                            onClick={() => startEdit(file)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                          >
                            <Pencil size={13} className="text-blue-500" /> Edit caption
                          </button>
                          <button
                            onClick={() => handleDelete(file)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)" }} />
      </div>
    </div>
  );
}

// ─── Huduku (combined search + upload) ────────────────────────────────────────
export default function Huduku() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recent, setRecent] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showMyFiles, setShowMyFiles] = useState(false);

  useEffect(() => {
    fetchRecent();
  }, []);

  const currentUser = JSON.parse(localStorage.getItem("anon_user") || "null");

  const fetchLikedSet = async (resourceIds) => {
    if (!currentUser || !resourceIds.length) return new Set();
    const { data } = await supabase
      .from("resource_likes")
      .select("resource_id")
      .eq("student_id", currentUser.id)
      .in("resource_id", resourceIds);
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
      .limit(10);

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

    const { data, error } = await supabase
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

    if (!error) {
      const rows = data || [];
      const liked = await fetchLikedSet(rows.map((r) => r.id));
      setResults(rows.map((r) => ({ ...r, liked_by_me: liked.has(r.id) })));
    }
    setLoading(false);
  };

  const toggleLike = async (resource, e) => {
    e.stopPropagation();
    if (!currentUser) return;

    const isLiked = resource.liked_by_me;
    const updateList = (list) =>
      list.map((r) =>
        r.id === resource.id
          ? { ...r, liked_by_me: !isLiked, likes_count: r.likes_count + (isLiked ? -1 : 1) }
          : r
      );

    // Optimistic UI update
    setRecent((prev) => updateList(prev));
    setResults((prev) => updateList(prev));

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
      // Revert on failure
      console.error("Like toggle failed:", err);
      setRecent((prev) => updateList(prev));
      setResults((prev) => updateList(prev));
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    runSearch(val);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
  };

  const list = searched ? results : recent;
  const sortedImages = (resource) =>
    (resource.resource_images || []).slice().sort((a, b) => a.position - b.position);

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>

      <div className="min-h-screen bg-white flex flex-col pb-20">

        {/* Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
          <p className="font-bold text-gray-900 text-base mb-2">🔍 Huduku</p>

   {/* Search bar */}
          <div className="flex items-center bg-gray-100 rounded-full px-4 py-2.5 gap-2">
            <SearchIcon size={16} className="text-gray-400 flex-shrink-0" />
            <input
              value={query}
              onChange={handleChange}
              placeholder="Search e.g. 'pathology 2nd internals'"
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
            />
            {query && (
              <button onClick={clearSearch} className="text-gray-400 hover:text-gray-600 transition flex-shrink-0">
                <X size={15} />
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">

          {!searched && (
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Recent uploads
            </p>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={22} className="animate-spin text-gray-300" />
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <FileText size={36} className="text-gray-300" />
              <p className="text-gray-900 font-bold text-sm">
                {searched ? "No results found" : "No uploads yet"}
              </p>
              <p className="text-gray-400 text-xs">
                {searched ? "Try different keywords" : "Be the first to share notes or QPs"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((r) => {
                const imgs = sortedImages(r);
                return (
                  <div
                    key={r.id}
                    onClick={() => navigate(`/resource/${r.id}`)}
                    className="w-full flex gap-3 items-start p-3 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition text-left active:scale-[0.99] cursor-pointer"
                  >
                    <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                      {imgs[0] ? (
                        <img src={imgs[0].image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText size={20} className="text-gray-300" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
                        {r.caption}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {r.college_name && (
                          <span className="text-[11px] text-blue-500 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                            {r.college_name}
                          </span>
                        )}
                        <span className="text-[11px] text-gray-400">{timeAgo(r.created_at)}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {imgs.length} image{imgs.length !== 1 ? "s" : ""} · by {r.students?.full_name?.split(" ")[0] || "Unknown"}
                      </p>
                    </div>

                    {/* Like button */}
                    <button
                      onClick={(e) => toggleLike(r, e)}
                      className="flex flex-col items-center gap-0.5 flex-shrink-0 self-center px-1 active:scale-90 transition"
                    >
                      <Heart
                        size={20}
                        className={r.liked_by_me ? "fill-rose-500 text-rose-500" : "text-gray-300"}
                      />
                      <span className={`text-[10px] font-bold ${r.liked_by_me ? "text-rose-500" : "text-gray-400"}`}>
                        {r.likes_count || 0}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* My Files button — smaller, above the upload FAB */}
        <button
          onClick={() => setShowMyFiles(true)}
          className="fixed bottom-[152px] right-4 z-30 w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 shadow-md active:scale-90 transition"
        >
          <FolderOpen size={18} />
        </button>

        {/* FAB to open upload sheet */}
        <button
          onClick={() => setShowUpload(true)}
          className="fixed bottom-24 right-4 z-30 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white shadow-lg active:scale-90 transition"
        >
          <Plus size={24} />
        </button>

      </div>

      {showUpload && (
        <UploadSheet
          onClose={() => setShowUpload(false)}
          onUploaded={fetchRecent}
        />
      )}

      {showMyFiles && (
        <MyFilesSheet
          onClose={() => setShowMyFiles(false)}
          onChanged={fetchRecent}
        />
      )}
    </>
  );
}
