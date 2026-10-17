import React, { useState } from 'react';
import { SubMenuType } from '../types/game';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onReturnToMenu: () => void;
  onOpenMenu: (menu: SubMenuType) => void;
  onToggleSound: (enabled: boolean) => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onReturnToMenu,
  onOpenMenu,
  onToggleSound
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleSoundToggle = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    onToggleSound(next);
  };

  return (
    <div id="pause-screen" className="overlay">
      <h2>Jeu en Pause</h2>
      <div id="settings">
        <p style={{ color: '#aaa', textAlign: 'center', marginBottom: '20px' }}>
          La tortue survit, mais elle fait une pause
        </p>
      </div>

      <div
        style={{
          marginTop: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          alignItems: 'center',
          width: '100%',
          maxWidth: '300px'
        }}
      >
        <button id="resume-btn" style={{ width: '100%' }} onClick={onResume}>
          Reprendre
        </button>
        <button
          id="pause-restart-btn"
          style={{ width: '100%', background: '#2980b9' }}
          onClick={onRestart}
        >
          Recommencer
        </button>
        <button
          id="pause-sound-btn"
          style={{ width: '100%', background: soundEnabled ? '#27ae60' : '#7f8c8d' }}
          onClick={handleSoundToggle}
        >
          Son: {soundEnabled ? 'Activé' : 'Désactivé'}
        </button>
        <button
          id="quit-btn"
          style={{ width: '100%', background: '#d35400' }}
          onClick={onReturnToMenu}
        >
          Retour Menu
        </button>
      </div>

      <div className="menu-nav">
        <button onClick={() => onOpenMenu('options')}>Options</button>
        <button onClick={() => onOpenMenu('enemies')}>Ennemis</button>
        <button onClick={() => onOpenMenu('attacks')}>Attaques</button>
        <button onClick={() => onOpenMenu('help')}>Aide</button>
        <button onClick={() => onOpenMenu('about')}>À Propos</button>
      </div>
    </div>
  );
};
