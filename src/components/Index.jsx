import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Info, ShieldCheck, MessageSquarePlus, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";

// ─── FEEDBACK MODAL COMPONENT ──────────────────────────────────────────────
function FeedbackModal({ onClose }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const submitFeedback = async () => {
    if (!text.trim()) return;
    setLoading(true);
    await supabase.from("feedback").insert({ feedback: text });
    setLoading(false);
    onClose();
    alert("Thank you for your feedback!");
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-scale-up" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">We value your thoughts</h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-4">
          This app is still in development. If you face any inconvenience, we are truly sorry. Please share your problems or suggestions below.
        </p>
        <textarea 
          className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500 transition"
          placeholder="What's on your mind?"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 text-xs font-bold text-slate-500 hover:text-white transition">Cancel</button>
          <button onClick={submitFeedback} disabled={loading || !text.trim()} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-lg transition active:scale-95 shadow-lg shadow-indigo-600/20">
            {loading ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Send Feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  const navigate = useNavigate();
  const [showInfo, setShowInfo] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <div className="fixed inset-0 bg-[#000000] text-white flex flex-col justify-between overflow-hidden select-none">
      
      {/* ─── FLOATING FEEDBACK BUTTON (Bottom Right) ─── */}
      <button 
        onClick={() => setShowFeedback(true)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/30 hover:scale-105 transition-all"
      >
        <MessageSquarePlus size={20} className="text-white" />
      </button>

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}

      {/* ─── BOTTOM SHEET INFO POPUP ────────────────────────────────────────── */}
      {showInfo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center animate-fade-in" onClick={() => setShowInfo(false)}>
          <div className="w-full max-w-sm bg-slate-950 border-t border-white/5 rounded-t-3xl p-6 shadow-2xl animate-slide-up pb-8 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center mb-4"><div className="w-10 h-1 rounded-full bg-slate-800" /></div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#0095f6]" />
                <p className="font-black text-white text-base tracking-tight">About this App</p>
              </div>
              <button onClick={() => setShowInfo(false)} className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-full bg-white/5"><X size={14} /></button>
            </div>
            <div className="space-y-4">
              {[
                { icon: "🎓", title: "For College Students", desc: "A private space built exclusively for your batch." },
                { icon: "🎭", title: "Anonymous Chat", desc: "Jump into group chat with a temporary username." },
                { icon: "📸", title: "Social Feed", desc: "Share posts and moments with your batchmates." },
                { icon: "🔐", title: "Admin Approved", desc: "Every student is verified by your admin." },
              ].map((item) => (
                <div key={item.title} className="flex gap-3 items-start bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-lg flex-shrink-0 bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center">{item.icon}</span>
                  <div>
                    <p className="text-xs font-black text-white tracking-wide">{item.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── HERO BRANDING ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-5">
        <button onClick={() => setShowInfo(true)} className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/5 bg-white/5 text-slate-400 hover:text-white transition-all active:scale-90"><Info size={16} /></button>
        <div className="w-9" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-[#bc1888] via-[#e95950] to-[#fccf02] p-[2px] rounded-2xl mb-6 shadow-xl">
            <div className="w-full h-full bg-[#000000] rounded-[14px] flex items-center justify-center text-2xl">🎓</div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Welcome to<br />
            <span className="bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-500 bg-clip-text text-transparent mt-2 inline-block uppercase tracking-wide">STUDENTS HARATE</span>
          </h1>
          <p className="text-sm text-slate-400 mt-4 px-4">Your private corner of college life.</p>
          <div className="w-10 h-[1px] my-8 bg-white/10" />
          <div className="w-full space-y-3 px-2">
            <button onClick={() => navigate("/login")} className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-blue-600/10">Login</button>
            <button onClick={() => navigate("/register")} className="w-full py-3.5 bg-white/5 border border-white/5 text-slate-200 font-black rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95">Register</button>
            <button onClick={() => navigate("/create-batch")} className="w-full py-2.5 text-slate-500 hover:text-white font-bold text-[11px] tracking-wide transition-colors active:scale-95 mt-2">Create a batch →</button>
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-700 pb-6">students harate · private & secure</p>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes scaleUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-scale-up { animation: scaleUp 0.2s ease-out forwards; }
      `}</style>
    </div>
  );
}

