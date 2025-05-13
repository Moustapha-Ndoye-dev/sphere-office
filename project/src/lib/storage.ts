import { supabase } from './supabase';
import { validateFileUpload } from './security';
import toast from 'react-hot-toast';

export async function uploadProductImage(file: File) {
  try {
    // Valider le fichier
    const isValid = await validateFileUpload(file);
    if (!isValid) {
      throw new Error('Fichier invalide');
    }

    // Générer un nom de fichier sécurisé
    const fileExt = file.name.split('.').pop();
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

    toast.success('Image uploadée avec succès');
    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    toast.error('Erreur lors de l\'upload de l\'image');
    throw error;
  }
}

export async function deleteProductImage(url: string) {
  try {
    // Extraire le nom du fichier de l'URL de manière sécurisée
    const fileName = url.split('/').pop();
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

    toast.success('Image supprimée avec succès');
  } catch (error) {
    console.error('Error deleting image:', error);
    toast.error('Erreur lors de la suppression de l\'image');
    throw error;
  }
}