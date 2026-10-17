import React from 'react';
import { SubMenuType } from '../types/game';
import { Pause, Play, SkipForward } from 'lucide-react';

interface StartScreenProps {
  onStart: () => void;
  onOpenMenu: (menu: SubMenuType) => void;
  musicTitle: string;
  isMusicPlaying: boolean;
  onToggleMusic: () => void;
  onNextMusic: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStart,
  onOpenMenu,
  musicTitle,
  isMusicPlaying,
  onToggleMusic,
  onNextMusic
}) => {
  return (
    <div id="start-screen" className="overlay" style={{ backgroundColor: 'transparent' }}>
      <video
        id="bg-video"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster="source/logo_splash.png"
        src="source/animations/pixelbg_mov_1.mp4"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: -1,
          opacity: 0.85
        }}
      />

      <div id="start-menu-panel">
        <div id="start-logo-area">
          <img src="icon.png" id="main-logo" alt="TORTUE SURVIVOR" />
          <p className="menu-subtitle">Sauvez la République.</p>
        </div>

        <div id="start-buttons-area" className="vertical-menu">
          <button id="start-btn" className="primary-btn" onClick={onStart}>
            Jouer
          </button>
          <button onClick={() => onOpenMenu('bonus')}>Bonus</button>
          <button onClick={() => onOpenMenu('options')}>Options</button>
          <button onClick={() => onOpenMenu('enemies')}>Ennemis (Bestiaire)</button>
          <button onClick={() => onOpenMenu('attacks')}>Attaques & Pouvoirs</button>
          <button onClick={() => onOpenMenu('help')}>Aide & Contrôles</button>
          <button onClick={() => onOpenMenu('about')}>À Propos</button>
        </div>

        <p id="controls-hint-text" className="controls-hint">
          ZQSD / Flèches / Tactile pour se déplacer · Espace pour dasher
        </p>

        {/* Music Bar in Menu */}
        <div
          style={{
            marginTop: '15px',
            background: 'rgba(0,0,0,0.6)',
            padding: '8px 12px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <span
            style={{
              fontSize: '12px',
              color: '#ddd',
              maxWidth: '180px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            🎵 {musicTitle || 'Title Theme Tortue Survivor'}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={onToggleMusic}
              style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {isMusicPlaying ? <Pause size={12} /> : <Play size={12} />}
            </button>
            <button
              type="button"
              onClick={onNextMusic}
              style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              <SkipForward size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
