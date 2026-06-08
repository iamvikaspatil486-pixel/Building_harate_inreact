import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Info, ShieldCheck } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const [showInfo, setShowInfo] = useState(false);

  return (
    /* 🚀 MOBILE SCREEN LOCK: fixed inset-0 and overflow-hidden stops mobile rubber-banding */
    <div className="fixed inset-0 bg-[#000000] text-white flex flex-col justify-between overflow-hidden select-none">

      {/* ─── BOTTOM SHEET INFO POPUP ────────────────────────────────────────── */}
      {showInfo && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center animate-fade-in"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="w-full max-w-sm bg-slate-950 border-t border-white/5 rounded-t-3xl p-6 shadow-2xl animate-slide-up pb-8 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Touch Drag Handle Indicator */}
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-slate-800" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#0095f6]" />
                <p className="font-black text-white text-base tracking-tight">About this App</p>
              </div>
              <button 
                onClick={() => setShowInfo(false)} 
                className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-full bg-white/5"
              >
                <X size={14} />
              </button>
            </div>

            {/* Information Grid Items */}
            <div className="space-y-4">
              {[
                { icon: "🎓", title: "For College Students", desc: "A private space built exclusively for your batch — no outsiders, no noise." },
                { icon: "🎭", title: "Anonymous Batch Chat", desc: "Jump into group chat with a temporary username. Say what you think, freely." },
                { icon: "📸", title: "Social Feed", desc: "Share posts, images, and moments with your batchmates like a private Instagram." },
                { icon: "🔐", title: "Admin Approved", desc: "Every student is verified by your admin before joining. Safe and trusted." },
                { icon: "📌", title: "Notice Board", desc: "Important announcements from your college or batch admin, all in one place." },
                { icon: "💬", title: "Batch Only", desc: "Your chats are only visible to students in your batch. Fully private." },
              ].map((item) => (
                <div key={item.title} className="flex gap-3 items-start bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-lg flex-shrink-0 bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center">{item.icon}</span>
                  <div>
                    <p className="text-xs font-black text-white tracking-wide">{item.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-[10px] mt-6 font-bold uppercase tracking-widest text-slate-600">
              built with ❤️ for students by a student
            </p>
          </div>
        </div>
      )}

      {/* ─── TOP CONTROL ACTION BAR ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-5 safe-top">
        <button
          onClick={() => setShowInfo(true)}
          className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/5 bg-white/5 text-slate-400 hover:text-white transition-all active:scale-90 shadow-lg"
        >
          <Info size={16} />
        </button>
        <div className="w-9" />
      </div>

      {/* ─── MAIN HERO BRAND SPOTLIGHT ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm flex flex-col items-center text-center">

          {/* 🚀 INSTAGRAM GRADIENT RING IDENTITY BOX */}
          <div className="w-16 h-16 bg-gradient-to-tr from-[#bc1888] via-[#e95950] to-[#fccf02] p-[2px] rounded-2xl mb-6 shadow-[0_0_25px_rgba(233,89,80,0.2)]">
            <div className="w-full h-full bg-[#000000] rounded-[14px] flex items-center justify-center text-2xl">
              🎓
            </div>
          </div>

          {/* Welcome Text Header */}
{/* Welcome Text Header */}
<h1 className="text-3xl font-black text-white tracking-tight leading-none">
  Welcome to<br />
  
  {/* 🚀 ANIMATED GRADIENT TEXT SHIFT: Uses your fluid color flow rules */}
  <span 
    className="bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-500 bg-clip-text text-transparent inline-block mt-2 font-black tracking-wide uppercase animate-gradient-xy"
    style={{ backgroundSize: "200% 200%" }}
  >
    STUDENTS HARATE
  </span>
</h1>

          {/* Subtitle Details */}
          <p className="text-sm text-slate-400 mt-4 leading-relaxed px-4 max-w-[300px]">            Your private corner of college life — share, chat, and stay connected with your batchmates.
          </p>

          {/* Sleek Minimal Divider */}
          <div className="w-10 h-[1px] rounded-full my-8 bg-white/10" />

          {/* Interactive Routing Buttons Container */}
          <div className="w-full space-y-3 px-2">
            
            {/* 🚀 INSTAGRAM VIVID BLUE INTERACTIVE BUTTON */}
            <button
              onClick={() => navigate("/login")}
className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 border border-transparent shadow-lg shadow-blue-600/10"
            >
              Login to Account
            </button>

            {/* Translucent Dark Backdrop Alternate Button */}
            <button
              onClick={() => navigate("/register")}
              className="w-full py-3.5 bg-white/5 border border-white/5 hover:bg-white/10 text-slate-200 font-black rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95"
            >
              Register Here
            </button>

            <button
              onClick={() => navigate("/create-batch")}
              className="w-full py-2.5 text-slate-500 hover:text-white font-bold text-[11px] tracking-wide transition-colors active:scale-95 mt-2 block"
            >
              Create a batch →
            </button>
          </div>

        </div>
      </div>

      {/* ─── PLATFORM SYSTEM FOOTER SIGNATURE ───────────────────────────────── */}
      <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-700 pb-6 safe-bottom">
        students harate · private & secure
      </p>

      {/* ─── EMBEDDED HIGH-PERFORMANCE ANIMATIONS ───────────────────────────── */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slide-up {
          animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

    </div>
  );
}

