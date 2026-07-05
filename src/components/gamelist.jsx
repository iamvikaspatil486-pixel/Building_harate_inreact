import { useState } from 'react'

const GAMES = [
  {
    id: 'ttt',
    name: 'Tic Tac Toe',
    emoji: '⭕',
    desc: '2 players • Same device',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.15)',
    border: 'rgba(99,102,241,0.3)',
  },
  {
    id: 'snake',
    name: 'Snake',
    emoji: '🐍',
    desc: 'Coming soon',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.15)',
    border: 'rgba(34,197,94,0.3)',
    soon: true,
  },
  {
    id: '2048',
    name: '2048',
    emoji: '🔢',
    desc: 'Coming soon',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.15)',
    border: 'rgba(245,158,11,0.3)',
    soon: true,
  },
  {
    id: 'memory',
    name: 'Memory Cards',
    emoji: '🃏',
    desc: 'Coming soon',
    color: '#f43f5e',
    bg: 'rgba(244,63,94,0.15)',
    border: 'rgba(244,63,94,0.3)',
    soon: true,
  },
]

export default function GameList({ onClose }) {
  const [activeGame, setActiveGame] = useState(null)

  if (activeGame === 'ttt') {
    return <TicTacToe onClose={() => setActiveGame(null)} />
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'linear-gradient(135deg, #0f172a, #1e1b4b)',
      fontFamily: "'Segoe UI', sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 16px 10px' }}>
        <div>
          <div style={{ fontSize: 11, color: '#6366f1', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 2 }}>Students Harate</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>🎮 Game Arcade</div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}
        >✕</button>
      </div>

      <div style={{ fontSize: 12, color: '#475569', padding: '0 16px 16px' }}>
        Tap a game to play with your batchmates!
      </div>

      {/* Game grid */}
      <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, overflowY: 'auto' }}>
        {GAMES.map(game => (
          <button
            key={game.id}
            onClick={() => !game.soon && setActiveGame(game.id)}
            style={{
              background: game.bg,
              border: `1.5px solid ${game.border}`,
              borderRadius: 18,
              padding: '20px 14px',
              cursor: game.soon ? 'default' : 'pointer',
              textAlign: 'left',
              opacity: game.soon ? 0.6 : 1,
              transition: 'transform 0.15s',
              position: 'relative',
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>{game.emoji}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{game.name}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{game.desc}</div>
            {game.soon && (
              <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.1)', color: '#64748b', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
                SOON
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
