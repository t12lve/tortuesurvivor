import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameState, SubMenuType, PlayerStats, Power, KillFeedEntry, BreakingNewsData } from './types/game';
import { HUD } from './components/HUD';
import { StartScreen } from './components/StartScreen';
import { LevelUpModal } from './components/LevelUpModal';
import { GameOverModal } from './components/GameOverModal';
import { VictoryModal } from './components/VictoryModal';
import { PauseModal } from './components/PauseModal';
import { OptionsMenu } from './components/OptionsMenu';
import { EnemiesModal } from './components/EnemiesModal';
import { AttacksModal } from './components/AttacksModal';
import { HelpModal } from './components/HelpModal';
import { AboutModal } from './components/AboutModal';
import { BonusModal } from './components/BonusModal';
import { LightboxModal } from './components/LightboxModal';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // UI States
  const [gameState, setGameState] = useState<GameState>('START');
  const [activeSubMenu, setActiveSubMenu] = useState<SubMenuType>(null);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Game Stats
  const [stats, setStats] = useState<PlayerStats>({
    hp: 100,
    maxHp: 100,
    xp: 0,
    maxXp: 10,
    level: 1,
    pickupRadius: 3,
    facingRight: true,
    facingFront: true,
    dashTimer: 0,
    dashCooldown: 0,
    dashDir: { x: 0, y: 0 }
  });
  const [totalConvinced, setTotalConvinced] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [journalisteKills, setJournalisteKills] = useState(0);
  const [reqJ, setReqJ] = useState(30);
  const [politicienKills, setPoliticienKills] = useState(0);
  const [reqP, setReqP] = useState(15);
  const [activePowers, setActivePowers] = useState<Power[]>([]);
  const [levelUpChoices, setLevelUpChoices] = useState<{ power: Power; bonusLevels: number; isGolden: boolean }[]>([]);
  const [remainingRerolls, setRemainingRerolls] = useState(3);
  const [survivalTime, setSurvivalTime] = useState('00:00');

  // Audio & HUD
  const [musicTitle, setMusicTitle] = useState('Title Theme Tortue Survivor');
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [flashOpacity, setFlashOpacity] = useState(0);
  const [allyDefense, setAllyDefense] = useState(false);
  const [killFeed, setKillFeed] = useState<KillFeedEntry[]>([]);
  const [breakingNews, setBreakingNews] = useState<BreakingNewsData | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Settings
  const [masterVolume, setMasterVolume] = useState(50);
  const [ostVolume, setOstVolume] = useState(20);
  const [uiScale, setUiScale] = useState(100);
  const [showDamageNumbers, setShowDamageNumbers] = useState(true);
  const [gameSpeedMultiplier, setGameSpeedMultiplier] = useState(1.0);
  const [keyBinds, setKeyBinds] = useState({ up: 'z', down: 's', left: 'q', right: 'd' });

  // Initialize GameEngine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current, {
      onStateChange: (newState) => {
        setGameState(newState as GameState);
      },
      onStatsChange: (newStats, convinced, time) => {
        setStats(newStats);
        setTotalConvinced(convinced);
        setGameTime(time);
      },
      onCombosChange: (jKills, rJ, pKills, rP) => {
        setJournalisteKills(jKills);
        setReqJ(rJ);
        setPoliticienKills(pKills);
        setReqP(rP);
      },
      onActivePowersChange: (powers) => {
        setActivePowers(powers);
      },
      onLevelUp: (choices, rerolls) => {
        setLevelUpChoices(choices);
        setRemainingRerolls(rerolls);
        setGameState('LEVELUP');
      },
      onGameOver: (timeStr) => {
        setSurvivalTime(timeStr);
        setGameState('GAMEOVER');
      },
      onVictory: () => {
        setGameState('VICTORY');
      },
      onMusicChange: (title, isPlaying) => {
        setMusicTitle(title);
        setIsMusicPlaying(isPlaying);
      },
      onKillFeed: (text) => {
        const id = Math.random().toString();
        setKillFeed((prev) => [...prev.slice(-4), { id, text }]);
        setTimeout(() => {
          setKillFeed((prev) => prev.filter((item) => item.id !== id));
        }, 3500);
      },
      onBreakingNews: (text, type) => {
        setBreakingNews({ text, type });
        setTimeout(() => {
          setBreakingNews(null);
        }, 8000);
      },
      onFlash: (opacity) => {
        setFlashOpacity(opacity);
      },
      onAllyDefense: (active) => {
        setAllyDefense(active);
      },
      onLoadingProgress: (percent) => {
        setLoadingProgress(percent);
        if (percent >= 100) {
          setTimeout(() => setIsLoading(false), 300);
        }
      }
    });

    engineRef.current = engine;
    setKeyBinds({ ...engine.keyBinds });

    return () => {
      engine.destroy();
    };
  }, []);

  const handleStartGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.startGame();
    }
  }, []);

  const handleToggleMusic = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.toggleMusic();
    }
  }, []);

  const handleNextMusic = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.playRandomOst();
    }
  }, []);

  const handleTogglePause = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.togglePause();
    }
  }, []);

  const handleTriggerDash = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.triggerDash();
    }
  }, []);

  const handleSelectPower = useCallback((power: Power, bonusLevels: number) => {
    if (engineRef.current) {
      engineRef.current.selectPower(power, bonusLevels);
    }
  }, []);

  const handleReroll = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.rerollPowers();
    }
  }, []);

  const handleRestart = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.restart();
    }
  }, []);

  const handleReturnToMenu = useCallback(() => {
    window.location.reload();
  }, []);

  const handlePrestige = useCallback(() => {
    if (window.confirm('Voulez-vous vraiment passer au Mode Prestige ? Votre progression sera réinitialisée.')) {
      localStorage.removeItem('bossDefeated');
      localStorage.removeItem('timesFinished');
      localStorage.removeItem('seen_learaph');
      alert('Progression réinitialisée. Félicitations pour votre Prestige !');
      window.location.reload();
    }
  }, []);

  const handleMasterVolumeChange = useCallback((val: number) => {
    setMasterVolume(val);
    if (engineRef.current) {
      engineRef.current.setMasterVolume(val / 100);
    }
  }, []);

  const handleOstVolumeChange = useCallback((val: number) => {
    setOstVolume(val);
    if (engineRef.current) {
      engineRef.current.setOstVolume(val / 100);
    }
  }, []);

  const handleUiScaleChange = useCallback((val: number) => {
    setUiScale(val);
    document.documentElement.style.fontSize = `${(val / 100) * 16}px`;
  }, []);

  const handleShowDamageNumbersChange = useCallback((val: boolean) => {
    setShowDamageNumbers(val);
    if (engineRef.current) {
      engineRef.current.showDamageNumbers = val;
    }
  }, []);

  const handleUpdateKeyBind = useCallback((action: 'up' | 'down' | 'left' | 'right', key: string) => {
    setKeyBinds((prev) => ({ ...prev, [action]: key }));
    if (engineRef.current) {
      engineRef.current.keyBinds[action] = key;
    }
  }, []);

  const handleSetGameSpeed = useCallback((speed: number) => {
    setGameSpeedMultiplier(speed);
    if (engineRef.current) {
      engineRef.current.gameSpeedMultiplier = speed;
    }
  }, []);

  const handleSaveSlot = useCallback((slot: number) => {
    if (engineRef.current) {
      engineRef.current.saveGame(slot);
      alert(`Partie sauvegardée dans le slot ${slot + 1} !`);
    }
  }, []);

  const handleLoadSlot = useCallback((slot: number) => {
    if (engineRef.current) {
      const ok = engineRef.current.loadSave(slot);
      if (ok) {
        setActiveSubMenu(null);
      } else {
        alert('Ce slot est vide.');
      }
    }
  }, []);

  const handleDeleteSlot = useCallback((slot: number) => {
    if (window.confirm(`Supprimer la sauvegarde du slot ${slot + 1} ?`)) {
      if (engineRef.current) {
        engineRef.current.deleteSave(slot);
      }
    }
  }, []);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div id="game-container">
      {/* Loading Screen */}
      {isLoading && (
        <div id="loading-screen" className="overlay" style={{ zIndex: 10000 }}>
          <div style={{ textAlign: 'center', fontFamily: 'Roboto, sans-serif' }}>
            <h2 style={{ marginBottom: '20px' }}>Chargement en cours...</h2>
            <div
              style={{
                width: '300px',
                height: '20px',
                background: 'rgba(0,0,0,0.5)',
                border: '2px solid #555',
                borderRadius: '10px',
                overflow: 'hidden',
                margin: '0 auto'
              }}
            >
              <div
                style={{
                  width: `${loadingProgress}%`,
                  height: '100%',
                  background: '#3498db',
                  transition: 'width 0.2s'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Three.js Canvas */}
      <canvas id="game-canvas" ref={canvasRef} />

      {/* In-game HUD */}
      {gameState !== 'START' && (
        <HUD
          stats={stats}
          totalConvinced={totalConvinced}
          gameTime={gameTime}
          journalisteKills={journalisteKills}
          reqJ={reqJ}
          politicienKills={politicienKills}
          reqP={reqP}
          activePowers={activePowers}
          musicTitle={musicTitle}
          isMusicPlaying={isMusicPlaying}
          onToggleMusic={handleToggleMusic}
          onNextMusic={handleNextMusic}
          onTogglePause={handleTogglePause}
          onTriggerDash={handleTriggerDash}
          flashOpacity={flashOpacity}
          allyDefenseActive={allyDefense}
          killFeed={killFeed}
          breakingNews={breakingNews}
          formatTime={formatTime}
        />
      )}

      {/* Start Screen Menu */}
      {gameState === 'START' && (
        <StartScreen
          onStart={handleStartGame}
          onOpenMenu={(menu) => setActiveSubMenu(menu)}
          musicTitle={musicTitle}
          isMusicPlaying={isMusicPlaying}
          onToggleMusic={handleToggleMusic}
          onNextMusic={handleNextMusic}
        />
      )}

      {/* Level Up Overlay */}
      {gameState === 'LEVELUP' && (
        <LevelUpModal
          choices={levelUpChoices}
          remainingRerolls={remainingRerolls}
          onSelectPower={handleSelectPower}
          onReroll={handleReroll}
        />
      )}

      {/* Pause Full Overlay */}
      {gameState === 'PAUSED' && (
        <PauseModal
          onResume={handleTogglePause}
          onRestart={handleRestart}
          onReturnToMenu={handleReturnToMenu}
          onOpenMenu={(menu) => setActiveSubMenu(menu)}
          onToggleSound={(enabled) => handleMasterVolumeChange(enabled ? 50 : 0)}
        />
      )}

      {/* Pause Lite Overlay */}
      {gameState === 'PAUSED_LITE' && (
        <div
          id="pause-lite-screen"
          className="overlay"
          style={{
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(2px)',
            pointerEvents: 'none'
          }}
        >
          <h2 style={{ fontSize: '3rem', textShadow: '2px 2px 0 #000' }}>Pause légère</h2>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'GAMEOVER' && (
        <GameOverModal survivalTime={survivalTime} onRestart={handleRestart} />
      )}

      {/* Victory Screen */}
      {gameState === 'VICTORY' && (
        <VictoryModal
          onRestart={handleRestart}
          onReturnToMenu={handleReturnToMenu}
          onPrestige={handlePrestige}
        />
      )}

      {/* Sub-Menus */}
      {activeSubMenu === 'options' && (
        <OptionsMenu
          onClose={() => setActiveSubMenu(null)}
          masterVolume={masterVolume}
          ostVolume={ostVolume}
          uiScale={uiScale}
          showDamageNumbers={showDamageNumbers}
          onMasterVolumeChange={handleMasterVolumeChange}
          onOstVolumeChange={handleOstVolumeChange}
          onUiScaleChange={handleUiScaleChange}
          onShowDamageNumbersChange={handleShowDamageNumbersChange}
          onSaveSlot={handleSaveSlot}
          onLoadSlot={handleLoadSlot}
          onDeleteSlot={handleDeleteSlot}
        />
      )}

      {activeSubMenu === 'enemies' && (
        <EnemiesModal
          onClose={() => setActiveSubMenu(null)}
          onOpenLightbox={(src) => setLightboxImg(src)}
        />
      )}

      {activeSubMenu === 'attacks' && (
        <AttacksModal onClose={() => setActiveSubMenu(null)} />
      )}

      {activeSubMenu === 'help' && (
        <HelpModal
          onClose={() => setActiveSubMenu(null)}
          keyBinds={keyBinds}
          onUpdateKeyBind={handleUpdateKeyBind}
        />
      )}

      {activeSubMenu === 'about' && (
        <AboutModal onClose={() => setActiveSubMenu(null)} />
      )}

      {activeSubMenu === 'bonus' && (
        <BonusModal
          onClose={() => setActiveSubMenu(null)}
          gameSpeedMultiplier={gameSpeedMultiplier}
          onSetGameSpeed={handleSetGameSpeed}
        />
      )}

      {/* Lightbox for Sprite Zooming */}
      <LightboxModal imageSrc={lightboxImg} onClose={() => setLightboxImg(null)} />
    </div>
  );
};
export default App;
