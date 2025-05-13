import React from 'react';

type LoadingSpinnerProps = {
  /** Taille du spinner (small, medium, large) */
  size?: 'sm' | 'md' | 'lg';
  /** Variante du spinner (simple, pulse, logo) */
  variant?: 'simple' | 'pulse' | 'logo';
  /** Texte à afficher sous le spinner */
  text?: string;
  /** Classes CSS personnalisées */
  className?: string;
};

export function LoadingSpinner({
  size = 'md',
  variant = 'simple',
  text,
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-16 w-16',
    lg: 'h-20 w-20'
  };

  const renderSpinner = () => {
    switch (variant) {
      case 'pulse':
        return (
          <div className="relative">
            <div className={`${sizeClasses[size]} rounded-full border-t-4 border-b-4 border-primary-600 animate-spin`}></div>
            <div className={`absolute top-0 left-0 ${sizeClasses[size]} rounded-full border-t-4 border-primary-400 animate-ping opacity-20`}></div>
          </div>
        );
      case 'logo':
        return (
          <div className="relative flex flex-col items-center">
            <div className={`${sizeClasses[size]} rounded-full border-t-4 border-b-4 border-primary-600 border-opacity-60 shadow-xl animate-spin flex items-center justify-center`}>
              <svg
                width="48"
                height="48"
                fill="none"
                viewBox="0 0 48 48"
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                <rect width="48" height="48" rx="12" fill="#2563eb"/>
                <path d="M24 14v20M14 24h20" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        );
      default:
        return (
          <div className={`${sizeClasses[size]} rounded-full border-t-4 border-b-4 border-primary-600 animate-spin`}></div>
        );
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {renderSpinner()}
      {text && (
        <p className="mt-4 text-gray-600 dark:text-gray-300 text-center">{text}</p>
      )}
    </div>
  );
}