import React from 'react';

interface LightboxModalProps {
  imageSrc: string | null;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({ imageSrc, onClose }) => {
  if (!imageSrc) return null;

  return (
    <div id="lightbox-modal" onClick={onClose}>
      <img id="lightbox-img" src={imageSrc} alt="Zoomed Sprite" />
    </div>
  );
};
