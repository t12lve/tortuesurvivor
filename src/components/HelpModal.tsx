import React, { useState } from 'react';

interface HelpModalProps {
  onClose: () => void;
  keyBinds: { up: string; down: string; left: string; right: string };
  onUpdateKeyBind: (action: 'up' | 'down' | 'left' | 'right', key: string) => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose, keyBinds, onUpdateKeyBind }) => {
  const [waitingAction, setWaitingAction] = useState<'up' | 'down' | 'left' | 'right' | null>(null);

  const startRebind = (action: 'up' | 'down' | 'left' | 'right') => {
    setWaitingAction(action);
  };

  React.useEffect(() => {
    if (!waitingAction) return;

    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      onUpdateKeyBind(waitingAction, e.key.toLowerCase());
      setWaitingAction(null);
    };

    window.addEventListener('keydown', handler, { once: true });
    return () => window.removeEventListener('keydown', handler);
  }, [waitingAction, onUpdateKeyBind]);

  return (
    <div id="help-menu" className="overlay">
      <h2>Aide &amp; Contrôles</h2>
      <div
        className="menu-content scrollable"
        style={{
          background: 'rgba(0,0,0,0.85)',
          padding: '20px',
          borderRadius: '10px',
          maxHeight: '65vh',
          width: '460px',
          overflowY: 'auto',
          textAlign: 'left'
        }}
      >
        <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Clavier / Souris / Tactile</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-300">
          <li><strong>Z, Q, S, D</strong> ou <strong>Flèches</strong> : Se déplacer</li>
          <li><strong>Espace</strong> : Dash d'esquive</li>
          <li><strong>Clic souris / Tactile maintenu</strong> : Se déplacer vers le curseur</li>
          <li><strong>Echap</strong> : Pause Complète</li>
          <li><strong>Tab</strong> : Pause Légère (HUD actif)</li>
        </ul>

        <div style={{ marginTop: '15px', borderTop: '1px solid #444', paddingTop: '10px' }}>
          <p style={{ fontSize: '14px', color: '#ccc', marginBottom: '8px' }}>
            Redéfinir les touches clavier :
          </p>
          {(['up', 'down', 'left', 'right'] as const).map((dir) => (
            <div key={dir} className="keybind-row">
              <span className="capitalize">{dir === 'up' ? 'Haut' : dir === 'down' ? 'Bas' : dir === 'left' ? 'Gauche' : 'Droite'} :</span>
              <button
                className={`keybind-btn ${waitingAction === dir ? 'waiting' : ''}`}
                onClick={() => startRebind(dir)}
              >
                {waitingAction === dir ? '...' : keyBinds[dir]}
              </button>
            </div>
          ))}
          <p className="hint">Cliquez sur un bouton puis appuyez sur la nouvelle touche.</p>
        </div>

        <h3 style={{ marginTop: '20px', fontSize: '1.1rem', marginBottom: '8px' }}>
          Manette (Xbox / Générique)
        </h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-300">
          <li><strong>Stick Gauche / Croix Directionnelle</strong> : Se déplacer</li>
          <li><strong>Bouton A (Croix)</strong> : Dasher</li>
          <li><strong>Start</strong> : Pause Complète</li>
          <li><strong>Select</strong> : Pause Légère</li>
        </ul>
      </div>

      <button className="back-btn" onClick={onClose} style={{ marginTop: '20px' }}>
        Retour
      </button>
    </div>
  );
};
