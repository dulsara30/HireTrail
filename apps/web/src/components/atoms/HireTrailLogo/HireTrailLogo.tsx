import React from 'react';

interface HireTrailLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  /** Use on dark backgrounds. */
  inverted?: boolean;
}

export const HireTrailLogo: React.FC<HireTrailLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  inverted = false,
}) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-2.5 font-sans select-none ${className}`}>
      {/* Geometric trail icon using only design tokens */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center rounded-lg p-1.5 shadow-xs ${
          inverted ? 'bg-bg-accent text-text-primary' : 'bg-bg-inverse text-text-inverse'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Stepping nodes and trail line */}
          <path
            d="M4 17L10 11L14 15L20 7"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Peak node */}
          <circle
            cx="20"
            cy="7"
            r="2.5"
            className={
              inverted ? 'fill-[var(--color-bg-inverse)]' : 'fill-[var(--color-bg-accent)]'
            }
          />
          <circle cx="10" cy="11" r="1.5" fill="currentColor" opacity="0.8" />
          <circle cx="4" cy="17" r="1.5" fill="currentColor" opacity="0.6" />
        </svg>
      </div>

      {showText && (
        <span
          className={`font-extrabold tracking-tight ${textSizes[size]} ${
            inverted ? 'text-text-inverse' : 'text-text-primary'
          }`}
        >
          Hire<span className="text-[var(--color-bg-accent)] font-black">Trail</span>
        </span>
      )}
    </div>
  );
};

HireTrailLogo.displayName = 'HireTrailLogo';
