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

  // Handle picking files from mobile gallery
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

  // Remove file thumbnail from view array
  const removeMedia = (index) => {
    setSelectedMedia((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleShare = async () => {
    if (!caption.trim() && !selectedMedia.length) return;
    setLoading(true);

    try {
      // 1. Get the authenticated user session from Supabase Auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("User not authenticated");
      const userEmail = session.user.email;

      // 2. Fetch your clean primary key ID from your custom 'students' table using the email
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("email", userEmail)
        .single();

      if (studentError || !studentData) {
        throw new Error("Could not verify your student profile record mapping");
      }
      
      const trueStudentId = studentData.id;

      // 3. Insert into the main 'posts' table using the true student relation ID
      const { data: postData, error: postError } = await supabase
        .from("posts")
        .insert({
          user_id: trueStudentId, // Matches your student ID relational constraint
          caption: caption.trim(),
        })
        .select()
        .single();

      if (postError) throw postError;
      const postId = postData.id;

      // 4. Upload files to your 'post-media' bucket and insert links to 'post_images'
      if (selectedMedia.length > 0) {
        const uploadPromises = selectedMedia.map(async (media, index) => {
          const fileExt = media.file.name.split(".").pop();
          const fileName = `${trueStudentId}_${Date.now()}_${index}.${fileExt}`;
          const filePath = `posts/${fileName}`;

          // Upload raw media file to your bucket
          const { error: uploadError } = await supabase.storage
            .from("post-media")
            .upload(filePath, media.file);

          if (uploadError) throw uploadError;

          // Get public URL path string
          const { data: { publicUrl } } = supabase.storage
            .from("post-media")
            .getPublicUrl(filePath);

          // Insert directly matching your exact 'post_images' schema matrix
          const { error: imageError } = await supabase
            .from("post_images")
            .insert({
              post_id: postId,
              image_url: publicUrl, // Matches your specific 'image_url' column label
              position: index + 1,  // Carousel layout sequencing integer
            });

          if (imageError) throw imageError;
        });

        await Promise.all(uploadPromises);
      }

      // Everything succeeded, navigate home safely
      navigate("/home");
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to publish post setup profile constraints");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#090d16] text-slate-100 flex flex-col overflow-hidden overscroll-none">
      
      {/* HEADER CONTROL HUB */}
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
          className="px-4 py-2 rounded-xl text-xs font-black text-white active:scale-95 transition disabled:opacity-20 flex items-center gap-1.5 shadow-lg"
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

      {/* TEXT ENTRY AREA */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-xl w-full mx-auto overscroll-contain flex flex-col">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          disabled={loading}
          placeholder="What's happening in your college room?..."
          maxLength={2200}
          className="w-full flex-1 min-h-[120px] bg-transparent text-slate-200 placeholder-slate-700 text-sm outline-none resize-none leading-relaxed"
        />

        {/* HORIZONTAL CAROUSEL PREVIEW ROW */}
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

      {/* BOTTOM GALLERY ACTION BLOCK */}
      <div 
        className="flex-shrink-0 border-t border-slate-900/60 px-4 py-3 bg-[#090d16] z-10 flex gap-3"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={() => { fileInputRef.current.accept = "image/*"; fileInputRef.current.click(); }}
          disabled={loading}
          className="flex-1 h-12 bg-slate-900 border border-slate-800/80 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-slate-300 active:scale-[0.98] transition"
        >
          <ImageIcon size={16} className="text-blue-400" />
          Add Photo
        </button>

        <button
          onClick={() => { fileInputRef.current.accept = "video/*"; fileInputRef.current.click(); }}
          disabled={loading}
          className="flex-1 h-12 bg-slate-900 border border-slate-800/80 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-slate-300 active:scale-[0.98] transition"
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

