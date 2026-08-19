import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

const GIPHY_API_KEY = "4O3KmphtX0AmuqeXjq61mvOdzYJWe8gN";

export default function GifSheet({ onClose, onPick }) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef();

  useEffect(() => {
    fetchTrending();
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const fetchTrending = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=pg-13`
      );
      const json = await res.json();
      setGifs(json.data || []);
    } catch (err) {
      console.error("Giphy trending fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const runSearch = async (text) => {
    if (!text.trim()) { fetchTrending(); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(text.trim())}&limit=24&rating=pg-13`
      );
      const json = await res.json();
      setGifs(json.data || []);
    } catch (err) {
      console.error("Giphy search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    runSearch(val);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end"
      style={{ backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full bg-[#0f172a] rounded-t-3xl flex flex-col shadow-2xl max-w-lg mx-auto border-t border-slate-800"
        style={{ maxHeight: "75vh", animation: "slideUp 0.3s cubic-bezier(0.32,0.72,0,1)" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
          <p className="font-bold text-slate-200 text-sm">Send a GIF</p>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition">
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center bg-slate-800 rounded-full px-4 py-2 gap-2">
            <input
              ref={inputRef}
              value={query}
              onChange={handleChange}
              placeholder="Search GIFs..."
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-slate-700 border-t-violet-400 rounded-full animate-spin" />
            </div>
          ) : gifs.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-12">No GIFs found</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {gifs.map((g) => (
                <button
                  key={g.id}
                  onClick={() => onPick(g.images.fixed_width.url)}
                  className="rounded-xl overflow-hidden bg-slate-800 active:scale-95 transition aspect-square"
                >
                  <img
                    src={g.images.fixed_width_small.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

