import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Récupérer les variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Vérifier que les variables sont définies
if (!supabaseUrl) {
  console.error('VITE_SUPABASE_URL est manquante dans le fichier .env');
}

if (!supabaseKey) {
  console.error('VITE_SUPABASE_ANON_KEY est manquante dans le fichier .env');
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Variables d\'environnement Supabase manquantes. Vérifiez votre fichier .env');
}

// Créer le client Supabase
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Fonction pour tester la connexion
export async function testConnection() {
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erreur de connexion Supabase:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}