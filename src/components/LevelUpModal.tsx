import React, { useEffect } from 'react';
import { Power } from '../types/game';
import {
  RefreshCw,
  Book,
  Droplet,
  Banknote,
  Clock,
  Shield,
  Snowflake,
  CloudLightning,
  Utensils,
  Gavel,
  Percent,
  GraduationCap,
  Globe,
  Zap
} from 'lucide-react';

interface LevelUpModalProps {
  choices: { power: Power; bonusLevels: number; isGolden: boolean }[];
  remainingRerolls: number;
  onSelectPower: (power: Power, bonusLevels: number) => void;
  onReroll: () => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  choices,
  remainingRerolls,
  onSelectPower,
  onReroll
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1' || e.key === '&') {
        if (choices[0]) onSelectPower(choices[0].power, choices[0].bonusLevels);
      } else if (e.key === '2' || e.key === 'é') {
        if (choices[1]) onSelectPower(choices[1].power, choices[1].bonusLevels);
      } else if (e.key === '3' || e.key === '"') {
        if (choices[2]) onSelectPower(choices[2].power, choices[2].bonusLevels);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [choices, onSelectPower]);

  const renderIcon = (name: string) => {
    const size = 48;
    switch (name) {
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
    <div id="level-up-screen" className="overlay">
      <h2>Niveau Supérieur !</h2>

      <div id="power-choices">
        {choices.map((choice, index) => {
          const { power, bonusLevels, isGolden } = choice;
          const nextLevel = power.level + bonusLevels;
          const levelGainText = isGolden
            ? `+${bonusLevels} Niveaux d'un coup !`
            : power.getNextLevelDesc
            ? power.getNextLevelDesc(power.level)
            : `Niveau ${nextLevel}`;

          return (
            <div
              key={power.id}
              className={`power-card ${isGolden ? 'golden-ticket' : 'aurora-border'}`}
              onClick={() => onSelectPower(power, bonusLevels)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectPower(power, bonusLevels);
                }
              }}
            >
              <div className="key-badge">Touche [ {index + 1} ]</div>
              <h3 style={isGolden ? { color: '#f1c40f', textShadow: '0 0 5px #f1c40f' } : {}}>
                {power.name} (Lvl {nextLevel})
              </h3>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color:
                    power.category === 'Offensif'
                      ? '#e74c3c'
                      : power.category === 'Défensif'
                      ? '#3498db'
                      : '#2ecc71',
                  marginTop: '-5px',
                  marginBottom: '8px'
                }}
              >
                {power.category}
              </div>
              <div
                className="power-icon"
                style={{
                  margin: '10px auto',
                  width: '60px',
                  height: '60px',
                  filter: isGolden ? 'drop-shadow(0 0 10px #f1c40f)' : undefined
                }}
              >
                {renderIcon(power.icon)}
              </div>
              <p className="desc">{power.desc}</p>
              <p
                style={{
                  fontSize: '12px',
                  color: isGolden ? '#f1c40f' : '#2ecc71',
                  fontWeight: 'bold',
                  marginTop: '10px'
                }}
              >
                {levelGainText}
              </p>
            </div>
          );
        })}
      </div>

      <button
        id="reroll-btn"
        onClick={onReroll}
        disabled={remainingRerolls <= 0}
        style={{
          marginTop: '25px',
          background: remainingRerolls > 0 ? '#3498db' : '#555',
          cursor: remainingRerolls > 0 ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span>Relancer ({remainingRerolls})</span>
        <RefreshCw size={16} />
      </button>
    </div>
  );
};
