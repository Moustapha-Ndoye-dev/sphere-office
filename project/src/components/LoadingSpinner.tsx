
type LoadingSpinnerProps = {
  /** Taille du spinner (small, medium, large) */
  size?: 'sm' | 'md' | 'lg';
  /** Variante du spinner (simple, pulse, logo) */
  variant?: 'simple' | 'pulse' | 'logo';
  /** Texte a afficher sous le spinner */
  text?: string;
  /** Classes CSS personnalisees */
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
            <div className={`${sizeClasses[size]} animate-spin rounded-full border-b-4 border-t-4 border-sky-700 dark:border-sky-400`}></div>
            <div className={`absolute left-0 top-0 ${sizeClasses[size]} animate-ping rounded-full border-t-4 border-sky-400 opacity-20`}></div>
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
          <div className={`${sizeClasses[size]} animate-spin rounded-full border-b-4 border-t-4 border-sky-700 dark:border-sky-400`}></div>
        );
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {renderSpinner()}
      {text && (
        <p className="mt-4 text-center text-sm font-medium text-slate-500 dark:text-slate-400">{text}</p>
      )}
    </div>
  );
}
