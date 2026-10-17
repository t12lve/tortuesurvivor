import React from 'react';
import { PlayerStats, Power, KillFeedEntry, BreakingNewsData } from '../types/game';
import {
  Pause,
  Play,
  SkipForward,
  Camera,
  Briefcase,
  Shield,
  Wind,
  Book,
  Droplet,
  Banknote,
  Clock,
  Snowflake,
  CloudLightning,
  Utensils,
  Gavel,
  Percent,
  GraduationCap,
  Globe,
  Zap
} from 'lucide-react';

interface HUDProps {
  stats: PlayerStats;
  totalConvinced: number;
  gameTime: number;
  journalisteKills: number;
  reqJ: number;
  politicienKills: number;
  reqP: number;
  activePowers: Power[];
  musicTitle: string;
  isMusicPlaying: boolean;
  onToggleMusic: () => void;
  onNextMusic: () => void;
  onTogglePause: () => void;
  onTriggerDash: () => void;
  flashOpacity: number;
  allyDefenseActive: boolean;
  killFeed: KillFeedEntry[];
  breakingNews: BreakingNewsData | null;
  formatTime: (sec: number) => string;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  totalConvinced,
  gameTime,
  journalisteKills,
  reqJ,
  politicienKills,
  reqP,
  activePowers,
  musicTitle,
  isMusicPlaying,
  onToggleMusic,
  onNextMusic,
  onTogglePause,
  onTriggerDash,
  flashOpacity,
  allyDefenseActive,
  killFeed,
  breakingNews,
  formatTime
}) => {
  const hpPercent = Math.min(100, (stats.hp / stats.maxHp) * 100);
  const isOverheal = stats.hp > stats.maxHp;

  const renderPowerIcon = (iconName: string) => {
    const size = 20;
    switch (iconName) {
      case 'book': return <Book size={size} />;
      case 'droplet': return <Droplet size={size} />;
      case 'banknote': return <Banknote size={size} />;
      case 'clock': return <Clock size={size} />;
      case 'shield': return <Shield size={size} />;
      case 'snowflake': return <Snowflake size={size} />;
      case 'cloud-lightning': return <CloudLightning size={size} />;
      case 'utensils': return <Utensils size={size} />;
      case 'gavel': return <Gavel size={size} />;
      case 'percent': return <Percent size={size} />;
      case 'graduation-cap': return <GraduationCap size={size} />;
      case 'globe': return <Globe size={size} />;
      case 'zap': return <Zap size={size} />;
      default: return <Zap size={size} />;
    }
  };

  return (
    <div id="hud" style={{ opacity: 1 }}>
      {/* Timer */}
      <div id="timer">{formatTime(gameTime)}</div>

      {/* XP Container */}
      <div id="xp-container">
        <div id="xp-bar" style={{ width: `${Math.min(100, (stats.xp / stats.maxXp) * 100)}%` }} />
      </div>

      {/* Convinced Counter */}
      <div
        id="convinced-counter"
        style={{
          position: 'absolute',
          top: '50px',
          right: '20px',
          fontSize: '18px',
          fontWeight: 'bold',
          color: 'white',
          textShadow: '1px 1px 2px #000',
          zIndex: 20
        }}
      >
        Convaincus : {totalConvinced}
      </div>

      {/* Level */}
      <div id="level">Lvl {stats.level}</div>

      {/* Music Widget */}
      <div
        id="music-ui"
        style={{
          position: 'absolute',
          top: '80px',
          right: '20px',
          textAlign: 'right',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          zIndex: 20,
          pointerEvents: 'auto'
        }}
      >
        <span
          id="music-title"
          style={{
            fontSize: '13px',
            color: '#ccc',
            textShadow: '1px 1px 2px #000',
            maxWidth: '180px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {musicTitle || 'Lecture...'}
        </span>
        <button
          onClick={onToggleMusic}
          type="button"
          style={{
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid #666',
            color: 'white',
            padding: '5px',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
          title={isMusicPlaying ? 'Pause' : 'Lecture'}
        >
          {isMusicPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          onClick={onNextMusic}
          type="button"
          style={{
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid #666',
            color: 'white',
            padding: '5px',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
          title="Piste suivante"
        >
          <SkipForward size={14} />
        </button>
      </div>

      {/* Pause Button */}
      <button
        id="hud-pause-btn"
        onClick={onTogglePause}
        type="button"
        style={{
          position: 'absolute',
          top: '15px',
          left: '15px',
          background: 'rgba(0,0,0,0.6)',
          border: '2px solid #555',
          color: 'white',
          borderRadius: '50%',
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          cursor: 'pointer',
          pointerEvents: 'auto'
        }}
      >
        <Pause size={22} />
      </button>

      {/* Health Globe */}
      <div id="health-globe-container" title="Santé">
        <div
          id="health-globe"
          style={{
            height: `${hpPercent}%`,
            background: isOverheal
              ? 'radial-gradient(circle at 30% 30%, #f1c40f, #f39c12, #e67e22)'
              : 'radial-gradient(circle at 30% 30%, #ff5252, #d32f2f, #7f0000)'
          }}
        />
        <div id="health-globe-text">{Math.ceil(stats.hp)}</div>
      </div>

      {/* Combo Journalists */}
      <div id="combo-container" title="Combo Journalistes">
        <div id="combo-bar" style={{ width: `${(journalisteKills / reqJ) * 100}%` }} />
        <span id="combo-text" className="flex items-center gap-1">
          {journalisteKills}/{reqJ} <Camera size={14} />
        </span>
      </div>

      {/* Combo Politicians */}
      <div
        id="combo-poli-container"
        title="Combo Politiciens"
        style={{
          position: 'absolute',
          bottom: '130px',
          left: '20px',
          width: '200px',
          height: '25px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          border: '2px solid #555',
          borderRadius: '5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          zIndex: 20
        }}
      >
        <div
          id="combo-poli-bar"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${(politicienKills / reqP) * 100}%`,
            backgroundColor: '#3498db',
            transition: 'width 0.2s',
            zIndex: 1
          }}
        />
        <span
          id="combo-poli-text"
          className="flex items-center gap-1"
          style={{
            position: 'relative',
            zIndex: 2,
            fontWeight: 'bold',
            fontSize: '14px',
            textShadow: '1px 1px 2px #000'
          }}
        >
          {politicienKills}/{reqP} <Briefcase size={14} /> Politiciens
        </span>
      </div>

      {/* Ally Defense Indicator */}
      {allyDefenseActive && (
        <div
          id="ally-defense-indicator"
          style={{
            position: 'absolute',
            top: '120px',
            right: '20px',
            background: 'rgba(0,0,0,0.6)',
            padding: '5px 10px',
            borderRadius: '20px',
            color: '#2ecc71',
            textShadow: '1px 1px 2px #000',
            fontSize: '16px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            border: '2px solid #2ecc71',
            zIndex: 20
          }}
          title="Défense augmentée par alliés"
        >
          <Shield size={18} /> +
        </div>
      )}

      {/* Active Powers Tray */}
      <div id="powers-hud">
        {activePowers.map((p) => (
          <div
            key={p.id}
            className="power-icon"
            title={`${p.name} (Niv ${p.level})\n${p.desc}`}
          >
            {renderPowerIcon(p.icon)}
          </div>
        ))}
      </div>

      {/* Low HP Vignette */}
      <div
        id="low-hp-vignette"
        style={{
          opacity: hpPercent <= 25 && stats.hp > 0 ? 1 : 0
        }}
      />

      {/* Damage Flash */}
      <div
        id="flash-overlay"
        style={{
          opacity: flashOpacity
        }}
      />

      {/* Kill Feed Toasts */}
      <div id="kill-feed">
        {killFeed.map((entry) => (
          <div key={entry.id} className="kill-feed-item">
            {entry.text}
          </div>
        ))}
      </div>

      {/* Breaking News Banner */}
      {breakingNews && (
        <div
          id="breaking-news-banner"
          style={{
            background:
              breakingNews.type === 'ally'
                ? 'linear-gradient(90deg, #1a472a, #27ae60, #1a472a)'
                : breakingNews.type === 'custom'
                ? 'linear-gradient(90deg, #8B0000, #ff0000, #8B0000)'
                : undefined
          }}
        >
          <div className="news-ticker-container">
            <span className="breaking-news-text">{breakingNews.text}</span>
          </div>
        </div>
      )}

      {/* Touch Dash Button */}
      <button
        id="touch-dash-btn"
        onClick={onTriggerDash}
        type="button"
        title="Dash (Espace)"
        style={{ pointerEvents: 'auto' }}
      >
        <Wind size={28} />
      </button>
    </div>
  );
};
