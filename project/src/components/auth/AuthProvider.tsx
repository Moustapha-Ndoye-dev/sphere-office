import React from 'react';
import { onAuthStateChange, checkSession } from '../../lib/auth.supabase';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const initialize = async () => {
      try {
        await checkSession();
      } catch (initializationError) {
        setError(initializationError instanceof Error ? initializationError.message : "Erreur d'initialisation");
      }
    };

    initialize();

    let unsubscribeFunction = () => {};
    try {
      const { unsubscribe } = onAuthStateChange(() => {});
      unsubscribeFunction = unsubscribe;
    } catch (authChangeError) {
      console.error("Erreur lors de l'abonnement aux changements d'etat:", authChangeError);
    }

    return () => {
      unsubscribeFunction();
    };
  }, []);

  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-900">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 max-w-md">
          <p className="font-bold">Erreur de connexion</p>
          <p>{error}</p>
          <p className="mt-2">Verifiez votre connexion et rechargez la page.</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => window.location.reload()}
            className="rounded bg-sky-700 px-4 py-2 text-white hover:bg-sky-800"
          >
            Reessayer
          </button>
          <button
            onClick={() => {
              window.location.href = '/admin/login';
            }}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Aller a la page de connexion
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
