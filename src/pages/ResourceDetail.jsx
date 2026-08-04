import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight, Download, FileText } from "lucide-react";

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


export default function ResourceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [downloading, setDownloading] = useState(false);

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
        resource_images(image_url, position, file_type, file_name)
      `)
      .eq("id", id)
      .single();

    if (data) {
      data.resource_images = (data.resource_images || [])
        .slice()
        .sort((a, b) => a.position - b.position);
    }
    setResource(data);
    setLoading(false);
  };

  const currentFile = resource?.resource_images?.[imgIdx];
  const isPdf = currentFile?.file_type === "pdf";

  // Download current file and save as "Harate/<filename>"
  const downloadCurrent = async () => {
    if (!currentFile) return;
    setDownloading(true);
    try {
      const response = await fetch(currentFile.image_url);
      const blob = await response.blob();
      const fileName = currentFile.file_name || `harate_file_${imgIdx + 1}.${isPdf ? "pdf" : "jpg"}`;

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
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
        <button onClick={() => navigate(-1)} className="text-blue-500 text-sm font-bold">
          Back
        </button>
      </div>
    );
  }

  const files = resource.resource_images || [];

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-900 transition active:scale-90">
          <ArrowLeft size={22} />
        </button>
        <p className="font-bold text-gray-900 text-sm truncate flex-1">{resource.caption}</p>

        {/* Download button */}
        {currentFile && (
          <button
            onClick={downloadCurrent}
            disabled={downloading}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-full active:scale-95 transition disabled:opacity-50 flex-shrink-0"
          >
            {downloading
              ? <Loader2 size={13} className="animate-spin" />
              : <Download size={13} />
            }
            {downloading ? "..." : "Download"}
          </button>
        )}
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full">

        {/* File viewer */}
        {files.length > 0 && (
          <div className="relative w-full bg-gray-100">

            {isPdf ? (
              /* ── PDF viewer ── */
              <div className="flex flex-col items-center justify-center py-10 px-6 gap-5 min-h-[260px]">
                <div className="w-20 h-20 rounded-3xl bg-red-50 border border-red-100 flex items-center justify-center shadow-sm">
                  <FileText size={36} className="text-red-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-900 mb-1">
                    {currentFile.file_name || "Document.pdf"}
                  </p>
                  <p className="text-xs text-gray-400">PDF Document</p>
                </div>
                <a
                  href={currentFile.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-red-500 text-white text-sm font-bold px-6 py-3 rounded-full active:scale-95 transition shadow-sm"
                >
                  <FileText size={15} /> Open PDF
                </a>
              </div>
            ) : (
              /* ── Image viewer ── */
              <div style={{ aspectRatio: "1/1" }}>
                <img
                  src={currentFile?.image_url}
                  alt=""
                  className="w-full h-full object-contain bg-black"
                />
              </div>
            )}

            {/* Navigation arrows + counter — only when multiple files */}
            {files.length > 1 && (
              <>
                <div className="absolute top-2.5 right-2.5 bg-black/55 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full z-10">
                  {imgIdx + 1}/{files.length}
                </div>

                {imgIdx > 0 && (
                  <button
                    onClick={() => setImgIdx((i) => i - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white active:scale-90 transition z-10"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                {imgIdx < files.length - 1 && (
                  <button
                    onClick={() => setImgIdx((i) => i + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white active:scale-90 transition z-10"
                  >
                    <ChevronRight size={18} />
                  </button>
                )}

                {/* Dots — show file type icon instead of plain dot */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10">
                  {files.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIdx(i)}
                      className={`rounded-full transition-all flex items-center justify-center ${
                        i === imgIdx ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/60"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* File type strip — thumbnails/icons */}
        {files.length > 1 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-gray-100">
            {files.map((f, i) => (
              <button
                key={i}
                onClick={() => setImgIdx(i)}
                className={`flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition active:scale-95 ${
                  i === imgIdx ? "border-blue-500" : "border-gray-200"
                }`}
              >
                {f.file_type === "pdf" ? (
                  <div className="w-full h-full bg-red-50 flex items-center justify-center">
                    <FileText size={18} className="text-red-400" />
                  </div>
                ) : (
                  <img src={f.image_url} alt="" className="w-full h-full object-cover" />
                )}
              </button>
            ))}
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

