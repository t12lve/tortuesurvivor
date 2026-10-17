import React, { useState } from 'react';

interface VictoryModalProps {
  onRestart: () => void;
  onReturnToMenu: () => void;
  onPrestige: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  onRestart,
  onReturnToMenu,
  onPrestige
}) => {
  const [showVideo, setShowVideo] = useState(true);

  return (
    <div id="victory-screen" className="overlay">
      {showVideo && (
        <video
          id="victory-video"
          autoPlay
          playsInline
          onEnded={() => setShowVideo(false)}
          src="source/animations/winning_screen.mp4"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            background: '#000',
            zIndex: 1000
          }}
        />
      )}

      <h1 style={{ color: '#f1c40f', fontSize: '3rem', marginBottom: '10px' }}>VICTOIRE !</h1>
      <p style={{ fontSize: '1.4rem', color: '#ecf0f1', marginBottom: '20px' }}>
        La 6ème République est proclamée !
      </p>

      <div
        id="victory-unlocks"
        style={{ marginTop: '10px', marginBottom: '25px', fontWeight: 'bold', color: '#2ecc71' }}
      >
        ✨ Nouveaux modes Turbo débloqués dans le menu Bonus !
      </div>

      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
        <button id="victory-restart-btn" onClick={onRestart}>
          Rejouer
        </button>
        <button
          id="victory-menu-btn"
          style={{ background: '#d35400' }}
          onClick={onReturnToMenu}
        >
          Retour au Menu
        </button>
      </div>

      <button
        id="prestige-btn"
        onClick={onPrestige}
        style={{
          marginTop: '25px',
          background: 'linear-gradient(45deg, #f1c40f, #e67e22, #e74c3c)',
          border: '2px solid #fff',
          fontWeight: 'bold',
          textTransform: 'uppercase'
        }}
      >
        Mode Prestige 🌟
      </button>
    </div>
  );
};
