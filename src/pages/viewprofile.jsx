import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Loader2, Sparkles, Send, Heart } from 'lucide-react';

const GRAD = [
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-blue-600',
  'from-rose-500 to-pink-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-500',
  'from-fuchsia-500 to-pink-500',
];
const grad = (name = '') => GRAD[(name?.charCodeAt(0) || 0) % GRAD.length];

export default function ViewProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFullAvatar, setShowFullAvatar] = useState(false);

  // Confession
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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center">
      <Loader2 size={26} className="animate-spin text-fuchsia-300" />
    </div>
  );

  if (!student) return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 flex flex-col items-center justify-center gap-3 px-6">
      <p className="text-slate-300 text-sm">Couldn't find this student</p>
      <button onClick={() => navigate(-1)} className="text-cyan-300 text-sm font-bold">Go back</button>
    </div>
  );

  const initial = student.full_name?.[0]?.toUpperCase() || '?';
  const avatarGrad = grad(student.full_name);
  const isOwnProfile = currentUser?.id === id;

  return (
    <>
      {showFullAvatar && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setShowFullAvatar(false)}
        >
          <div
            className={`w-56 h-56 rounded-full bg-gradient-to-br ${avatarGrad} flex items-center justify-center shadow-[0_0_60px_rgba(217,70,239,0.35)]`}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-7xl font-black text-white">{initial}</span>
          </div>
        </div>
      )}

      <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-white relative overflow-x-hidden">
        {/* Glows */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-fuchsia-500/20 blur-[120px] rounded-full" />
        <div className="pointer-events-none absolute bottom-10 right-0 w-64 h-64 bg-cyan-500/15 blur-[100px] rounded-full" />

        {/* Header */}
        <header className="sticky top-0 z-20 w-full px-4 h-14 flex items-center gap-3 bg-slate-950/70 backdrop-blur-xl border-b border-white/5">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center active:scale-90 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <p className="font-bold text-sm truncate text-white/90 flex-1">{student.full_name}</p>
        </header>

        <main className="relative z-10 px-4 py-6 max-w-md mx-auto w-full pb-24 space-y-5">

          {/* Avatar */}
          <div className="flex flex-col items-center">
            <button onClick={() => setShowFullAvatar(true)} className="active:scale-95 transition relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-pink-500 blur-md opacity-50" />
              <div className="relative w-28 h-28 rounded-full p-[3px] bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-pink-500">
                <div className={`w-full h-full rounded-full bg-gradient-to-br ${avatarGrad} flex items-center justify-center`}>
                  <span className="text-4xl font-black text-white">{initial}</span>
                </div>
              </div>
            </button>
            <p className="text-[11px] text-slate-500 mt-3">pfp feature coming soon</p>
          </div>

          {/* Name block */}
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight text-white">{student.full_name}</h1>
            {student.nickname && (
              <p className="text-sm text-fuchsia-300 font-semibold mt-1">@{student.nickname}</p>
            )}
            {student.roll_no && (
              <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wide bg-white/5 border border-white/10 text-cyan-200">
                Roll {student.roll_no}
              </div>
            )}
          </div>

          {/* Batch card */}
          {student.batches && (
            <div className="rounded-3xl p-[1px] bg-gradient-to-r from-cyan-400/40 via-fuchsia-500/40 to-pink-500/40">
              <div className="rounded-3xl bg-slate-950/80 backdrop-blur-xl px-4 py-4">
                <p className="text-sm font-bold text-white">{student.batches.batch_name}</p>
                {student.batches.college_name && (
                  <p className="text-xs text-slate-400 mt-1">{student.batches.college_name}</p>
                )}
              </div>
            </div>
          )}

          {/* Bio */}
          <div>
            <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-fuchsia-300/80 mb-2 px-1">
              About the vibe
            </p>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 min-h-[88px]">
              {student.bio ? (
                <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap">{student.bio}</p>
              ) : (
                <p className="text-sm text-slate-500 text-center py-2">No bio yet</p>
              )}
            </div>
          </div>

          {/* ── Confession box — hidden on own profile ── */}
          {!isOwnProfile && (
            <div className="rounded-3xl p-[1px] bg-gradient-to-r from-pink-500/40 via-fuchsia-500/40 to-rose-500/40">
              <div className="rounded-3xl bg-slate-950/90 backdrop-blur-xl px-4 py-5">

                {/* Header */}
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center flex-shrink-0">
                    <Heart size={14} className="text-white" fill="white" />
                  </div>
                  <p className="text-sm font-black text-white">
                    Confess to {student.full_name?.split(' ')[0]}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 mb-4 ml-9 leading-relaxed">
                  100% anonymous — your identity is never stored or revealed.
                </p>

                {/* Textarea */}
                <textarea
                  value={confession}
                  onChange={(e) => { setConfession(e.target.value.slice(0, 300)); setError(''); }}
                  placeholder={`Say something to ${student.full_name?.split(' ')[0]} anonymously…`}
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-fuchsia-500/50 transition resize-none leading-relaxed"
                />

                {/* Footer */}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-600 tabular-nums">
                      {confession.length}/300
                    </span>
                    {error && (
                      <span className="text-[11px] text-red-400">{error}</span>
                    )}
                  </div>

                  <button
                    onClick={sendConfession}
                    disabled={!confession.trim() || sending}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm text-white disabled:opacity-30 active:scale-95 transition"
                    style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)' }}
                  >
                    {sending
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Heart size={14} fill="white" />
                    }
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>

                {/* Anonymous note */}
                <div className="mt-4 flex items-start gap-2 bg-white/[0.03] border border-white/5 rounded-2xl px-3 py-2.5">
                  <span className="text-base flex-shrink-0">🔒</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    After sending, you'll enter an anonymous chat where{' '}
                    <span className="text-slate-400 font-semibold">{student.full_name?.split(' ')[0]}</span>{' '}
                    can reply — neither of you will know who the other is.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Coming soon */}
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-6 text-center">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 border border-white/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles size={18} className="text-fuchsia-300" />
            </div>
            <p className="text-sm font-bold text-white">More energy loading...</p>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed px-2">
              DMs and other features are on the way. Stay in the loop.
            </p>
          </div>

        </main>
      </div>
    </>
  );
}

