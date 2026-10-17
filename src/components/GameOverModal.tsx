import React from 'react';

interface GameOverModalProps {
  survivalTime: string;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ survivalTime, onRestart }) => {
  return (
    <div id="game-over-screen" className="overlay">
      <h2 style={{ fontSize: '3rem', color: '#e74c3c' }}>Game Over</h2>
      <p id="survival-time" style={{ fontSize: '1.25rem', marginBottom: '25px' }}>
        Temps survécu : {survivalTime}
      </p>
      <button id="restart-btn" onClick={onRestart} style={{ padding: '12px 30px', fontSize: '1.2rem' }}>
        Rejouer
      </button>
    </div>
  );
};
