import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function AddPost() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-[#090d16] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
      
      {/* Visual Indicator Container Box */}
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <p className="text-5xl mb-4 animate-bounce">🚀</p>
        <h1 className="text-2xl font-black tracking-tight text-white mb-2">
          Hello World!
        </h1>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          If you can see this, your routing works perfectly on Vercel. The page is live!
        </p>

        {/* Back Button to return safely to Home */}
        <button
          onClick={() => navigate("/home")}
          className="w-full py-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-2"
        >
          <ArrowLeft size={14} />
          Go Back Home
        </button>
      </div>

    </div>
  );
}


