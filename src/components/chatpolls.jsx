import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, X, Send, Loader2, CheckCircle, BarChart2, Lock } from 'lucide-react';

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
    setOptions((prev) => prev.map((o, idx) => idx === i ? val : o));
  };

  const handleCreate = async () => {
    if (!question.trim()) { setError('Enter a question'); return; }
    const filledOptions = options.filter((o) => o.trim());
    if (filledOptions.length < 2) { setError('Add at least 2 options'); return; }

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
      className="fixed inset-0 z-50 bg-black/50 flex items-end"
      style={{ backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full bg-[#0f172a] rounded-t-3xl flex flex-col shadow-2xl border-t border-slate-800 max-w-lg mx-auto"
        style={{ maxHeight: '85vh', animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1)' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <p className="font-bold text-slate-100 text-sm">Create Poll</p>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Question */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
              Question *
            </label>
            <textarea
              value={question}
              onChange={(e) => { setQuestion(e.target.value); setError(''); }}
              placeholder="Ask your batchmates something…"
              rows={2}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-blue-500/50 transition resize-none"
            />
          </div>

          {/* Options */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
              Options (2–6)
            </label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-bold w-4 flex-shrink-0">{i + 1}</span>
                  <input
                    value={opt}
                    onChange={(e) => { updateOption(i, e.target.value); setError(''); }}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-blue-500/50 transition"
                  />
                  {options.length > 2 && (
                    <button onClick={() => removeOption(i)} className="text-slate-600 hover:text-red-400 transition flex-shrink-0">
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 6 && (
              <button
                onClick={addOption}
                className="mt-2 flex items-center gap-1.5 text-xs text-blue-400 font-bold active:scale-95 transition"
              >
                <Plus size={14} /> Add option
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-600">
            ⏰ Poll auto-ends after 10 hours or when you end it
          </p>
        </div>

        <div className="px-4 py-3 border-t border-slate-800"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full py-3.5 rounded-2xl font-black text-sm text-white disabled:opacity-40 active:scale-95 transition flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #2563eb, #0284c7)' }}
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

  // Total votes
  const totalVotes = Object.keys(poll.votes || {}).length;

  // Votes per option
  const votesPerOption = (poll.options || []).map((_, i) =>
    Object.values(poll.votes || {}).filter((v) => v === i).length
  );

  // Realtime
  useEffect(() => {
    const ch = supabase.channel(`poll-${poll.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'chat_polls',
        filter: `id=eq.${poll.id}`,
      }, (payload) => {
        setPoll(payload.new);
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [poll.id]);

  // Auto-end check
  useEffect(() => {
    if (new Date(poll.ends_at) < new Date() && poll.status === 'active') {
      supabase.from('chat_polls').update({ status: 'ended' }).eq('id', poll.id);
    }
  }, [poll]);

  const handleVote = async (optionIndex) => {
    if (hasVoted || isEnded || voting) return;
    setVoting(true);
    const newVotes = { ...poll.votes, [currentUser?.id]: optionIndex };
    await supabase.from('chat_polls').update({ votes: newVotes }).eq('id', poll.id);
    setVoting(false);
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
      className={`rounded-3xl overflow-hidden border max-w-[280px] ${
        isMe ? 'border-blue-500/30' : 'border-slate-700/60'
      }`}
      style={{ background: isMe ? 'rgba(37,99,235,0.15)' : '#1e293b' }}
    >
      {/* Poll header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-1.5 mb-2">
          <BarChart2 size={13} className="text-blue-400 flex-shrink-0" />
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Poll</span>
          {isEnded && (
            <span className="ml-auto text-[10px] font-bold text-slate-500 flex items-center gap-1">
              <Lock size={10} /> Ended
            </span>
          )}
        </div>
        <p className="text-sm font-bold text-slate-100 leading-snug">{poll.question}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">by @{poll.username}</p>
      </div>

      {/* Options */}
      <div className="px-3 pb-3 space-y-2">
        {(poll.options || []).map((opt, i) => {
          const isMyChoice = myVote === i;
          const percentage = pct(i);
          const optVotes = votesPerOption[i];

          return (
            <button
              key={i}
              onClick={() => handleVote(i)}
              disabled={hasVoted || isEnded || voting}
              className={`w-full rounded-xl relative overflow-hidden text-left transition active:scale-[0.98] disabled:cursor-default ${
                isMyChoice
                  ? 'border border-blue-500/60'
                  : 'border border-slate-700/50'
              }`}
              style={{ background: isMyChoice ? 'rgba(37,99,235,0.2)' : 'rgba(15,23,42,0.6)' }}
            >
              {/* Progress bar */}
              {showResults && (
                <div
                  className={`absolute inset-y-0 left-0 rounded-xl transition-all duration-500 ${
                    isMyChoice ? 'bg-blue-500/20' : 'bg-slate-600/20'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              )}

              <div className="relative flex items-center justify-between px-3 py-2.5 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {isMyChoice && <CheckCircle size={13} className="text-blue-400 flex-shrink-0" />}
                  <span className="text-sm text-slate-200 truncate">{opt}</span>
                </div>
                {showResults && (
                  <div className="flex-shrink-0 text-right">
                    <span className="text-xs font-black text-slate-300">{percentage}%</span>
                    <span className="text-[10px] text-slate-500 ml-1">({optVotes})</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-700/40 flex items-center justify-between">
        <span className="text-[10px] text-slate-500">
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
          {!hasVoted && !isEnded && ' · tap to vote'}
        </span>
        {isCreator && !isEnded && (
          <button
            onClick={handleEnd}
            disabled={ending}
            className="text-[10px] text-red-400 font-bold active:scale-95 transition"
          >
            {ending ? '…' : 'End poll'}
          </button>
        )}
      </div>
    </div>
  );
}

