import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Check, BarChart3 } from 'lucide-react';

export default function ChatPoll({ poll, currentUserId, onVoted }) {
  const [selected, setSelected] = useState(null);
  const [voting, setVoting] = useState(false);
  const [localPoll, setLocalPoll] = useState(poll);

  const totalVotes = localPoll.options?.reduce((sum, o) => sum + (o.votes || 0), 0) || 0;
  const hasVoted = localPoll.voters?.includes(currentUserId);

  useEffect(() => {
    setLocalPoll(poll);
  }, [poll]);

  const handleVote = async (optionIndex) => {
    if (hasVoted || voting) return;
    setVoting(true);
    setSelected(optionIndex);

    try {
      // 1. Get current poll
      const { data: current } = await supabase
        .from('chat_polls')
        .select('*')
        .eq('id', localPoll.id)
        .single();

      if (!current) throw new Error('Poll not found');

      // Prevent double vote
      if (current.voters?.includes(currentUserId)) {
        setVoting(false);
        return;
      }

      // Update options votes
      const updatedOptions = current.options.map((opt, i) =>
        i === optionIndex ? { ...opt, votes: (opt.votes || 0) + 1 } : opt
      );

      const updatedVoters = [...(current.voters || []), currentUserId];

      const { error } = await supabase
        .from('chat_polls')
        .update({
          options: updatedOptions,
          voters: updatedVoters,
        })
        .eq('id', localPoll.id);

      if (error) throw error;

      setLocalPoll({
        ...current,
        options: updatedOptions,
        voters: updatedVoters,
      });

      onVoted?.(localPoll.id);
    } catch (err) {
      console.error(err);
      alert('Failed to vote');
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="w-full max-w-[280px] rounded-2xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-sm">
      {/* Question */}
      <div className="flex items-start gap-2 mb-3">
        <BarChart3 size={16} className="text-cyan-300 mt-0.5 flex-shrink-0" />
        <p className="text-sm font-bold text-white leading-snug">
          {localPoll.question}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {localPoll.options?.map((opt, i) => {
          const votes = opt.votes || 0;
          const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isSelected = hasVoted && selected === i;
          const showResults = hasVoted;

          return (
            <button
              key={i}
              onClick={() => handleVote(i)}
              disabled={hasVoted || voting}
              className={`relative w-full text-left rounded-xl overflow-hidden border transition active:scale-[0.98] ${
                hasVoted
                  ? isSelected
                    ? 'border-cyan-400/50 bg-cyan-500/10'
                    : 'border-white/10 bg-white/5'
                  : 'border-white/10 bg-white/5 hover:border-cyan-400/40'
              }`}
            >
              {/* Progress bar background */}
              {showResults && (
                <div
                  className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/10 transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              )}

              <div className="relative flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  {isSelected && <Check size={14} className="text-cyan-300 flex-shrink-0" />}
                  <span className="text-sm text-white truncate">{opt.text}</span>
                </div>

                {showResults && (
                  <span className="text-xs font-bold text-slate-300 ml-2 flex-shrink-0">
                    {percent}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <p className="text-[10px] text-slate-500 mt-2.5 px-0.5">
        {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
        {hasVoted ? ' • You voted' : ' • Tap to vote'}
      </p>
    </div>
  );
}
