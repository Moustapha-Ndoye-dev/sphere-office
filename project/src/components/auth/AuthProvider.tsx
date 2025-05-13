import React from 'react';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import { onAuthStateChange, checkSession } from '../../lib/auth.supabase';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((state) => state.setUser);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const initialize = async () => {
      try {
        // Test de connexion basique avec timeout
        try {
          const testPromise = supabase.from('profiles').select('count').limit(1);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout de connexion à Supabase')), 3000)
          );
          
          const { data: testData, error: testError } = await Promise.race([
            testPromise,
            timeoutPromise.then(() => { throw new Error('Timeout de connexion à Supabase'); })
          ]) as any;
          
          if (testError) {
            throw new Error(`Erreur de connexion à Supabase: ${testError.message}`);
          }
        } catch (testError) {
          // Continuer malgré l'erreur de test
        }
        
        // Appel à checkSession
        try {
          await checkSession();
        } catch (sessionError) {
          // L'utilisateur sera considéré comme non connecté
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Erreur d\'initialisation');
      }
    };

    initialize();

    // S'abonner aux changements d'état d'authentification
    let unsubscribeFunction = () => {};
    try {
      const { unsubscribe } = onAuthStateChange((event, session) => {});
      unsubscribeFunction = unsubscribe;
    } catch (authChangeError) {
      console.error('Erreur lors de l\'abonnement aux changements d\'état:', authChangeError);
    }

    return () => {
      unsubscribeFunction();
    };
  }, [setUser]);

  // Afficher les erreurs
  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-900">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 max-w-md">
          <p className="font-bold">Erreur de connexion</p>
          <p>{error}</p>
          <p className="mt-2">Vérifiez votre connexion à Supabase et les variables d'environnement.</p>
          <div className="mt-4 text-sm">
            <p>URL: {import.meta.env.VITE_SUPABASE_URL || 'Non définie'}</p>
            <p>Clé: {import.meta.env.VITE_SUPABASE_ANON_KEY ? import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 20) + '...' : 'Non définie'}</p>
          </div>
        </div>
        <div className="flex space-x-4">
          <button 
            onClick={() => window.location.reload()} 
            className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
          >
            Réessayer
          </button>
          <button 
            onClick={() => {
              setError(null);
            }} 
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
          >
            Continuer quand même
          </button>
          <button 
            onClick={() => window.location.href = '/admin/login'} 
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Aller à la page de connexion
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}