import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Image as ImageIcon, Film, X, Loader2 } from "lucide-react";

export default function AddPost() {
  const navigate = useNavigate();
  const [caption, setCaption] = useState("");
  const [selectedMedia, setSelectedMedia] = useState([]); // Array of { file, previewUrl, type }
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Handle image/video selection from mobile gallery
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const newMedia = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" : "image",
    }));

    setSelectedMedia((prev) => [...prev, ...newMedia]);
  };

  // Remove a selected file preview before uploading
  const removeMedia = (index) => {
    setSelectedMedia((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl); // Prevent memory leaks
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleShare = async () => {
    if (!caption.trim() && !selectedMedia.length) return;
    setLoading(true);

    try {
      // 1. Get the authenticated user email from Supabase Auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("User not authenticated");
      const userEmail = session.user.email;

      // 2. Fetch all necessary columns from your custom 'students' table
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id, nickname, full_name, batch_id")
        .eq("email", userEmail)
        .single();

      if (studentError || !studentData) {
        throw new Error("Could not verify your student profile record matching");
      }

      // 3. Build the core posts insert object dynamically based on nickname availability
      const postPayload = {
        user_id: studentData.id,
        caption: caption.trim(),
        full_name: studentData.full_name,
        batch_id: studentData.batch_id,
      };

      // Only add nickname key if it actually exists on their profile record
      if (studentData.nickname && studentData.nickname.trim() !== "") {
        postPayload.nickname = studentData.nickname.trim();
      }

      // 4. Insert into the main 'posts' table
      const { data: postData, error: postError } = await supabase
        .from("posts")
        .insert(postPayload)
        .select()
        .single();

      if (postError) throw postError;
      const postId = postData.id;

      // 5. Upload files to your 'post-media' bucket and link them to 'post_images'
      if (selectedMedia.length > 0) {
        const uploadPromises = selectedMedia.map(async (media, index) => {
          const fileExt = media.file.name.split(".").pop();
          const fileName = `${studentData.id}_${Date.now()}_${index}.${fileExt}`;
          const filePath = `posts/${fileName}`;

          // Upload raw media binary directly to bucket folder
          const { error: uploadError } = await supabase.storage
            .from("post-media")
            .upload(filePath, media.file);

          if (uploadError) throw uploadError;

          // Retrieve verified public asset URL path mapping
          const { data: { publicUrl } } = supabase.storage
            .from("post-media")
            .getPublicUrl(filePath);

          // Perform transactional insertion into 'post_images'
          const { error: imageError } = await supabase
            .from("post_images")
            .insert({
              post_id: postId,
              image_url: publicUrl,
              position: index + 1, // Layout listing order ordering tag index
            });

          if (imageError) throw imageError;
        });

        await Promise.all(uploadPromises);
      }

      // Everything succeeded, clear states and navigate smoothly back home
      navigate("/home");
    } catch (error) {
      console.error("Post Creation Failure Detail Log:", error);
      alert(error.message || "Failed to publish your content feed setup");
    } finally {
      setLoading(false);
    }
  };

  return (
    /* IMMOVABLE LAYOUT SYSTEM WRAPPER */
    <div className="fixed inset-0 bg-[#090d16] text-slate-100 flex flex-col overflow-hidden overscroll-none">
      
      {/* HEADER CONTROL HUB COMPONENT */}
      <header className="flex-shrink-0 h-16 border-b border-slate-900/60 px-4 flex items-center justify-between bg-[#090d16]/90 backdrop-blur-md z-10">
        <button 
          onClick={() => navigate(-1)} 
          disabled={loading}
          className="text-slate-400 hover:text-slate-100 p-2.5 rounded-2xl bg-slate-900 border border-slate-800/80 transition active:scale-90 flex items-center justify-center disabled:opacity-50"
        >
          <ArrowLeft size={18} />
        </button>

        <h1 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider">New Post</h1>

        <button
          onClick={handleShare}
          disabled={loading || (!caption.trim() && !selectedMedia.length)}
          className="px-4 py-2 rounded-xl text-xs font-black text-white active:scale-95 transition disabled:opacity-20 flex items-center gap-1.5 shadow-lg shadow-blue-600/10"
          style={{ background: "linear-gradient(135deg, #2563eb, #0284c7)" }}
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Posting...
            </>
          ) : (
            "Share"
          )}
        </button>
      </header>

      {/* TEXT AREA WORK SPACE PANELS */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-xl w-full mx-auto overscroll-contain flex flex-col">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          disabled={loading}
          placeholder="What's happening in your college room?..."
          maxLength={2200}
          className="w-full flex-1 min-h-[120px] bg-transparent text-slate-200 placeholder-slate-700 text-sm outline-none resize-none leading-relaxed"
        />

        {/* IMAGE/VIDEO CAROUSEL PREVIEW BLOCKS */}
        {selectedMedia.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2 pt-1 snap-x scrollbar-hide flex-shrink-0">
            {selectedMedia.map((media, idx) => (
              <div key={idx} className="relative w-28 h-28 rounded-2xl border border-slate-800 bg-slate-950 flex-shrink-0 overflow-hidden snap-center">
                {media.type === "video" ? (
                  <video src={media.previewUrl} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={media.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                )}
                
                <button
                  type="button"
                  onClick={() => removeMedia(idx)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/70 text-slate-400 hover:text-white transition border border-white/10"
                >
                  <X size={12} />
                </button>
                
                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-slate-900/80 text-[9px] font-bold text-slate-400 border border-slate-800/60">
                  {idx + 1}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FIXED BOTTOM ACTION PANEL TOOLBAR */}
      <div 
        className="flex-shrink-0 border-t border-slate-900/60 px-4 py-3 bg-[#090d16] z-10 flex gap-3"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={() => { fileInputRef.current.accept = "image/*"; fileInputRef.current.click(); }}
          disabled={loading}
          className="flex-1 h-12 bg-slate-900 border border-slate-800/80 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-slate-300 active:scale-[0.98] transition hover:bg-slate-850"
        >
          <ImageIcon size={16} className="text-blue-400" />
          Add Photo
        </button>

        <button
          onClick={() => { fileInputRef.current.accept = "video/*"; fileInputRef.current.click(); }}
          disabled={loading}
          className="flex-1 h-12 bg-slate-900 border border-slate-800/80 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-slate-300 active:scale-[0.98] transition hover:bg-slate-850"
        >
          <Film size={16} className="text-sky-400" />
          Add Video
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

    </div>
  );
}

