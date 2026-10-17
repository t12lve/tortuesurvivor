import React from 'react';
import { X } from 'lucide-react';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <div id="about-menu" className="overlay">
      <button
        className="back-btn"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(0,0,0,0.5)',
          border: '2px solid #555',
          color: 'white',
          padding: '8px',
          borderRadius: '5px',
          cursor: 'pointer',
          zIndex: 100
        }}
      >
        <X size={20} />
      </button>

      <h2>À Propos</h2>
      <div
        className="menu-content scrollable"
        style={{
          background: 'rgba(0,0,0,0.85)',
          padding: '24px',
          borderRadius: '10px',
          maxWidth: '420px',
          maxHeight: '70vh',
          overflowY: 'auto',
          textAlign: 'center'
        }}
      >
        <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '10px' }}>
          Tortue Survivor
        </h3>
        <p style={{ color: '#ccc', fontSize: '0.95rem', marginBottom: '15px' }}>
          Un jeu hommage satirique et survie politique proclamant la 6ème République.
        </p>

        <h4 style={{ color: '#f1c40f', fontSize: '1rem', marginTop: '15px', marginBottom: '8px' }}>
          Pistes de la bande-son (OST) :
        </h4>
        <ul className="text-xs text-neutral-400 space-y-1 text-left list-disc pl-8">
          <li>8bits mais 6e republique</li>
          <li>Accordeon de goch</li>
          <li>Capote Demon Hunter</li>
          <li>Ero M6 be like</li>
          <li>Espoir populaire</li>
          <li>La marche</li>
          <li>Latino Revolucion</li>
          <li>Les fantomes du capitalisme</li>
          <li>On est chill a boire un lait fraise</li>
          <li>POV Bernard Arnaud paye des impots</li>
          <li>POV je touche le smic a 1700euros</li>
          <li>Slow as Capitalism</li>
          <li>Un reve de pixels</li>
          <li>Wallah cest pas Nelly</li>
        </ul>

        <h4 style={{ marginTop: '20px', fontSize: '1rem', color: '#fff' }}>Le projet :</h4>
        <p style={{ color: '#aaa', fontSize: '0.85rem' }}>
          Projet indépendant pour le divertissement.<br />
          Porté avec React 19 et Three.js.
        </p>
        <p style={{ color: '#888', marginTop: '15px', fontSize: '0.8rem' }}>
          © 2026 t12lve. Tous droits réservés.
        </p>
      </div>

      <button className="back-btn" onClick={onClose} style={{ marginTop: '20px' }}>
        Retour
      </button>
    </div>
  );
};
