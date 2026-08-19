import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabase";

const SESSION_KEY = "chat_anon_session";
const HOURS = 10;
const EXAMPLES = ["truth_teller", "Batman", "princess", "night_viber"];

export default function UsernamePicker({ onDone, currentUsername, onCancel }) {
  const [name, setName] = useState(currentUsername || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const tryUsername = async (raw) => {
    let clean = raw.trim();
    if (!clean) { setError("enter a username"); return; }
    if (clean.length < 2) { setError("at least 2 characters"); return; }
    
    setLoading(true);
    const since = new Date(Date.now() - HOURS * 3600 * 1000).toISOString();
    
    const { data } = await supabase
      .from("chat_messages")
      .select("username")
      .ilike("username", `${clean}%`)
      .gte("created_at", since);
      
    const taken = data?.map((d) => d.username.toLowerCase()) || [];
    let finalName = clean;
    
    if (taken.includes(clean.toLowerCase())) {
      let i = 1;
      while (taken.includes(`${clean.toLowerCase()}_0${i}`)) i++;
      finalName = `${clean}_0${i}`;
    }
    
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      username: finalName,
      expiresAt: Date.now() + HOURS * 3600 * 1000,
    }));
    
    setLoading(false);
    onDone(finalName);
  };

  return (
    <div className="fixed inset-0 bg-[#090d16]/80 backdrop-blur-sm flex flex-col items-center justify-center px-6 z-50">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-2xl relative">
        {currentUsername && (
          <button 
            onClick={onCancel}
            className="absolute top-6 left-6 text-slate-400 hover:text-slate-100 p-2.5 rounded-2xl bg-slate-950 border border-slate-800 transition active:scale-90 flex items-center justify-center"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <div className="text-center mb-6 mt-4">
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">set your vibe</h1>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
            this username deletes in {HOURS} hours or you can change it anytime
          </p>
        </div>
        <div className={`flex items-center bg-slate-950 border rounded-2xl px-4 py-3 transition-all mb-2 ${error ? "border-red-500/50" : "border-slate-800 focus-within:border-blue-500/60"}`}>
          <span className="text-blue-400 font-black mr-2 text-sm">@</span>
          <input 
            value={name}
            onChange={(e) => { setName(e.target.value.replace(/[^a-zA-Z0-9_]/g, '')); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && tryUsername(name)}
            placeholder="username" 
            maxLength={20} 
            autoFocus
            className="flex-1 bg-transparent text-slate-100 text-sm font-semibold outline-none placeholder-slate-700" 
          />
        </div>
        {error && <p className="text-red-400 text-xs mb-2 ml-1">{error}</p>}
        <p className="text-[11px] text-slate-500 mb-2 mt-4 font-semibold uppercase tracking-wider"> suggestions</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {EXAMPLES.map((n) => (
            <button 
              key={n} 
              onClick={() => { setName(n); setError(""); }}
              className={`text-xs font-bold px-3 py-2 rounded-full border transition-all active:scale-95 ${name === n ? "bg-blue-600 text-white border-blue-500" : "bg-slate-950 text-slate-400 border-slate-800"}`}
            >
              @{n}
            </button>
          ))}
        </div>
        <button 
          onClick={() => tryUsername(name)} 
          disabled={loading || !name.trim()}
          className="w-full py-3.5 rounded-2xl font-black text-sm text-white transition-all active:scale-95 disabled:opacity-30"
          style={{ background: "linear-gradient(135deg, #2563eb, #0284c7)" }}
        >
          {loading ? "checking" : "save username "}
        </button>
      </div>
    </div>
  );
}

