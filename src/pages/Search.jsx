import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Search as SearchIcon, X, Loader2, FileText, Plus } from "lucide-react";

const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    fetchRecent();
  }, []);

  const fetchRecent = async () => {
    const { data } = await supabase
      .from("resources")
      .select(`
        id, caption, college_name, created_at,
        students(full_name),
        resource_images(image_url, position)
      `)
      .order("created_at", { ascending: false })
      .limit(10);
    setRecent(data || []);
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
        id, caption, college_name, created_at,
        students(full_name),
        resource_images(image_url, position)
      `)
      .ilike("caption", `%${text.trim()}%`)
      .order("created_at", { ascending: false })
      .limit(30);

    if (!error) setResults(data || []);
    setLoading(false);
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
    <div className="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-900 transition active:scale-90">
            <ArrowLeft size={22} />
          </button>
          <p className="font-bold text-gray-900 text-sm">Search Notes & QPs</p>
        </div>

        {/* Search bar */}
        <div className="flex items-center bg-gray-100 rounded-full px-4 py-2.5 gap-2 mt-2">
          <SearchIcon size={16} className="text-gray-400 flex-shrink-0" />
          <input
            autoFocus
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

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full pb-24">

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
                <button
                  key={r.id}
                  onClick={() => navigate(`/resource/${r.id}`)}
                  className="w-full flex gap-3 items-start p-3 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition text-left active:scale-[0.99]"
                >
                  {/* Thumbnail */}
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
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* FAB to upload */}
      <button
        onClick={() => navigate("/upload-notes")}
        className="fixed bottom-6 right-4 z-30 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white shadow-lg active:scale-90 transition"
      >
        <Plus size={24} />
      </button>

    </div>
  );
}

