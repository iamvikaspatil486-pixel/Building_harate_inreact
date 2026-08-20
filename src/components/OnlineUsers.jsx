export default function OnlineUsers({ onlineUsers }) {
  if (onlineUsers.length === 0) return null;

  const label = onlineUsers.length === 1
    ? `${onlineUsers[0]} is here`
    : onlineUsers.length <= 3
      ? `${onlineUsers.join(', ')} are here`
      : `${onlineUsers[0]}, ${onlineUsers[1]} +${onlineUsers.length - 2} more online`;

  return (
    <div className="flex-shrink-0 px-4 py-1.5 border-b border-slate-900/60 bg-[#090d16]/80">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
        <p className="text-[11px] text-slate-400 truncate">{label}</p>
      </div>
    </div>
  );
}
