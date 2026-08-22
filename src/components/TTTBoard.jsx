import React from 'react';

const LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

export const checkWinner = (board) => {
  for (const [a,b,c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a,b,c] };
    }
  }
  return null;
};

export default function TTTBoard({ board, winningLine = [], isMyTurn, onCellClick, disabled }) {
  return (
    <div className="grid grid-cols-3 gap-3 px-6 mb-4">
      {board.map((cell, i) => {
        const isWinning = winningLine.includes(i);
        return (
          <button
            key={i}
            onClick={() => onCellClick(i)}
            disabled={disabled || !!cell || !isMyTurn}
            className={`aspect-square rounded-2xl text-4xl font-black flex items-center justify-center transition-all active:scale-90
              ${isWinning
                ? 'bg-emerald-100 border-2 border-emerald-400 scale-105'
                : 'bg-white border border-gray-200 shadow-sm'}
              ${!cell && isMyTurn && !disabled ? 'hover:bg-blue-50 cursor-pointer' : 'cursor-default'}
            `}
          >
            <span className={cell === 'X' ? 'text-blue-500' : cell === 'O' ? 'text-red-500' : ''}>
              {cell}
            </span>
          </button>
        );
      })}
    </div>
  );
}

