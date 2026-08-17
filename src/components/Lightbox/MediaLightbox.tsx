import React, { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface MediaLightboxProps {
  media: { url: string; type: string; name: string } | null;
  onClose: () => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({ media, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!media) return null;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.92)',
      zIndex: 20000,
      display: 'flex',
      flexDirection: 'column',
      backdropFilter: 'blur(8px)'
    }}>
      {/* Lightbox Toolbar */}
      <div style={{
        height: '60px',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(20, 20, 20, 0.8)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#ffffff'
      }}>
        <div style={{ fontSize: '15px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '400px' }}>
          {media.name}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {media.type !== 'video' && (
            <>
              <button
                onClick={handleZoomOut}
                title="Zoom Out"
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '6px' }}
              >
                <ZoomOut size={20} />
              </button>
              <button
                onClick={handleZoomIn}
                title="Zoom In"
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '6px' }}
              >
                <ZoomIn size={20} />
              </button>
              <button
                onClick={handleRotate}
                title="Rotate"
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '6px' }}
              >
                <RotateCw size={20} />
              </button>
            </>
          )}

          <a
            href={media.url}
            download={media.name}
            title="Download Media File"
            style={{
              color: '#ffffff',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none'
            }}
          >
            <Download size={20} />
          </a>

          <button
            onClick={onClose}
            title="Close"
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '6px' }}
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Main Canvas */}
      <div 
        onClick={onClose}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: '24px',
          cursor: 'pointer'
        }}
      >
        {media.type === 'video' ? (
          <video
            src={media.url}
            controls
            autoPlay
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.8)'
            }}
          />
        ) : (
          <img
            src={media.url}
            alt={media.name}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90%',
              maxHeight: '85vh',
              objectFit: 'contain',
              borderRadius: '4px',
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.8)'
            }}
          />
        )}
      </div>
    </div>
  );
};
