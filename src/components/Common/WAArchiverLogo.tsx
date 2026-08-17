import React from 'react';

interface WAArchiverLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  showGlow?: boolean;
}

export const WAArchiverLogo: React.FC<WAArchiverLogoProps> = ({
  size = 40,
  className = '',
  style = {},
  showGlow = false
}) => {
  return (
    <div
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: showGlow ? 'drop-shadow(0 4px 14px rgba(0, 168, 132, 0.45))' : 'none',
        flexShrink: 0,
        ...style
      }}
    >
      <svg
        viewBox="0 0 512 512"
        width="100%"
        height="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#25D366" />
            <stop offset="45%" stopColor="#00A884" />
            <stop offset="100%" stopColor="#075E54" />
          </linearGradient>
          <linearGradient id="logoInnerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e8f5e9" />
          </linearGradient>
        </defs>

        {/* Squircle Base */}
        <rect x="32" y="32" width="448" height="448" rx="112" fill="url(#logoBgGrad)" />
        
        {/* Subtle Inner Highlight */}
        <rect x="34" y="34" width="444" height="444" rx="110" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="4" />

        {/* Outer Chat Bubble Silhouette with Tail */}
        <path
          d="M256 96 C167.63 96 96 167.63 96 256 C96 288.6 105.8 318.9 122.6 344.4 L104 416 L178.2 396.6 C201.8 409.2 228.1 416 256 416 C344.37 416 416 344.37 416 256 C416 167.63 344.37 96 256 96 Z"
          fill="url(#logoInnerGrad)"
        />

        {/* Top Archive Tray / Lid */}
        <path
          d="M184 196 C184 187.16 191.16 180 200 180 L312 180 C320.84 180 328 187.16 328 196 L328 220 C328 224.42 324.42 228 320 228 L192 228 C187.58 228 184 224.42 184 220 Z"
          fill="#00A884"
        />
        
        {/* Top Tray Handle Notch */}
        <rect x="236" y="196" width="40" height="8" rx="4" fill="#ffffff" opacity="0.9" />

        {/* Main Archive Chest Body */}
        <path
          d="M192 236 L320 236 C326.63 236 332 241.37 332 248 L332 312 C332 325.25 321.25 336 308 336 L204 336 C190.75 336 180 325.25 180 312 L180 248 C180 241.37 185.37 236 192 236 Z"
          fill="#075E54"
        />

        {/* Chest Drawer Divider Line */}
        <line x1="184" y1="284" x2="328" y2="284" stroke="#00A884" strokeWidth="4" strokeLinecap="round" />

        {/* Vault Keyhole / Security Core */}
        <circle cx="256" cy="260" r="8" fill="#25D366" />
        <rect x="244" y="298" width="24" height="6" rx="3" fill="#25D366" />
      </svg>
    </div>
  );
};
