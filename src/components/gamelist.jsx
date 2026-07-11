import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function GameList() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Arcade Hub</h1>
        <p style={styles.subtitle}>Pick a game and challenge your squad!</p>
      </header>

      {/* --- GAMES GRID --- */}
      <div style={styles.grid}>
        <div style={styles.gameCard}>
          <div style={styles.gameIcon}>❌⭕</div>
          <h2 style={styles.gameTitle}>Tic Tac Toe</h2>
          <p style={styles.gameDescription}>
            The ultimate classic showdown. Get three in a row to dominate your mates.
          </p>
          <button 
            style={styles.playButton} 
            onClick={() => navigate('/tictactoe')}
          >
            Play Now
          </button>
        </div>

        {/* Future Expandable Slot */}
        <div style={{ ...styles.gameCard, ...styles.disabledCard }}>
          <div style={styles.gameIcon}>🚀</div>
          <h2 style={styles.gameTitle}>Next Arena</h2>
          <p style={styles.gameDescription}>
            Our development pipeline is drafting multiplayer engines right now.
          </p>
          <button style={styles.disabledButton} disabled>Locked</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 20px',
    color: '#1f2937',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '800',
    color: '#111827',
    margin: '0 0 10px 0',
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#6b7280',
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginBottom: '40px',
  },
  gameCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
    border: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  disabledCard: {
    backgroundColor: '#f9fafb',
    borderColor: '#f3f4f6',
    opacity: 0.7,
  },
  gameIcon: {
    fontSize: '3rem',
    marginBottom: '16px',
  },
  gameTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    margin: '0 0 8px 0',
  },
  gameDescription: {
    color: '#4b5563',
    fontSize: '0.95rem',
    lineHeight: '1.5',
    margin: '0 0 24px 0',
    flexGrow: 1,
  },
  playButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    padding: '10px 20px',
    fontSize: '1rem',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer',
    width: '100%',
    transition: 'background-color 0.15s ease',
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
    color: '#9ca3af',
    border: 'none',
    padding: '10px 20px',
    fontSize: '1rem',
    fontWeight: '600',
    borderRadius: '8px',
    width: '100%',
    cursor: 'not-allowed',
  }
};

