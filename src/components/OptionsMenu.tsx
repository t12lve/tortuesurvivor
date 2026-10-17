import React, { useState, useEffect } from 'react';
import { SaveSlotData } from '../types/game';

interface OptionsMenuProps {
  onClose: () => void;
  masterVolume: number;
  ostVolume: number;
  uiScale: number;
  showDamageNumbers: boolean;
  onMasterVolumeChange: (val: number) => void;
  onOstVolumeChange: (val: number) => void;
  onUiScaleChange: (val: number) => void;
  onShowDamageNumbersChange: (val: boolean) => void;
  onSaveSlot: (slot: number) => void;
  onLoadSlot: (slot: number) => void;
  onDeleteSlot: (slot: number) => void;
}

export const OptionsMenu: React.FC<OptionsMenuProps> = ({
  onClose,
  masterVolume,
  ostVolume,
  uiScale,
  showDamageNumbers,
  onMasterVolumeChange,
  onOstVolumeChange,
  onUiScaleChange,
  onShowDamageNumbersChange,
  onSaveSlot,
  onLoadSlot,
  onDeleteSlot
}) => {
  const [slotsData, setSlotsData] = useState<(SaveSlotData | null)[]>([null, null, null]);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  const refreshSlots = () => {
    const list: (SaveSlotData | null)[] = [];
    for (let i = 0; i < 3; i++) {
      const raw = localStorage.getItem(`tortue_save_${i}`);
      list.push(raw ? JSON.parse(raw) : null);
    }
    setSlotsData(list);
  };

  useEffect(() => {
    refreshSlots();
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div id="options-menu" className="overlay">
      <h2>Options</h2>
      <div
        className="menu-content"
        style={{
          background: 'rgba(0,0,0,0.85)',
          padding: '24px',
          borderRadius: '10px',
          width: '320px'
        }}
      >
        <div className="flex justify-between items-center mb-3 text-sm">
          <label>Volume Principal :</label>
          <input
            type="range"
            min="0"
            max="100"
            value={masterVolume}
            onChange={(e) => onMasterVolumeChange(Number(e.target.value))}
            className="w-32 cursor-pointer"
          />
        </div>

        <div className="flex justify-between items-center mb-3 text-sm">
          <label>Volume Musique (OST) :</label>
          <input
            type="range"
            min="0"
            max="100"
            value={ostVolume}
            onChange={(e) => onOstVolumeChange(Number(e.target.value))}
            className="w-32 cursor-pointer"
          />
        </div>

        <div className="flex justify-between items-center mb-3 text-sm">
          <label>Taille de l'UI :</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="60"
              max="160"
              step="5"
              value={uiScale}
              onChange={(e) => onUiScaleChange(Number(e.target.value))}
              className="w-24 cursor-pointer"
            />
            <span className="text-xs text-neutral-400">{uiScale}%</span>
          </div>
        </div>

        <div className="flex justify-between items-center mb-3 text-sm">
          <label>Afficher les dégâts :</label>
          <input
            type="checkbox"
            checked={showDamageNumbers}
            onChange={(e) => onShowDamageNumbersChange(e.target.checked)}
            className="w-4 h-4 cursor-pointer"
          />
        </div>

        <div className="flex justify-between items-center mb-4 text-sm">
          <label>Plein écran :</label>
          <input
            type="checkbox"
            checked={isFullscreen}
            onChange={toggleFullscreen}
            className="w-4 h-4 cursor-pointer"
          />
        </div>

        <div style={{ marginTop: '20px', borderTop: '1px solid #444', paddingTop: '15px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '14px', textAlign: 'center', color: '#ccc' }}>
            Sauvegardes
          </h3>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {[0, 1, 2].map((slot) => {
              const data = slotsData[slot];
              return (
                <div
                  key={slot}
                  className="save-slot"
                  style={{
                    borderColor: data ? '#27ae60' : '#444'
                  }}
                  onClick={() => {
                    if (data) {
                      onLoadSlot(slot);
                    }
                  }}
                >
                  <div className="save-slot-number">Slot {slot + 1}</div>
                  <div className="save-slot-info">
                    {data ? (
                      <div>
                        <strong>Lvl {data.level}</strong>
                        <div style={{ color: '#aaa' }}>{data.saveTime}</div>
                      </div>
                    ) : (
                      <em style={{ color: '#666' }}>Vide</em>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSaveSlot(slot);
                        refreshSlots();
                      }}
                      style={{ fontSize: '10px', padding: '3px 6px' }}
                    >
                      Sauver
                    </button>
                    {data && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSlot(slot);
                          refreshSlots();
                        }}
                        style={{ fontSize: '10px', padding: '3px 6px', background: '#c0392b' }}
                      >
                        X
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <button className="back-btn" onClick={onClose} style={{ marginTop: '20px' }}>
        Retour
      </button>
    </div>
  );
};
