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
            <img
              src="/assets/logo-sphere.png"
              alt="Logo Sphere Office"
              className={`h-28 w-28 sm:h-36 sm:w-36 animate-spin`}
              style={{ animationDuration: '2s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' }}
            />
            <style>{`
              @keyframes spin {
                100% { transform: rotate(360deg); }
              }
              @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-20%); }
              }
              .animate-spin-bounce {
                animation-name: bounce, spin;
                animation-duration: 1.2s, 2s;
                animation-timing-function: ease-in-out, linear;
                animation-iteration-count: infinite, infinite;
              }
            `}</style>
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