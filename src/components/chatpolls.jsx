import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, X, Send, Loader2, CheckCircle, Lock } from 'lucide-react';

// ── Create Poll Sheet ─────────────────────────────────────────────────────────
export function CreatePollSheet({ onClose, onCreated, username, batchId }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');

  const addOption = () => {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, '']);
  };

  const removeOption = (i) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateOption = (i, val) => {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  };

  const handleCreate = async () => {
    if (!question.trim()) {
      setError('Enter a question');
      return;
    }
    const filledOptions = options.filter((o) => o.trim());
    if (filledOptions.length < 2) {
      setError('Add at least 2 options');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const endsAt = new Date(Date.now() + 10 * 3600 * 1000).toISOString();
      const { data, error: err } = await supabase
        .from('chat_polls')
        .insert({
          batch_id: batchId,
          created_by: currentUser?.id || null,
          username,
          question: question.trim(),
          options: filledOptions,
          votes: {},
          status: 'active',
          ends_at: endsAt,
        })
        .select()
        .single();

      if (err) throw err;
      onCreated(data);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create poll');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#020617]/70 flex items-end"
      style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg mx-auto bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 rounded-t-[2rem] flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.45)] border-t border-white/10"
        style={{ maxHeight: '85vh', animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1)' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/10" />
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <p className="font-bold text-slate-100 text-sm">Create Poll</p>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-3 rounded-2xl">
              {error}
            </div>
          )}

          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 block mb-1.5">
              Question *
            </label>
            <textarea
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                setError('');
              }}
              placeholder="Ask your batchmates something…"
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400/40 focus:bg-white/7 transition resize-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 block mb-1.5">
              Options (2–6)
            </label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-bold w-4 flex-shrink-0">{i + 1}</span>
                  <input
                    value={opt}
                    onChange={(e) => {
                      updateOption(i, e.target.value);
                      setError('');
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400/40 focus:bg-white/7 transition"
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(i)}
                      className="text-slate-600 hover:text-red-400 transition flex-shrink-0"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 6 && (
              <button
                onClick={addOption}
                className="mt-2 flex items-center gap-1.5 text-xs text-cyan-400 font-bold active:scale-95 transition"
              >
                <Plus size={14} /> Add option
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-500">
            ⏰ Poll auto-ends after 10 hours or when you end it
          </p>
        </div>

        <div
          className="px-4 py-3 border-t border-white/10"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full py-3.5 rounded-2xl font-black text-sm text-white disabled:opacity-40 active:scale-95 transition flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(14,165,233,0.25)]"
            style={{
              background:
                'linear-gradient(135deg, rgba(14,165,233,1), rgba(37,99,235,1), rgba(168,85,247,1))',
            }}
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {creating ? 'Creating…' : 'Create Poll'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Poll Bubble ───────────────────────────────────────────────────────────────
export function PollBubble({ poll: initialPoll, isMe, username }) {
  const [poll, setPoll] = useState(initialPoll);
  const [voting, setVoting] = useState(false);
  const [ending, setEnding] = useState(false);
  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');

  const myVote = poll.votes?.[currentUser?.id];
  const hasVoted = myVote !== undefined && myVote !== null;
  const isCreator = poll.username === username;
  const isEnded = poll.status === 'ended' || new Date(poll.ends_at) < new Date();
  const showResults = hasVoted || isEnded;

  const totalVotes = Object.keys(poll.votes || {}).length;

  const votesPerOption = (poll.options || []).map((_, i) =>
    Object.values(poll.votes || {}).filter((v) => v === i).length
  );

  useEffect(() => {
    setPoll(initialPoll);
  }, [initialPoll]);

  useEffect(() => {
    const ch = supabase
      .channel(`poll-${poll.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_polls',
          filter: `id=eq.${poll.id}`,
        },
        (payload) => {
          setPoll(payload.new);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [poll.id]);

  useEffect(() => {
    if (new Date(poll.ends_at) < new Date() && poll.status === 'active') {
      supabase.from('chat_polls').update({ status: 'ended' }).eq('id', poll.id);
    }
  }, [poll]);

  const handleVote = async (optionIndex) => {
    if (isEnded || voting) return;

    const currentVotes = poll.votes || {};
    const currentChoice = currentVotes[currentUser?.id];
    const newVotes = { ...currentVotes };

    if (currentChoice === optionIndex) {
      delete newVotes[currentUser?.id];
    } else {
      newVotes[currentUser?.id] = optionIndex;
    }

    setPoll((prev) => ({ ...prev, votes: newVotes }));

    setVoting(true);
    try {
      await supabase.from('chat_polls').update({ votes: newVotes }).eq('id', poll.id);
    } catch (err) {
      setPoll((prev) => ({ ...prev, votes: currentVotes }));
    } finally {
      setVoting(false);
    }
  };

  const handleEnd = async () => {
    if (!isCreator || isEnded || ending) return;
    setEnding(true);
    await supabase.from('chat_polls').update({ status: 'ended' }).eq('id', poll.id);
    setEnding(false);
  };

  const pct = (optIdx) => {
    if (!totalVotes) return 0;
    return Math.round((votesPerOption[optIdx] / totalVotes) * 100);
  };

  return (
    <div
      className={`relative rounded-[1.6rem] overflow-hidden border max-w-[290px] shadow-[0_18px_40px_rgba(0,0,0,0.18)] ${
        isMe ? 'border-cyan-400/20' : 'border-white/10'
      }`}
      style={{
        background: isMe
          ? 'linear-gradient(135deg, rgba(14,165,233,0.16), rgba(99,102,241,0.12))'
          : 'linear-gradient(180deg, rgba(15,23,42,0.92), rgba(15,23,42,0.78))',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <div  />
          {isEnded && (
            <span className="ml-auto text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <Lock size={10} /> Ended
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-slate-100 leading-snug">{poll.question}</p>
      </div>

      <div className="relative px-3 pb-3 space-y-2">
        {(poll.options || []).map((opt, i) => {
          const isMyChoice = myVote === i;
          const percentage = pct(i);
          const optVotes = votesPerOption[i];

          return (
            <div
              key={i}
              className="relative w-full rounded-2xl overflow-hidden border border-white/10 bg-[rgba(255,255,255,0.03)]"
              style={{ minHeight: '46px' }}
            >
              {showResults && percentage > 0 && (
                <div
                  className="absolute inset-0 z-0 bg-gradient-to-r from-cyan-400/20 via-sky-400/20 to-blue-500/20 transition-all duration-500 ease-out"
                  style={{ width: `${percentage}%` }}
                />
              )}

              <button
                type="button"
                onClick={() => handleVote(i)}
                disabled={isEnded || voting}
                className="relative z-10 w-full text-left px-3 py-2.5 flex items-center gap-3 disabled:cursor-default"
              >
                <div
                  className={`w-4 h-4 rounded-[5px] border flex items-center justify-center flex-shrink-0 transition ${
                    isMyChoice
                      ? 'border-cyan-300 bg-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.35)]'
                      : 'border-slate-500/70 bg-transparent'
                  }`}
                >
                  {isMyChoice && <CheckCircle size={10} className="text-slate-950" />}
                </div>

                <span className="text-sm text-slate-100 flex-1 truncate">{opt}</span>

                {showResults && (
                  <div className="flex-shrink-0 text-right">
                    <span className="text-xs font-black text-slate-200">{percentage}%</span>
                    <span className="text-[10px] text-slate-500 ml-1">({optVotes})</span>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="relative px-4 py-2 border-t border-white/10 flex items-center justify-between">
        <span className="text-[10px] text-slate-500">
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
          {!hasVoted && !isEnded && ' · tap box to vote'}
        </span>
        {isCreator && !isEnded && (
          <button
            onClick={handleEnd}
            disabled={ending}
            className="text-[10px] text-rose-400 font-bold active:scale-95 transition"
          >
            {ending ? '…' : 'End poll'}
          </button>
        )}
      </div>
    </div>
  );
}
