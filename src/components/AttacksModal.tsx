import React from 'react';
import {
  Banknote,
  Droplet,
  CloudLightning,
  Gavel,
  Zap,
  Leaf,
  Clock,
  Shield,
  Globe,
  Snowflake,
  Utensils,
  Percent,
  GraduationCap
} from 'lucide-react';

interface AttacksModalProps {
  onClose: () => void;
}

export const AttacksModal: React.FC<AttacksModalProps> = ({ onClose }) => {
  return (
    <div id="attacks-menu" className="overlay">
      <h2>Pouvoirs &amp; Attaques</h2>
      <div
        className="menu-content scrollable"
        style={{
          background: 'rgba(0,0,0,0.85)',
          padding: '20px',
          borderRadius: '10px',
          maxHeight: '65vh',
          width: '480px',
          overflowY: 'auto',
          textAlign: 'left'
        }}
      >
        <h3
          style={{
            marginTop: 0,
            borderBottom: '1px solid #444',
            paddingBottom: '5px',
            marginBottom: '10px',
            fontSize: '1.1rem',
            color: '#e74c3c'
          }}
        >
          Armes & Projectiles
        </h3>
        <details className="bestiary-item" open>
          <summary>
            <Banknote size={20} className="inline mr-2 text-emerald-400" /> SMIC à 1700€
          </summary>
          <div className="bestiary-details">
            <p>Tire des billets verts vers l'ennemi le plus proche. <strong>Dégâts:</strong> 10 | <strong>CD:</strong> 0.8s</p>
          </div>
        </details>
        <details className="bestiary-item">
          <summary>
            <Droplet size={20} className="inline mr-2 text-cyan-400" /> Service Public de l'Eau
          </summary>
          <div className="bestiary-details">
            <p>Jet d'eau qui traverse tous les ennemis en ligne droite. <strong>Dégâts:</strong> 15 | <strong>CD:</strong> 2s | Pierce infini</p>
          </div>
        </details>
        <details className="bestiary-item">
          <summary>
            <CloudLightning size={20} className="inline mr-2 text-amber-400" /> ISF Climatique
          </summary>
          <div className="bestiary-details">
            <p>Foudre ciblée sur l'ennemi le plus proche. <strong>Dégâts:</strong> 25 | <strong>CD:</strong> 1.5s</p>
          </div>
        </details>
        <details className="bestiary-item">
          <summary>
            <Gavel size={20} className="inline mr-2 text-red-400" /> Révocation des Élus
          </summary>
          <div className="bestiary-details">
            <p>Météore RÉVOQUÉ s'écrasant sur l'ennemi le plus fort. <strong>Dégâts:</strong> 100 × niveau | <strong>CD:</strong> 5s</p>
          </div>
        </details>
        <details className="bestiary-item">
          <summary>
            <Zap size={20} className="inline mr-2 text-yellow-400" /> Le Rush Kranidos
          </summary>
          <div className="bestiary-details">
            <p>Charge ultra-rapide directionnelle laissant une traînée de feu. Invincible pendant la charge. <strong>Dégâts:</strong> 60 × niveau</p>
          </div>
        </details>

        <h3
          style={{
            marginTop: '20px',
            borderBottom: '1px solid #444',
            paddingBottom: '5px',
            marginBottom: '10px',
            fontSize: '1.1rem',
            color: '#3498db'
          }}
        >
          Auras & Zones
        </h3>
        <details className="bestiary-item">
          <summary>
            <Leaf size={20} className="inline mr-2 text-green-400" /> La Règle Verte
          </summary>
          <div className="bestiary-details">
            <p>Aura de contact qui inflige des dégâts constants aux ennemis proches.</p>
          </div>
        </details>
        <details className="bestiary-item">
          <summary>
            <Clock size={20} className="inline mr-2 text-purple-400" /> Retraite à 60 ans
          </summary>
          <div className="bestiary-details">
            <p>Aura temporelle qui ralentit les ennemis proches de 50%.</p>
          </div>
        </details>
        <details className="bestiary-item">
          <summary>
            <Shield size={20} className="inline mr-2 text-yellow-500" /> Garantie d'Autonomie
          </summary>
          <div className="bestiary-details">
            <p>Orbes dorés protecteurs tournant autour du joueur et fauchant les ennemis.</p>
          </div>
        </details>
        <details className="bestiary-item">
          <summary>
            <Globe size={20} className="inline mr-2 text-emerald-400" /> Référendum d'Autodétermination
          </summary>
          <div className="bestiary-details">
            <p>Zone tricolore au sol : 30% de chance de convaincre instantanément les ennemis qui y entrent.</p>
          </div>
        </details>

        <h3
          style={{
            marginTop: '20px',
            borderBottom: '1px solid #444',
            paddingBottom: '5px',
            marginBottom: '10px',
            fontSize: '1.1rem',
            color: '#2ecc71'
          }}
        >
          Utilitaires & Passifs
        </h3>
        <details className="bestiary-item">
          <summary>
            <Snowflake size={20} className="inline mr-2 text-sky-300" /> Blocage des Prix
          </summary>
          <div className="bestiary-details">
            <p>Gèle temporairement TOUS les ennemis à l'écran pendant 3 secondes.</p>
          </div>
        </details>
        <details className="bestiary-item">
          <summary>
            <Utensils size={20} className="inline mr-2 text-orange-400" /> Cantine Bio & Locale
          </summary>
          <div className="bestiary-details">
            <p>Restaure passivement de la vie à intervalles réguliers.</p>
          </div>
        </details>
        <details className="bestiary-item">
          <summary>
            <Percent size={20} className="inline mr-2 text-pink-400" /> Taxe Zucman
          </summary>
          <div className="bestiary-details">
            <p>Passif: Réduit l'esquive des milliardaires (-2% par niveau).</p>
          </div>
        </details>
        <details className="bestiary-item">
          <summary>
            <GraduationCap size={20} className="inline mr-2 text-indigo-400" /> Allocation d'Autonomie
          </summary>
          <div className="bestiary-details">
            <p>Passif XP: Multiplie l'XP reçue des bulletins de vote ramassés.</p>
          </div>
        </details>
      </div>

      <button className="back-btn" onClick={onClose} style={{ marginTop: '20px' }}>
        Retour
      </button>
    </div>
  );
};
