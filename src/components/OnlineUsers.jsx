export default function OnlineUsers({ onlineUsers }) {
  const label = !onlineUsers?.length
    ? 'No one else is viewing this page rn'
    : onlineUsers.length === 1
      ? `${onlineUsers[0]} is here`
      : onlineUsers.length <= 3
        ? `${onlineUsers.join(', ')} are here`
        : `${onlineUsers[0]}, ${onlineUsers[1]} +${onlineUsers.length - 2} more online`;

  const isEmpty = !onlineUsers?.length;

  return (
    <div className="flex-shrink-0 px-4 py-2 border-b border-emerald-900/40 bg-emerald-950/30">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
          isEmpty
            ? 'bg-slate-600'
            : 'bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]'
        }`} />
        <p className={`text-[11px] font-semibold truncate ${
          isEmpty ? 'text-slate-500' : 'text-emerald-400'
        }`}>
          {label}
        </p>
      </div>
    </div>
  );
}
