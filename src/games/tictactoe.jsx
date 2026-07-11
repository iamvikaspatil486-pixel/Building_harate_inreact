import React, { useState } from 'react';

export default function TicTacToe() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);

  // Winning combinations
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  // Calculate winner and get winning line
  let winner = null;
  let winningLine = null;
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      winner = board[a];
      winningLine = lines[i];
      break;
    }
  }

  const isDraw = !winner && board.every(square => square !== null);

  const handleClick = (index) => {
    // Stop if square is filled or game is won
    if (board[index] || winner) return;

    const newBoard = [...board];
    newBoard[index] = isXNext ? 'X' : 'O';
    setBoard(newBoard);
    setIsXNext(!isXNext);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Tic-Tac-Toe</h1>
      
      <div style={styles.status}>
        {winner ? (
          <span style={styles.winnerText}>Winner: {winner} 🎉</span>
        ) : isDraw ? (
          <span style={styles.drawText}>It's a Draw! 🤝</span>
        ) : (
          <span>Next Player: <strong style={isXNext ? styles.xColor : styles.oColor}>{isXNext ? 'X' : 'O'}</strong></span>
        )}
      </div>

      <div style={styles.board}>
        {board.map((square, index) => {
          const isWinningSquare = winningLine && winningLine.includes(index);
          return (
            <button
              key={index}
              style={{
                ...styles.square,
                ...(isWinningSquare ? styles.winningSquare : {}),
                ...(square === 'X' ? styles.xColor : square === 'O' ? styles.oColor : {})
              }}
              onClick={() => handleClick(index)}
              aria-label={`Square ${index + 1}`}
            >
              {square}
            </button>
          );
        })}
      </div>

      <button style={styles.resetButton} onClick={resetGame}>
        Restart Game
      </button>
    </div>
  );
}

// Simple inline styling to ensure it looks beautiful out of the box
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '20px',
    backgroundColor: '#f3f4f6',
    borderRadius: '16px',
    maxWidth: '400px',
    margin: '40px auto',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
  },
  title: {
    color: '#1f2937',
    marginBottom: '10px',
    fontSize: '2rem'
  },
  status: {
    marginBottom: '20px',
    fontSize: '1.2rem',
    fontWeight: '500',
    color: '#4b5563',
    height: '30px'
  },
  winnerText: {
    color: '#10b981',
    fontWeight: 'bold'
  },
  drawText: {
    color: '#f59e0b',
    fontWeight: 'bold'
  },
  board: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    width: '300px',
    height: '300px',
    marginBottom: '25px'
  },
  square: {
    backgroundColor: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '2.5rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    transition: 'transform 0.1s ease, background-color 0.2s ease',
    outline: 'none'
  },
  winningSquare: {
    backgroundColor: '#d1fae5',
    transform: 'scale(1.05)'
  },
  xColor: {
    color: '#3b82f6'
  },
  oColor: {
    color: '#ef4444'
  },
  resetButton: {
    backgroundColor: '#1f2937',
    color: '#ffffff',
    border: 'none',
    padding: '12px 24px',
    fontSize: '1rem',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  }
};

