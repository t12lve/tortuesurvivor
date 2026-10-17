import React from 'react';
import { Zap, Flame, X } from 'lucide-react';

interface BonusModalProps {
  onClose: () => void;
  gameSpeedMultiplier: number;
  onSetGameSpeed: (speed: number) => void;
}

export const BonusModal: React.FC<BonusModalProps> = ({
  onClose,
  gameSpeedMultiplier,
  onSetGameSpeed
}) => {
  const wins = parseInt(localStorage.getItem('timesFinished') || '0', 10);
  const bossDefeated = localStorage.getItem('bossDefeated') === 'true';
  const effectiveWins = Math.max(wins, bossDefeated ? 1 : 0);

  const hasTurbo = effectiveWins >= 1;
  const hasUltraTurbo = effectiveWins >= 2;

  return (
    <div id="bonus-menu" className="overlay">
      <button
        className="back-btn"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(0,0,0,0.5)',
          border: '2px solid #555',
          color: 'white',
          padding: '8px',
          borderRadius: '5px',
          cursor: 'pointer',
          zIndex: 100
        }}
      >
        <X size={20} />
      </button>

      <h2>Bonus</h2>
      <div
        className="menu-content"
        style={{
          background: 'rgba(0,0,0,0.85)',
          padding: '24px',
          borderRadius: '10px',
          minWidth: '320px',
          textAlign: 'center'
        }}
      >
        <p style={{ marginBottom: '20px', fontSize: '14px', color: '#ccc' }}>
          Finissez le jeu pour débloquer de nouveaux modes !
        </p>

        {hasTurbo ? (
          <div
            style={{
              marginBottom: '15px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.08)',
              padding: '12px',
              borderRadius: '6px'
            }}
          >
            <span style={{ fontWeight: 'bold', color: '#f39c12', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={16} /> Mode Turbo (x2)
            </span>
            <label className="switch">
              <input
                type="checkbox"
                checked={gameSpeedMultiplier === 2.0}
                onChange={(e) => onSetGameSpeed(e.target.checked ? 2.0 : 1.0)}
              />
              <span className="slider" />
            </label>
          </div>
        ) : (
          <div className="text-neutral-500 text-xs mb-3 italic">
            🔒 Mode Turbo (x2) : Débloqué après 1 victoire
          </div>
        )}

        {hasUltraTurbo ? (
          <div
            style={{
              marginBottom: '15px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.08)',
              padding: '12px',
              borderRadius: '6px'
            }}
          >
            <span style={{ fontWeight: 'bold', color: '#e74c3c', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={16} /> Mode Ultra Turbo (x4)
            </span>
            <label className="switch">
              <input
                type="checkbox"
                checked={gameSpeedMultiplier === 4.0}
                onChange={(e) => onSetGameSpeed(e.target.checked ? 4.0 : 1.0)}
              />
              <span className="slider" />
            </label>
          </div>
        ) : (
          <div className="text-neutral-500 text-xs mb-3 italic">
            🔒 Mode Ultra Turbo (x4) : Débloqué après 2 victoires
          </div>
        )}
      </div>

      <button className="back-btn" onClick={onClose} style={{ marginTop: '20px' }}>
        Retour
      </button>
    </div>
  );
};
