import React from 'react';

interface EnemiesModalProps {
  onClose: () => void;
  onOpenLightbox: (src: string) => void;
}

export const EnemiesModal: React.FC<EnemiesModalProps> = ({ onClose, onOpenLightbox }) => {
  const seenLeaRaph = localStorage.getItem('seen_learaph') === 'true';
  const bossDefeated = localStorage.getItem('bossDefeated') === 'true';

  return (
    <div id="enemies-menu" className="overlay">
      <h2>Bestiaire</h2>
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
        <details className="bestiary-item" open>
          <summary>
            <img
              src="source/journaR.png"
              alt="Journaliste"
              className="bestiary-img"
              onClick={() => onOpenLightbox('source/journaR.png')}
            />
            <span>Journaliste</span>
          </summary>
          <div className="bestiary-details">
            <p><strong>HP:</strong> 10 | <strong>Dégâts de Contact:</strong> 5 | <strong>Vitesse:</strong> 2.0</p>
            <p>L'ennemi de base, fragile mais plutôt rapide. S'attaquent en meute.</p>
          </div>
        </details>

        <details className="bestiary-item">
          <summary>
            <img
              src="source/poliRI.png"
              alt="Politique"
              className="bestiary-img"
              onClick={() => onOpenLightbox('source/poliRI.png')}
            />
            <span>Politique</span>
          </summary>
          <div className="bestiary-details">
            <p><strong>HP:</strong> 20 | <strong>Dégâts de Contact:</strong> 5 | <strong>Vitesse:</strong> 1.5</p>
            <p>Vitesse moyenne. Résistant, évitez de vous laisser encercler.</p>
          </div>
        </details>

        <details className="bestiary-item">
          <summary>
            <img
              src="source/usright.png"
              alt="Milliardaire"
              className="bestiary-img"
              onClick={() => onOpenLightbox('source/usright.png')}
            />
            <span>Milliardaire</span>
          </summary>
          <div className="bestiary-details">
            <p><strong>HP:</strong> 30 | <strong>Dégâts de Contact:</strong> 5 | <strong>Vitesse:</strong> 2.5</p>
            <p><strong>Spécial:</strong> 25% de chance d'Évasion Fiscale (Esquive passive).</p>
            <p>Ennemi très rapide et persistant.</p>
          </div>
        </details>

        <details className="bestiary-item">
          <summary>
            <img
              src="source/glucksR.png"
              alt="Glucksmann"
              className="bestiary-img"
              onClick={() => onOpenLightbox('source/glucksR.png')}
            />
            <span>Glucksmann</span>
          </summary>
          <div className="bestiary-details">
            <p><strong>HP:</strong> 20 | <strong>Dégâts:</strong> 5 | <strong>Vitesse:</strong> 1.0</p>
            <p><strong>Projectile (Pavé de Texte):</strong> Lance des déclarations encombrantes sur l'écran.</p>
          </div>
        </details>

        <details className="bestiary-item">
          <summary>
            <img
              src="source/glucksR.png"
              alt="Mega Glucksmann"
              className="bestiary-img"
              onClick={() => onOpenLightbox('source/glucksR.png')}
            />
            <span>Mega Glucksmann</span>
          </summary>
          <div className="bestiary-details">
            <p><strong>HP:</strong> 300+ | <strong>Dégâts:</strong> 5 | <strong>Vitesse:</strong> 1.2</p>
            <p>Apparaît après avoir convaincu 15 Glucksmann classiques. Une variante XXL très imposante.</p>
          </div>
        </details>

        <details className="bestiary-item">
          <summary>
            <img
              src="source/tondR.png"
              alt="Mega Tondelier"
              className="bestiary-img"
              onClick={() => onOpenLightbox('source/tondR.png')}
            />
            <span>Mega Tondelier</span>
          </summary>
          <div className="bestiary-details">
            <p><strong>HP:</strong> 600+ | <strong>Dégâts:</strong> 5 | <strong>Vitesse:</strong> 1.2</p>
            <p>Apparaît après avoir convaincu 15 Politiciens classiques. Sa veste verte cache une santé de fer.</p>
          </div>
        </details>

        <h3 style={{ marginTop: '20px', borderBottom: '1px solid #444', paddingBottom: '5px' }}>
          Allié(e)s de la Lutte
        </h3>

        <details className="bestiary-item">
          <summary>
            <img
              src="source/roussoR.png"
              alt="Sandrine"
              className="bestiary-img"
              onClick={() => onOpenLightbox('source/roussoR.png')}
            />
            <span>Sandrine Rousseau</span>
          </summary>
          <div className="bestiary-details">
            <p><strong>Effet:</strong> Aura de dégâts + Défense augmentée</p>
            <p>Rejoint la lutte pour infliger des dégâts aux ennemis proches.</p>
          </div>
        </details>

        <details className="bestiary-item">
          <summary>
            <img
              src="source/rimaR.png"
              alt="Rima"
              className="bestiary-img"
              onClick={() => onOpenLightbox('source/rimaR.png')}
            />
            <span>Rima Hassan</span>
          </summary>
          <div className="bestiary-details">
            <p><strong>Effet:</strong> Aura de dégâts + Défense augmentée</p>
            <p>Soutien précieux dans la mêlée des militants.</p>
          </div>
        </details>

        <details className="bestiary-item">
          <summary>
            <img
              src="source/poutouR.png"
              alt="Poutou"
              className="bestiary-img"
              onClick={() => onOpenLightbox('source/poutouR.png')}
            />
            <span>Philippe Poutou</span>
          </summary>
          <div className="bestiary-details">
            <p><strong>Effet:</strong> Aura de dégâts + Défense augmentée</p>
            <p>L'anticapitalisme en action directe contre les vagues ennemies.</p>
          </div>
        </details>

        <details className="bestiary-item">
          <summary>
            <img
              src="source/ruffin.png"
              alt="Ruffin"
              className="bestiary-img"
              onClick={() => onOpenLightbox('source/ruffin.png')}
            />
            <span>François Ruffin (Poète)</span>
          </summary>
          <div className="bestiary-details">
            <p><strong>Effet:</strong> Fonce et rebondit dans les foules ennemies.</p>
          </div>
        </details>

        <h3 style={{ marginTop: '20px', borderBottom: '1px solid #444', paddingBottom: '5px' }}>
          Mini-Boss & Boss Final
        </h3>

        <details className="bestiary-item">
          <summary>
            <img
              src="source/renaut.png"
              alt="Léa et Raph"
              className={`bestiary-img ${seenLeaRaph ? '' : 'boss-silhouette'}`}
              onClick={() => seenLeaRaph && onOpenLightbox('source/renaut.png')}
            />
            <span>{seenLeaRaph ? 'Léa & Raph' : '?????'}</span>
          </summary>
          <div className="bestiary-details">
            <p>
              {seenLeaRaph
                ? 'Le duo médiatique du service public. Ils traversent l’écran à toute vitesse !'
                : 'Duo mystère non encore rencontré en jeu...'}
            </p>
          </div>
        </details>

        <details className="bestiary-item">
          <summary>
            <img
              src="source/marinelpdroite.png"
              alt="Boss Final"
              className={`bestiary-img ${bossDefeated ? '' : 'boss-silhouette'}`}
              onClick={() => bossDefeated && onOpenLightbox('source/marinelpdroite.png')}
            />
            <span>{bossDefeated ? 'Marine (Mega Boss)' : '?????'}</span>
          </summary>
          <div className="bestiary-details">
            <p>
              {bossDefeated
                ? "L'ultime adversaire de la 5ème République. Extrêmement résistante et destructrice !"
                : "Ce redoutable adversaire apparaît à 12:00 et n'a pas encore été vaincu..."}
            </p>
          </div>
        </details>
      </div>

      <button className="back-btn" onClick={onClose} style={{ marginTop: '20px' }}>
        Retour
      </button>
    </div>
  );
};
