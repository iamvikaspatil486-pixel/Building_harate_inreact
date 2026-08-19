import React from 'react';
import { MessageSquare } from 'lucide-react';

export default function TypingIndicator(){
  

  

  return (
    <div className="px-4 py-1.5 bg-slate-900/80 border-t border-slate-800/60 flex items-center gap-2 text-xs text-cyan-400 font-medium animate-pulse">
      <MessageSquare size={14} className="text-cyan-400 animate-bounce" />
      <span>
      how many people are typing indicator feature is coming sooooooon..
      </span>
    </div>
  );
}

