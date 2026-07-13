import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Loader2, Copy, Check, Users, Hash } from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────
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

// ── Lobby Screen ──────────────────────────────────────────────────────────────
function Lobby({ username, onJoinGame }) {
  const [mode, setMode] = useState(null); // 'quick' | 'create' | 'join'
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [waitingGameId, setWaitingGameId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [createdCode, setCreatedCode] = useState('');
  const channelRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  // ── Quick Match ──
  const handleQuickMatch = async () => {
    setLoading(true);
    setError('');
    setMode('quick');

    try {
      // Check if someone is already waiting
      const { data: waiting } = await supabase
        .from('matchmaking_queue')
        .select('*')
        .eq('status', 'waiting')
        .neq('student_id', currentUser?.id || 'none')
        .order('created_at', { ascending: true })
        .limit(1);

      if (waiting?.length > 0) {
        // Found someone — create game and match
        const opponent = waiting[0];
        const code = genRoomCode();

        const { data: game, error: gameErr } = await supabase
          .from('tictactoe_games')
          .insert({
            room_code: code,
            player1: opponent.username,
            player2: username,
            player1_id: opponent.student_id,
            player2_id: currentUser?.id || null,
            board: ['','','','','','','','',''],
            current_turn: opponent.username,
            status: 'playing',
          })
          .select()
          .single();

        if (gameErr) throw gameErr;

        // Mark opponent as matched
        await supabase.from('matchmaking_queue')
          .update({ status: 'matched' })
          .eq('id', opponent.id);

        setLoading(false);
        onJoinGame(game, 'O', username);
      } else {
        // No one waiting — add self to queue
        await supabase.from('matchmaking_queue')
          .delete()
          .eq('student_id', currentUser?.id || 'none');

        const { data: queueRow } = await supabase
          .from('matchmaking_queue')
          .insert({
            student_id: currentUser?.id || null,
            username,
            batch_id: JSON.parse(localStorage.getItem('selectedBatch') || '{}')?.batchId || null,
            status: 'waiting',
          })
          .select()
          .single();

        // Listen for a game to be created for us
        const ch = supabase.channel(`queue-${queueRow.id}`)
          .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'tictactoe_games',
          }, async (payload) => {
            const g = payload.new;
            if (g.player1 === username || g.player2 === username) {
              await supabase.from('matchmaking_queue').delete().eq('id', queueRow.id);
              const symbol = g.player1 === username ? 'X' : 'O';
              supabase.removeChannel(ch);
              setLoading(false);
              onJoinGame(g, symbol, username);
            }
          })
          .subscribe();

        channelRef.current = ch;
        setWaitingGameId(queueRow.id);

        // Timeout after 60s
        setTimeout(async () => {
          if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            await supabase.from('matchmaking_queue').delete().eq('id', queueRow.id);
            setLoading(false);
            setMode(null);
            setError('No one found. Try again or create a room.');
          }
        }, 60000);
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Try again.');
      setLoading(false);
      setMode(null);
    }
  };

  const cancelQueue = async () => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = null;
    if (waitingGameId) {
      await supabase.from('matchmaking_queue').delete().eq('id', waitingGameId);
    }
    setWaitingGameId(null);
    setLoading(false);
    setMode(null);
  };

  // ── Create Room ──
  const handleCreateRoom = async () => {
    setLoading(true);
    setError('');
    const code = genRoomCode();

    try {
      const { data: game, error: gameErr } = await supabase
        .from('tictactoe_games')
        .insert({
          room_code: code,
          player1: username,
          player1_id: currentUser?.id || null,
          board: ['','','','','','','','',''],
          current_turn: username,
          status: 'waiting',
        })
        .select()
        .single();

      if (gameErr) throw gameErr;

      setCreatedCode(code);
      setMode('create');
      setLoading(false);

      // Wait for player2 to join
      const ch = supabase.channel(`room-wait-${game.id}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'tictactoe_games',
          filter: `id=eq.${game.id}`,
        }, (payload) => {
          const g = payload.new;
          if (g.status === 'playing' && g.player2) {
            supabase.removeChannel(ch);
            channelRef.current = null;
            onJoinGame(g, 'X', username);
          }
        })
        .subscribe();

      channelRef.current = ch;
    } catch (err) {
      console.error(err);
      setError('Failed to create room. Try again.');
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(createdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Join Room ──
  const handleJoinRoom = async () => {
    if (!roomCode.trim()) { setError('Enter a room code'); return; }
    setLoading(true);
    setError('');

    try {
      const { data: game, error: findErr } = await supabase
        .from('tictactoe_games')
        .select('*')
        .eq('room_code', roomCode.trim().toUpperCase())
        .eq('status', 'waiting')
        .single();

      if (findErr || !game) {
        setError('Room not found or already started.');
        setLoading(false);
        return;
      }

      if (game.player1 === username) {
        setError('You created this room — share the code with a friend.');
        setLoading(false);
        return;
      }

      const { data: updated, error: updateErr } = await supabase
        .from('tictactoe_games')
        .update({
          player2: username,
          player2_id: currentUser?.id || null,
          status: 'playing',
        })
        .eq('id', game.id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      setLoading(false);
      onJoinGame(updated, 'O', username);
    } catch (err) {
      console.error(err);
      setError('Failed to join. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
        <h1 className="text-2xl font-black text-gray-900 text-center mb-1">Tic Tac Toe</h1>
        <p className="text-gray-400 text-sm text-center mb-6">Playing as <span className="font-bold text-blue-500">@{username}</span></p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl mb-4">{error}</div>
        )}

        {/* Quick Match waiting */}
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

        {/* Create room waiting */}
        {mode === 'create' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-sm text-gray-500">Share this code with your friend:</p>
            <button onClick={copyCode}
              className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 active:scale-95 transition">
              <span className="text-2xl font-black text-blue-600 tracking-widest font-mono">{createdCode}</span>
              {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} className="text-gray-400" />}
            </button>
            <p className="text-gray-400 text-xs">{copied ? 'Copied!' : 'Tap to copy'}</p>
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-gray-400" />
              <p className="text-gray-400 text-xs">Waiting for friend to join…</p>
            </div>
            <button onClick={() => { if (channelRef.current) supabase.removeChannel(channelRef.current); setMode(null); }}
              className="text-sm text-red-400 underline underline-offset-2">Cancel</button>
          </div>
        )}

        {/* Default options */}
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
              <input
                value={roomCode}
                onChange={(e) => { setRoomCode(e.target.value.toUpperCase()); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                placeholder="Enter room code"
                maxLength={6}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono font-bold tracking-widest outline-none focus:border-blue-400 transition"
              />
              <button onClick={handleJoinRoom} disabled={loading || !roomCode.trim()}
                className="px-4 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm active:scale-95 transition disabled:opacity-40">
                Join
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Game Board ────────────────────────────────────────────────────────────────
function Game({ game: initialGame, mySymbol, myUsername, onLeave }) {
  const [game, setGame] = useState(initialGame);
  const [board, setBoard] = useState(initialGame.board || Array(9).fill(''));
  const channelRef = useRef(null);

  const result = checkWinner(board);
  const winner = result?.winner;
  const winningLine = result?.line || [];
  const isDraw = !winner && board.every((c) => c !== '');
  const isMyTurn = game.current_turn === myUsername;
  const opponentUsername = mySymbol === 'X' ? game.player2 : game.player1;

  useEffect(() => {
    const ch = supabase.channel(`game-${game.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'tictactoe_games',
        filter: `id=eq.${game.id}`,
      }, (payload) => {
        const g = payload.new;
        setGame(g);
        setBoard(g.board || Array(9).fill(''));
      })
      .subscribe();

    channelRef.current = ch;
    return () => supabase.removeChannel(ch);
  }, [game.id]);

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
  };

  const handleRematch = async () => {
    await supabase.from('tictactoe_games').update({
      board: ['','','','','','','','',''],
      current_turn: game.player1,
      winner: null,
      status: 'playing',
    }).eq('id', game.id);
  };

  const statusText = () => {
    if (!game.player2) return 'Waiting for opponent…';
    if (winner) return winner === mySymbol ? '🎉 You won!' : `😢 ${opponentUsername} won`;
    if (isDraw) return "🤝 It's a draw!";
    return isMyTurn ? '🟢 Your turn' : `⏳ ${opponentUsername}'s turn`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
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
        <div className="text-center mb-5">
          <p className={`text-base font-black ${winner && winner === mySymbol ? 'text-emerald-500' : winner ? 'text-red-500' : isDraw ? 'text-amber-500' : 'text-gray-700'}`}>
            {statusText()}
          </p>
        </div>

        {/* Board */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {board.map((cell, i) => {
            const isWinning = winningLine.includes(i);
            return (
              <button
                key={i}
                onClick={() => handleClick(i)}
                className={`aspect-square rounded-2xl text-4xl font-black flex items-center justify-center transition-all active:scale-90
                  ${isWinning ? 'bg-emerald-100 border-2 border-emerald-400 scale-105' : 'bg-white border border-gray-200 shadow-sm'}
                  ${!cell && isMyTurn && !winner && !isDraw ? 'hover:bg-blue-50 cursor-pointer' : 'cursor-default'}
                `}
              >
                <span className={cell === 'X' ? 'text-blue-500' : cell === 'O' ? 'text-red-500' : ''}>
                  {cell}
                </span>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        {(winner || isDraw) && (
          <div className="flex gap-2">
            <button onClick={handleRematch}
              className="flex-1 py-3 rounded-2xl bg-gray-900 text-white font-black text-sm active:scale-95 transition">
              Rematch 🔄
            </button>
            <button onClick={onLeave}
              className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-black text-sm active:scale-95 transition border border-gray-200">
              Leave
            </button>
          </div>
        )}

        {/* Waiting for player2 */}
        {!game.player2 && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <Loader2 size={14} className="animate-spin text-gray-400" />
            <p className="text-gray-400 text-xs">Waiting for opponent to join…</p>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Main TicTacToe page ───────────────────────────────────────────────────────
export default function TicTacToe() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('lobby'); // 'lobby' | 'game'
  const [currentGame, setCurrentGame] = useState(null);
  const [mySymbol, setMySymbol] = useState('X');

  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');
  const chatSession = JSON.parse(localStorage.getItem('chat_anon_session') || 'null');

  // Use chat anonymous username if available, else real name, else 'Player'
  const myUsername = chatSession?.username || currentUser?.name || 'Player';

  const handleJoinGame = (game, symbol, username) => {
    setCurrentGame(game);
    setMySymbol(symbol);
    setPhase('game');
  };

  const handleLeave = () => {
    setCurrentGame(null);
    setPhase('lobby');
  };

  if (phase === 'game' && currentGame) {
    return (
      <Game
        game={currentGame}
        mySymbol={mySymbol}
        myUsername={myUsername}
        onLeave={handleLeave}
      />
    );
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

