import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Loader2, Sparkles, Send, Heart, ShieldCheck, Zap, MessageSquareText, Lock } from 'lucide-react';

const GRAD = [
  'from-violet-600 via-fuchsia-600 to-pink-500',
  'from-cyan-500 via-blue-600 to-indigo-600',
  'from-rose-500 via-pink-600 to-purple-600',
  'from-emerald-400 via-teal-600 to-cyan-600',
  'from-amber-400 via-orange-500 to-red-500',
  'from-fuchsia-500 via-purple-600 to-indigo-600',
];
const grad = (name = '') => GRAD[(name?.charCodeAt(0) || 0) % GRAD.length];

export default function ViewProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFullAvatar, setShowFullAvatar] = useState(false);

  // Confession state
  const [confession, setConfession] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('students')
        .select('full_name, bio, batch_id, nickname, roll_no')
        .eq('id', id)
        .single();

      if (error || !data) { setStudent(null); setLoading(false); return; }

      let batchData = null;
      if (data.batch_id) {
        const { data: batch } = await supabase
          .from('batches')
          .select('batch_name, college_name')
          .eq('id', data.batch_id)
          .single();
        batchData = batch;
      }

      setStudent({ ...data, batches: batchData });
      setLoading(false);
    };
    fetch();
  }, [id]);

  const sendConfession = async () => {
    if (!confession.trim()) return;
    if (confession.trim().length < 5) { setError('Too short — write at least 5 characters'); return; }
    setSending(true);
    setError('');
    try {
      const token = crypto.randomUUID();
      const { data, error: insertErr } = await supabase
        .from('confessions')
        .insert({
      from_student_id: currentUser.id,
          to_student_id: id,
          message: confession.trim(),
          token,
          status: 'pending',
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Save token so sender can access this confession later
      const tokens = JSON.parse(localStorage.getItem('confession_tokens') || '[]');
      tokens.push({
        token,
        confession_id: data.id,
        to_student_id: id,
        to_name: student.full_name,
      });
      localStorage.setItem('confession_tokens', JSON.stringify(tokens));

      setConfession('');
      navigate(`/viewconfession/${data.id}?role=confessor`);
    } catch (err) {
      setError('Failed to send. Try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute w-72 h-72 bg-fuchsia-600/20 rounded-full blur-[120px] animate-pulse" />
      <Loader2 size={32} className="animate-spin text-fuchsia-400 z-10" />
      <p className="text-xs text-slate-400 font-semibold mt-3 tracking-widest uppercase z-10">Catching the vibe...</p>
    </div>
  );

  if (!student) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl">
        🔍
      </div>
      <div>
        <h3 className="text-lg font-black text-white">Student Not Found</h3>
        <p className="text-slate-400 text-xs mt-1">This profile doesn't exist or was removed.</p>
      </div>
      <button 
        onClick={() => navigate(-1)} 
        className="px-6 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white font-bold text-xs tracking-wide active:scale-95 transition"
      >
        Go Back
      </button>
    </div>
  );

  const firstName = student.full_name?.split(' ')[0] || 'them';
  const initial = student.full_name?.[0]?.toUpperCase() || '?';
  const avatarGrad = grad(student.full_name);
  const isOwnProfile = currentUser?.id === id;

  const quickPrompts = [
    `You have top tier energy ✨`,
    `hi crush`,
    `Let's hang out sometime! ☕`,
  ];

  return (
    <>
      {/* Fullscreen Avatar Modal */}
      {showFullAvatar && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn"
          onClick={() => setShowFullAvatar(false)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <div className={`w-64 h-64 rounded-full bg-gradient-to-br ${avatarGrad} flex items-center justify-center shadow-[0_0_80px_rgba(217,70,239,0.4)] border-4 border-white/20`}>
              <span className="text-8xl font-black text-white drop-shadow-md">{initial}</span>
            </div>
            <p className="text-center text-xs text-slate-400 font-medium mt-4">Tap anywhere to close</p>
          </div>
        </div>
      )}

      {/* Main Page Layout */}
      <div className="min-h-screen w-full bg-slate-950 text-white relative overflow-x-hidden selection:bg-fuchsia-500 selection:text-white">
        
        {/* Ambient Glows */}
        <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-fuchsia-600/25 blur-[140px] rounded-full" />
        <div className="pointer-events-none fixed top-1/3 -right-20 w-80 h-80 bg-cyan-500/20 blur-[130px] rounded-full" />
        <div className="pointer-events-none fixed bottom-10 -left-20 w-80 h-80 bg-violet-600/20 blur-[130px] rounded-full" />

        {/* Top Sticky Header */}
        <header className="sticky top-0 z-30 w-full px-4 h-16 flex items-center justify-between bg-slate-950/60 backdrop-blur-2xl border-b border-white/10">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-200 active:scale-90 hover:bg-white/10 transition"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-300">Profile</span>
          </div>

          <div className="w-10" />
        </header>

        <main className="relative z-10 px-4 pt-6 max-w-md mx-auto w-full pb-28 space-y-6">

          {/* Profile Hero Section */}
          <div className="flex flex-col items-center text-center">
            {/* Avatar Container */}
            <div className="relative group">
              <button 
                onClick={() => setShowFullAvatar(true)} 
                className="relative active:scale-95 transition-transform duration-200 focus:outline-none"
              >
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-pink-500 blur-lg opacity-70 group-hover:opacity-100 transition duration-300" />
                <div className="relative w-32 h-32 rounded-full p-[3px] bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-pink-500">
                  <div className={`w-full h-full rounded-full bg-gradient-to-br ${avatarGrad} flex items-center justify-center shadow-inner`}>
                    <span className="text-5xl font-black text-white drop-shadow-lg">{initial}</span>
                  </div>
                </div>
              </button>
              <div className="absolute -bottom-1 right-2 bg-slate-900 border border-white/20 px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-300 shadow-md">
                PFP soon ✨
              </div>
            </div>

            {/* Name & Nickname */}
            <div className="mt-4 space-y-1">
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
                {student.full_name}
              </h1>
              {student.nickname && (
                <div className="inline-block px-3 py-0.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-extrabold tracking-wide">
                  @{student.nickname}
                </div>
              )}
            </div>

            {/* Roll Number Pill */}
            {student.roll_no && (
              <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold text-cyan-300">
                <Zap size={12} className="text-cyan-400" />
                <span>Roll No: {student.roll_no}</span>
              </div>
            )}
          </div>

          {/* Batch Info Banner */}
          {student.batches && (
            <div className="relative rounded-3xl p-[1px] bg-gradient-to-r from-cyan-500/30 via-fuchsia-500/30 to-pink-500/30 shadow-xl">
              <div className="rounded-3xl bg-slate-900/80 backdrop-blur-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-fuchsia-400 uppercase tracking-wider">Campus Batch</p>
                  <p className="text-sm font-black text-white mt-0.5">{student.batches.batch_name}</p>
                  {student.batches.college_name && (
                    <p className="text-xs text-slate-400 mt-0.5">{student.batches.college_name}</p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-300">
                  <Sparkles size={18} />
                </div>
              </div>
            </div>
          )}

          {/* Bio Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] font-bold tracking-widest uppercase text-slate-400 flex items-center gap-1.5">
                <MessageSquareText size={13} className="text-fuchsia-400" />
                Vibe & Bio
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-4 min-h-[90px] relative overflow-hidden">
              {student.bio ? (
                <p className="text-sm text-slate-200 leading-relaxed font-medium whitespace-pre-wrap">{student.bio}</p>
              ) : (
                <p className="text-xs text-slate-500 italic text-center py-4">No bio added yet. Living in the moment 🌿</p>
              )}
            </div>
          </div>

          {/* ── Anonymous Confession Card (Hidden on own profile) ── */}
          {!isOwnProfile && (
            <div className="relative rounded-3xl p-[1px] bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 shadow-2xl">
              <div className="rounded-3xl bg-slate-950/90 backdrop-blur-2xl p-5 space-y-4">

                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/25">
                      <Heart size={18} fill="white" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-white">Confess to {firstName}</h2>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                        <Lock size={10} className="text-emerald-400" /> 100% Anonymous & Secure
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Prompts */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {quickPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setConfession(prompt); setError(''); }}
                      className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-slate-300 transition active:scale-95"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {/* Input Area */}
                <div className="relative">
                  <textarea
                    value={confession}
                    onChange={(e) => { setConfession(e.target.value.slice(0, 300)); setError(''); }}
                    placeholder={`Say something real to ${firstName} anonymously...`}
                    rows={4}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-2xl p-3.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-fuchsia-500/60 focus:ring-1 focus:ring-fuchsia-500/60 transition resize-none leading-relaxed"
                  />
                  
                  {/* Character progress bar */}
                  <div className="absolute bottom-2.5 right-3 flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500">
                      {confession.length}/300
                    </span>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium text-center">
                    {error}
                  </div>
                )}

                {/* Action Bar */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                    <ShieldCheck size={14} className="text-fuchsia-400" />
                    <span>Identity Protected</span>
                  </div>

                  <button
                    onClick={sendConfession}
                    disabled={!confession.trim() || sending}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs text-white bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 hover:opacity-95 active:scale-95 disabled:opacity-40 transition shadow-lg shadow-fuchsia-500/25"
                  >
                    {sending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    <span>{sending ? 'Sending...' : 'Send Confession'}</span>
                  </button>
                </div>

                {/* Chat Explanation Note */}
                <div className="flex items-start gap-2.5 bg-white/[0.03] border border-white/5 rounded-2xl p-3">
                  <span className="text-sm">💬</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Once sent, you'll open an anonymous chat where <strong className="text-slate-200">{firstName}</strong> can respond without knowing who you are.
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* Coming Soon Teaser */}
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-5 text-center relative overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 border border-white/10 flex items-center justify-center mx-auto mb-2.5 text-fuchsia-300">
              <Sparkles size={18} />
            </div>
            <h4 className="text-xs font-black text-white tracking-wide uppercase">More features unlocking</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Direct messages, mutual friends, and profile custom colors dropping soon.
            </p>
          </div>

        </main>
      </div>
    </>
  );
}

