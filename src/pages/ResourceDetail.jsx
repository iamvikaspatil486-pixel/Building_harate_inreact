import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function ResourceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    fetchResource();
  }, [id]);

  const fetchResource = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("resources")
      .select(`
        id, caption, college_name, created_at,
        students(full_name),
        resource_images(image_url, position)
      `)
      .eq("id", id)
      .single();

    if (data) {
      data.resource_images = (data.resource_images || []).slice().sort((a, b) => a.position - b.position);
    }
    setResource(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
        <p className="text-gray-400 text-sm">Resource not found</p>
        <button onClick={() => navigate("/search")} className="text-blue-500 text-sm font-bold">
          Back to search
        </button>
      </div>
    );
  }

  const images = resource.resource_images || [];

  return (
    <div className="min-h-screen bg-white flex flex-col">

      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-900 transition active:scale-90">
          <ArrowLeft size={22} />
        </button>
        <p className="font-bold text-gray-900 text-sm truncate flex-1">{resource.caption}</p>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full">

        {/* Image viewer */}
        {images.length > 0 && (
          <div className="relative w-full bg-gray-100" style={{ aspectRatio: "1/1" }}>
            <img src={images[imgIdx]?.image_url} alt="" className="w-full h-full object-contain bg-black" />

            {images.length > 1 && (
              <>
                <div className="absolute top-2.5 right-2.5 bg-black/55 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  {imgIdx + 1}/{images.length}
                </div>

                {imgIdx > 0 && (
                  <button
                    onClick={() => setImgIdx((i) => i - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white active:scale-90 transition"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                {imgIdx < images.length - 1 && (
                  <button
                    onClick={() => setImgIdx((i) => i + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white active:scale-90 transition"
                  >
                    <ChevronRight size={18} />
                  </button>
                )}

                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIdx(i)}
                      className={`rounded-full transition-all ${i === imgIdx ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/60"}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Info */}
        <div className="px-4 py-4">
          <p className="text-base font-bold text-gray-900 leading-snug">{resource.caption}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {resource.college_name && (
              <span className="text-xs text-blue-500 font-medium bg-blue-50 px-2.5 py-1 rounded-full">
                {resource.college_name}
              </span>
            )}
            <span className="text-xs text-gray-400">{timeAgo(resource.created_at)}</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Shared by {resource.students?.full_name || "Unknown"}
          </p>
        </div>

      </main>
    </div>
  );
}

