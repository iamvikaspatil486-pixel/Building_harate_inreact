import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Loader2, Send, Heart, Sparkles } from 'lucide-react';

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
  const [confession, setConfession] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');
  const batch = JSON.parse(localStorage.getItem('selectedBatch') || 'null');
  const myBatchId = batch?.batchId;

  useEffect(() => {
    const fetchStudent = async () => {
      const { data, error } = await supabase
        .from('students')
        .select('full_name, bio, batch_id, nickname, roll_no')
        .eq('id', id)
        .single();

      if (error || !data) { setStudent(null); setLoading(false); return; }

      let batchData = null;
      if (data.batch_id) {
        const { data: b } = await supabase
          .from('batches')
          .select('batch_name, college_name')
          .eq('id', data.batch_id)
          .single();
        batchData = b;
      }

      setStudent({ ...data, batches: batchData });
      setLoading(false);
    };
    fetchStudent();
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

      const tokens = JSON.parse(localStorage.getItem('confession_tokens') || '[]');
      tokens.push({ token, confession_id: data.id, to_student_id: id, to_name: student.full_name });
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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 flex flex-col items-center justify-center gap-3">
      <p className="text-slate-300 text-sm">Couldn't find this student</p>
      <button onClick={() => navigate(-1)} className="text-cyan-300 text-sm font-bold">Go back</button>
    </div>
  );

  const initial = student.full_name?.[0]?.toUpperCase() || '?';
  const avatarGrad = grad(student.full_name);
  const isOwnProfile = currentUser?.id === id;
  const isBatchmate = student.batch_id === myBatchId;

  return (
    <>
      {/* Fullscreen avatar */}
      {showFullAvatar && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setShowFullAvatar(false)}>
          <div className={`w-56 h-56 rounded-full bg-gradient-to-br ${avatarGrad} flex items-center justify-center shadow-2xl`}
            onClick={(e) => e.stopPropagation()}>
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
          <button onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center active:scale-90 transition">
            <ArrowLeft size={18} />
          </button>
          <p className="font-bold text-sm truncate text-white/90 flex-1">Profile Page</p>
        </header>

        <main className="relative z-10 px-4 py-5 max-w-md mx-auto w-full pb-24 space-y-4">

          {/* ── TOP CARD: Avatar + Bio side by side ── */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 flex gap-4 items-start">
            {/* Avatar left */}
            <button onClick={() => setShowFullAvatar(true)} className="active:scale-95 transition flex-shrink-0">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center shadow-lg`}>
                <span className="text-3xl font-black text-white">{initial}</span>
              </div>
            </button>

            {/* Bio right */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-fuchsia-300/80 mb-1">❝</p>
              <p className="text-sm text-slate-200 leading-relaxed">
                {student.bio || <span className="text-slate-500 italic">No bio yet</span>}
              </p>
              <p className="text-[10px] font-black text-fuchsia-300/80 mt-1 text-right">❞</p>
            </div>
          </div>

          {/* ── NAME ROW ── */}
          <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3">
            <h1 className="text-xl font-black text-white">{student.full_name}</h1>
          </div>

          {/* ── DETAILS: nickname, batch, college ── */}
          <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 space-y-2">
            {student.nickname && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 w-16 flex-shrink-0">nickname</span>
                <span className="text-sm text-fuchsia-300 font-semibold">{student.nickname}</span>
              </div>
            )}
            {student.roll_no && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 w-16 flex-shrink-0">roll</span>
                <span className="text-sm text-slate-200">{student.roll_no}</span>
              </div>
            )}
            {student.batches?.batch_name && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 w-16 flex-shrink-0">batch</span>
                <span className="text-sm text-slate-200">{student.batches.batch_name}</span>
              </div>
            )}
            {student.batches?.college_name && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 w-16 flex-shrink-0">college</span>
                <span className="text-sm text-slate-200">{student.batches.college_name}</span>
              </div>
            )}
          </div>

          {/* ── CONFESSION BOX — only for batchmates, not own profile ── */}
          {!isOwnProfile && isBatchmate && (
            <div className="rounded-3xl p-[1px] bg-gradient-to-r from-pink-500/40 via-fuchsia-500/40 to-rose-500/40">
              <div className="rounded-3xl bg-slate-950/90 backdrop-blur-xl px-4 py-5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center flex-shrink-0">
                    <Heart size={14} className="text-white" fill="white" />
                  </div>
                  <p className="text-sm font-black text-white">
                    Confess to {student.full_name?.split(' ')[0]}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 mb-4 ml-9 leading-relaxed">
                  100% anonymous — your identity is never stored.
                </p>

                <textarea
                  value={confession}
                  onChange={(e) => { setConfession(e.target.value.slice(0, 300)); setError(''); }}
                  placeholder={`Say something anonymously…`}
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-fuchsia-500/50 transition resize-none leading-relaxed"
                />

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-600 tabular-nums">{confession.length}/300</span>
                    {error && <span className="text-[11px] text-red-400">{error}</span>}
                  </div>
                  <button
                    onClick={sendConfession}
                    disabled={!confession.trim() || sending}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm text-white disabled:opacity-30 active:scale-95 transition"
                    style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)' }}
                  >
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Heart size={14} fill="white" />}
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>

                <div className="mt-4 flex items-start gap-2 bg-white/[0.03] border border-white/5 rounded-2xl px-3 py-2.5">
                  <span className="text-base flex-shrink-0">🔒</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    After sending you'll enter an anonymous chat — {student.full_name?.split(' ')[0] || 'the recipient'} doesn't know you are sending this confession.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── COMING SOON ── */}
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-6 text-center">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 border border-white/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles size={18} className="text-fuchsia-300" />
            </div>
            <p className="text-sm font-bold text-white">More energy loading...</p>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed px-2">
              DMs and other features are on the way.
            </p>
          </div>

        </main>
      </div>
    </>
  );
}

