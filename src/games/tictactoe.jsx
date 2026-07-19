import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Loader2, Copy, Check, Users, Hash, Send, SmilePlus } from 'lucide-react';

const LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

const checkWinner = (board) => {
  for (const [a,b,c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a,b,c] };
    }
  }
  return null;
};

const genRoomCode = () => Math.random().toString(36).slice(2,8).toUpperCase();

const QUICK_EMOJIS = ['😂','🔥','💀','😭','👀','💯','🤝','😮'];

// ── Floating Emoji ────────────────────────────────────────────────────────────
function FloatingEmoji({ item }) {
  return (
    <div
      key={item.id}
      className="fixed pointer-events-none z-50 text-4xl"
      style={{
        left: `${item.x}%`,
        bottom: '120px',
        animation: 'floatUp 2s ease-out forwards',
      }}
    >
      {item.emoji}
    </div>
  );
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
function Leaderboard({ myUsername }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');

  useEffect(() => { fetchLeaderboard(); }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ttt_leaderboard')
      .select('student_id, full_name, wins, losses, draws, total_games')
      .order('wins', { ascending: false })
      .limit(10);
    setRows(data || []);
    setLoading(false);
  };

  const winPct = (row) => {
    if (!row.total_games) return '0%';
    return `${Math.round((row.wins / row.total_games) * 100)}%`;
  };

  const medal = (i) => ['🥇','🥈','🥉'][i] || `#${i + 1}`;

  return (
    <div className="w-full max-w-sm mt-4 bg-white rounded-3xl shadow-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="font-black text-gray-900 text-base">🏆 Leaderboard</p>
        <button onClick={fetchLeaderboard} className="text-xs text-blue-500 font-bold">Refresh</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 size={20} className="animate-spin text-gray-300" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">No games played yet</p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-5 text-[10px] font-black text-gray-400 uppercase tracking-wider px-2 mb-1">
            <span className="col-span-2">Player</span>
            <span className="text-center">W</span>
            <span className="text-center">D</span>
            <span className="text-center">Win%</span>
          </div>

          {rows.map((row, i) => {
            const isMe = row.student_id === currentUser?.id;
            return (
              <div key={row.student_id || i}
                className={`grid grid-cols-5 items-center px-3 py-2.5 rounded-2xl ${isMe ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                <div className="col-span-2 flex items-center gap-2 min-w-0">
                  <span className="text-sm flex-shrink-0">{medal(i)}</span>
                  <span className={`text-xs font-bold truncate ${isMe ? 'text-blue-600' : 'text-gray-800'}`}>
                    {row.full_name || 'Unknown'}{isMe ? ' (you)' : ''}
                  </span>
                </div>
                <span className="text-center text-xs font-black text-emerald-600">{row.wins}</span>
                <span className="text-center text-xs font-bold text-amber-500">{row.draws}</span>
                <span className="text-center text-xs font-black text-blue-500">{winPct(row)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Lobby ─────────────────────────────────────────────────────────────────────
function Lobby({ username, onJoinGame }) {
  const [mode, setMode] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [waitingGameId, setWaitingGameId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [createdCode, setCreatedCode] = useState('');
  const channelRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');

  useEffect(() => {
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, []);

  const handleQuickMatch = async () => {
    setLoading(true); setError(''); setMode('quick');
    try {
      const { data: waiting } = await supabase
        .from('matchmaking_queue').select('*')
        .eq('status', 'waiting')
        .neq('student_id', currentUser?.id || 'none')
        .order('created_at', { ascending: true }).limit(1);

      if (waiting?.length > 0) {
        const opponent = waiting[0];
        const code = genRoomCode();
        const { data: game, error: gameErr } = await supabase
          .from('tictactoe_games').insert({
            room_code: code, player1: opponent.username, player2: username,
            player1_id: opponent.student_id, player2_id: currentUser?.id || null,
            board: ['','','','','','','','',''], current_turn: opponent.username, status: 'playing',
          }).select().single();
        if (gameErr) throw gameErr;
        await supabase.from('matchmaking_queue').update({ status: 'matched' }).eq('id', opponent.id);
        setLoading(false);
        onJoinGame(game, 'O', username);
      } else {
        await supabase.from('matchmaking_queue').delete().eq('student_id', currentUser?.id || 'none');
        const { data: queueRow } = await supabase
          .from('matchmaking_queue').insert({
            student_id: currentUser?.id || null, username,
            batch_id: JSON.parse(localStorage.getItem('selectedBatch') || '{}')?.batchId || null,
            status: 'waiting',
          }).select().single();

        const ch = supabase.channel(`queue-${queueRow.id}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tictactoe_games' }, async (payload) => {
            const g = payload.new;
            if (g.player1 === username || g.player2 === username) {
              await supabase.from('matchmaking_queue').delete().eq('id', queueRow.id);
              supabase.removeChannel(ch);
              channelRef.current = null;
              setLoading(false);
              onJoinGame(g, g.player1 === username ? 'X' : 'O', username);
            }
          }).subscribe();
        channelRef.current = ch;
        setWaitingGameId(queueRow.id);

        setTimeout(async () => {
          if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
            await supabase.from('matchmaking_queue').delete().eq('id', queueRow.id);
            setLoading(false); setMode(null);
            setError('No one found. Try again or create a room.');
          }
        }, 60000);
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Try again.');
      setLoading(false); setMode(null);
    }
  };

  const cancelQueue = async () => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = null;
    if (waitingGameId) await supabase.from('matchmaking_queue').delete().eq('id', waitingGameId);
    setWaitingGameId(null); setLoading(false); setMode(null);
  };

  const handleCreateRoom = async () => {
    setLoading(true); setError('');
    const code = genRoomCode();
    try {
      const { data: game, error: gameErr } = await supabase
        .from('tictactoe_games').insert({
          room_code: code, player1: username, player1_id: currentUser?.id || null,
          board: ['','','','','','','','',''], current_turn: username, status: 'waiting',
        }).select().single();
      if (gameErr) throw gameErr;
      setCreatedCode(code); setMode('create'); setLoading(false);
      const ch = supabase.channel(`room-wait-${game.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tictactoe_games', filter: `id=eq.${game.id}` }, (payload) => {
          const g = payload.new;
          if (g.status === 'playing' && g.player2) {
            supabase.removeChannel(ch); channelRef.current = null;
            onJoinGame(g, 'X', username);
          }
        }).subscribe();
      channelRef.current = ch;
    } catch (err) {
      setError('Failed to create room. Try again.'); setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) { setError('Enter a room code'); return; }
    setLoading(true); setError('');
    try {
      const { data: game, error: findErr } = await supabase
        .from('tictactoe_games').select('*')
        .eq('room_code', roomCode.trim().toUpperCase()).eq('status', 'waiting').single();
      if (findErr || !game) { setError('Room not found or already started.'); setLoading(false); return; }
      if (game.player1 === username) { setError('You created this room — share the code with a friend.'); setLoading(false); return; }
      const { data: updated, error: updateErr } = await supabase
        .from('tictactoe_games').update({ player2: username, player2_id: currentUser?.id || null, status: 'playing' })
        .eq('id', game.id).select().single();
      if (updateErr) throw updateErr;
      setLoading(false);
      onJoinGame(updated, 'O', username);
    } catch (err) {
      setError('Failed to join. Try again.'); setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 pb-10">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
        <h1 className="text-2xl font-black text-gray-900 text-center mb-1">Tic Tac Toe</h1>
        <p className="text-gray-400 text-sm text-center mb-6">Playing as <span className="font-bold text-blue-500">@{username}</span></p>
        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl mb-4">{error}</div>}

        {mode === 'quick' && loading && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
              <Loader2 size={26} className="animate-spin text-blue-500" />
            </div>
            <p className="font-bold text-gray-900">Finding a match…</p>
            <p className="text-gray-400 text-xs">Waiting for another player</p>
            <button onClick={cancelQueue} className="text-sm text-red-400 underline underline-offset-2">Cancel</button>
          </div>
        )}

        {mode === 'create' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-sm text-gray-500">Share this code with your friend:</p>
            <button onClick={() => { navigator.clipboard.writeText(createdCode); }}
              className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 active:scale-95 transition">
              <span className="text-2xl font-black text-blue-600 tracking-widest font-mono">{createdCode}</span>
              <Copy size={18} className="text-gray-400" />
            </button>
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-gray-400" />
              <p className="text-gray-400 text-xs">Waiting for friend to join…</p>
            </div>
            <button onClick={() => { if (channelRef.current) supabase.removeChannel(channelRef.current); setMode(null); }}
              className="text-sm text-red-400 underline underline-offset-2">Cancel</button>
          </div>
        )}

        {!mode && (
          <div className="space-y-3">
            <button onClick={handleQuickMatch} disabled={loading}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-blue-600 text-white font-bold active:scale-95 transition disabled:opacity-40">
              <Users size={20} />
              <div className="text-left">
                <p className="text-sm font-black">Quick Match</p>
                <p className="text-[11px] text-blue-200 font-normal">Auto-pair with a random player</p>
              </div>
            </button>
            <button onClick={handleCreateRoom} disabled={loading}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gray-900 text-white font-bold active:scale-95 transition disabled:opacity-40">
              <Hash size={20} />
              <div className="text-left">
                <p className="text-sm font-black">Create Room</p>
                <p className="text-[11px] text-gray-400 font-normal">Get a code and invite a friend</p>
              </div>
            </button>
            <div className="flex items-center gap-2">
              <input value={roomCode}
                onChange={(e) => { setRoomCode(e.target.value.toUpperCase()); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                placeholder="Enter room code" maxLength={6}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono font-bold tracking-widest outline-none focus:border-blue-400 transition" />
              <button onClick={handleJoinRoom} disabled={loading || !roomCode.trim()}
                className="px-4 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm active:scale-95 transition disabled:opacity-40">
                Join
              </button>
            </div>
          </div>
        )}
      </div>

      <Leaderboard myUsername={username} />
    </div>
  );
}

// ── Game ──────────────────────────────────────────────────────────────────────
function Game({ game: initialGame, mySymbol, myUsername, onLeave }) {
  const [game, setGame] = useState(initialGame);
  const [board, setBoard] = useState(initialGame.board || Array(9).fill(''));
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const channelRef = useRef(null);
  const chatBottomRef = useRef();

  const result = checkWinner(board);
  const winner = result?.winner;
  const winningLine = result?.line || [];
  const isDraw = !winner && board.every((c) => c !== '');
  const isMyTurn = game.current_turn === myUsername;
  const opponentUsername = mySymbol === 'X' ? game.player2 : game.player1;

  useEffect(() => {
    // Game state channel
    const ch = supabase.channel(`game-${game.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tictactoe_games', filter: `id=eq.${game.id}` }, (payload) => {
        const g = payload.new;
        setGame(g);
        setBoard(g.board || Array(9).fill(''));
      })
      // Broadcast: emoji reactions
      .on('broadcast', { event: 'emoji' }, (payload) => {
        spawnEmoji(payload.payload.emoji, payload.payload.from !== myUsername);
      })
      // Broadcast: chat messages
      .on('broadcast', { event: 'chat' }, (payload) => {
        const msg = payload.payload;
        setChatMessages((prev) => [...prev, msg]);
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .subscribe();

    channelRef.current = ch;
    return () => supabase.removeChannel(ch);
  }, [game.id]);

  const spawnEmoji = (emoji, fromLeft) => {
    const id = Date.now() + Math.random();
    const x = fromLeft ? 15 + Math.random() * 25 : 60 + Math.random() * 25;
    setFloatingEmojis((prev) => [...prev, { id, emoji, x }]);
    setTimeout(() => setFloatingEmojis((prev) => prev.filter((e) => e.id !== id)), 2000);
  };

  const sendEmoji = async (emoji) => {
    setShowEmojiPicker(false);
    spawnEmoji(emoji, false);
    channelRef.current?.send({ type: 'broadcast', event: 'emoji', payload: { emoji, from: myUsername } });
  };

  const sendChat = () => {
    if (!chatText.trim()) return;
    const msg = { from: myUsername, text: chatText.trim(), id: Date.now() };
    setChatMessages((prev) => [...prev, msg]);
    channelRef.current?.send({ type: 'broadcast', event: 'chat', payload: msg });
    setChatText('');
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const updateLeaderboard = async (winnerSymbol, isDraw) => {
    const p1Id = game.player1_id;
    const p2Id = game.player2_id;
    if (!p1Id || !p2Id) return;

    // Fetch real names from students table
    const { data: students } = await supabase
      .from('students')
      .select('id, full_name')
      .in('id', [p1Id, p2Id]);

    const getName = (id) => students?.find((s) => s.id === id)?.full_name || 'Unknown';

    const p1Name = getName(p1Id);
    const p2Name = getName(p2Id);

    const winnerName = isDraw ? null : (winnerSymbol === 'X' ? p1Name : p2Name);
    const loserName  = isDraw ? null : (winnerSymbol === 'X' ? p2Name : p1Name);
    const winnerId   = isDraw ? null : (winnerSymbol === 'X' ? p1Id : p2Id);
    const loserId    = isDraw ? null : (winnerSymbol === 'X' ? p2Id : p1Id);

    const upsert = async (studentId, fullName, win, loss, draw) => {
      const { data: existing } = await supabase
        .from('ttt_leaderboard')
        .select('*')
        .eq('student_id', studentId)
        .single();

      if (existing) {
        await supabase.from('ttt_leaderboard').update({
          full_name: fullName,
          wins: existing.wins + win,
          losses: existing.losses + loss,
          draws: existing.draws + draw,
          total_games: existing.total_games + 1,
          updated_at: new Date().toISOString(),
        }).eq('student_id', studentId);
      } else {
        await supabase.from('ttt_leaderboard').insert({
          student_id: studentId,
          full_name: fullName,
          wins: win, losses: loss, draws: draw, total_games: 1,
        });
      }
    };

    if (isDraw) {
      await upsert(p1Id, p1Name, 0, 0, 1);
      await upsert(p2Id, p2Name, 0, 0, 1);
    } else {
      await upsert(winnerId, winnerName, 1, 0, 0);
      await upsert(loserId,  loserName,  0, 1, 0);
    }
  };

  const handleClick = async (index) => {
    if (!isMyTurn || board[index] !== '' || winner || isDraw) return;
    const newBoard = [...board];
    newBoard[index] = mySymbol;
    const result = checkWinner(newBoard);
    const newWinner = result?.winner || null;
    const newDraw = !newWinner && newBoard.every((c) => c !== '');
    const nextTurn = mySymbol === 'X' ? game.player2 : game.player1;
    await supabase.from('tictactoe_games').update({
      board: newBoard,
      current_turn: newWinner || newDraw ? null : nextTurn,
      winner: newWinner,
      status: newWinner || newDraw ? 'finished' : 'playing',
    }).eq('id', game.id);
    // Only the winning/drawing move triggers leaderboard update (avoid double update)
    if (newWinner || newDraw) {
      await updateLeaderboard(newWinner, newDraw);
    }
  };

  const handleRematch = async () => {
    setChatMessages([]);
    await supabase.from('tictactoe_games').update({
      board: ['','','','','','','','',''],
      current_turn: game.player1, winner: null, status: 'playing',
    }).eq('id', game.id);
  };

const statusText = () => {
    if (!game.player2) return 'Waiting for opponent…';
    if (winner) return winner === mySymbol ? '🎉 You won!' : `😢 ${opponentUsername} won`;
    if (isDraw) return "🤝 It's a draw!";
    return isMyTurn ? '🟢 Your turn' : `⏳ ${opponentUsername}'s turn`;
  };

  return (
    <>
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1);   opacity: 1; }
          100% { transform: translateY(-160px) scale(1.5); opacity: 0; }
        }
      `}</style>

      {/* Floating emojis */}
      {floatingEmojis.map((item) => <FloatingEmoji key={item.id} item={item} />)}

      <div className="flex flex-col min-h-screen bg-gray-50">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <button onClick={onLeave} className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 active:scale-90 transition">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <p className="font-black text-gray-900 text-sm">
              {myUsername} <span className="text-blue-500">({mySymbol})</span>
              {' '}vs{' '}
              {opponentUsername || '?'} <span className="text-red-500">({mySymbol === 'X' ? 'O' : 'X'})</span>
            </p>
            <p className="text-xs text-gray-400">Room: {game.room_code}</p>
          </div>
        </div>

        {/* Status */}
        <p className={`text-center text-base font-black mb-3 ${winner && winner === mySymbol ? 'text-emerald-500' : winner ? 'text-red-500' : isDraw ? 'text-amber-500' : 'text-gray-700'}`}>
          {statusText()}
        </p>

        {/* Board */}
        <div className="grid grid-cols-3 gap-3 px-6 mb-4">
          {board.map((cell, i) => {
            const isWinning = winningLine.includes(i);
            return (
              <button key={i} onClick={() => handleClick(i)}
                className={`aspect-square rounded-2xl text-4xl font-black flex items-center justify-center transition-all active:scale-90
                  ${isWinning ? 'bg-emerald-100 border-2 border-emerald-400 scale-105' : 'bg-white border border-gray-200 shadow-sm'}
                  ${!cell && isMyTurn && !winner && !isDraw ? 'hover:bg-blue-50 cursor-pointer' : 'cursor-default'}
                `}>
                <span className={cell === 'X' ? 'text-blue-500' : cell === 'O' ? 'text-red-500' : ''}>{cell}</span>
              </button>
            );
          })}
        </div>

        {/* Rematch/Leave */}
        {(winner || isDraw) && (
          <div className="flex gap-2 px-6 mb-3">
            <button onClick={handleRematch} className="flex-1 py-3 rounded-2xl bg-gray-900 text-white font-black text-sm active:scale-95 transition">Rematch 🔄</button>
            <button onClick={onLeave} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-black text-sm active:scale-95 transition border border-gray-200">Leave</button>
          </div>
        )}

        {/* Quick emoji strip */}
        <div className="flex items-center gap-2 px-4 mb-3 relative">
          <div className="flex gap-1.5 flex-1 overflow-x-auto">
            {QUICK_EMOJIS.map((emoji) => (
              <button key={emoji} onClick={() => sendEmoji(emoji)}
                className="text-xl w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center active:scale-90 transition flex-shrink-0">
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 mx-4 bg-white border border-gray-100 rounded-2xl flex flex-col overflow-hidden mb-3" style={{ maxHeight: 180 }}>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
            {chatMessages.length === 0 ? (
              <p className="text-gray-300 text-xs text-center py-4">Say something to your opponent 👋</p>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.from === myUsername ? 'justify-end' : 'justify-start'}`}>
                  <div className={`px-3 py-1.5 rounded-2xl text-sm max-w-[75%] ${msg.from === myUsername ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    {msg.from !== myUsername && <span className="text-[10px] font-bold text-blue-500 block mb-0.5">@{msg.from}</span>}
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat input */}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-100">
            <input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              placeholder="Type a message…"
              className="flex-1 bg-gray-50 rounded-full px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 outline-none"
            />
            <button onClick={sendChat} disabled={!chatText.trim()}
              className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white disabled:opacity-30 active:scale-90 transition">
              <Send size={13} />
            </button>
          </div>
        </div>

      </div>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TicTacToe() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('lobby');
  const [currentGame, setCurrentGame] = useState(null);
  const [mySymbol, setMySymbol] = useState('X');

  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');
  const chatSession = JSON.parse(localStorage.getItem('chat_anon_session') || 'null');
  const myUsername = chatSession?.username || currentUser?.name || 'Player';

  const handleJoinGame = (game, symbol) => { setCurrentGame(game); setMySymbol(symbol); setPhase('game'); };
  const handleLeave = () => { setCurrentGame(null); setPhase('lobby'); };

  if (phase === 'game' && currentGame) {
    return <Game game={currentGame} mySymbol={mySymbol} myUsername={myUsername} onLeave={handleLeave} />;
  }

  return (
    <div>
      <div className="flex items-center gap-2 px-4 pt-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 active:scale-90 transition">
          <ArrowLeft size={18} />
        </button>
      </div>
      <Lobby username={myUsername} onJoinGame={handleJoinGame} />
    </div>
  );
}
