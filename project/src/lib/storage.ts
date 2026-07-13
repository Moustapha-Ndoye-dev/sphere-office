import { supabase } from './supabase';
import { validateFileUpload } from './security';

const FILE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function uploadProductImage(file: File) {
  try {
    // Valider le fichier
    const isValid = await validateFileUpload(file);
    if (!isValid) {
      throw new Error('Fichier invalide');
    }

    // Générer un nom de fichier sécurisé
    const fileExt = FILE_EXTENSIONS[file.type];
    if (!fileExt) throw new Error('Format de fichier non autorise');
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload vers Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Obtenir l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('products')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

export async function deleteProductImage(url: string) {
  try {
    // Extraire le nom du fichier de l'URL de manière sécurisée
    const parsedUrl = new URL(url);
    const storageOrigin = new URL(import.meta.env.VITE_SUPABASE_URL).origin;
    const storagePrefix = '/storage/v1/object/public/products/';
    if (parsedUrl.origin !== storageOrigin || !parsedUrl.pathname.startsWith(storagePrefix)) return;

    const fileName = decodeURIComponent(parsedUrl.pathname.slice(storagePrefix.length));
    if (!fileName) return;

    // Valider le nom du fichier
    if (!/^[0-9a-zA-Z-]+\.[a-zA-Z]+$/.test(fileName)) {
      throw new Error('Nom de fichier invalide');
    }

    // Supprimer de Supabase Storage
    const { error } = await supabase.storage
      .from('products')
      .remove([fileName]);

    if (error) {
      throw error;
    }

  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
}
