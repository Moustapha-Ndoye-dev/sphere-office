import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

type Review = Database['public']['Tables']['reviews']['Row'];

// Clé pour le localStorage
const REVIEWED_PRODUCTS_KEY = 'reviewed_products';

// Fonction pour vérifier si un produit a déjà été évalué
function hasUserReviewedProduct(productId: string): boolean {
  try {
    const reviewedProducts = JSON.parse(localStorage.getItem(REVIEWED_PRODUCTS_KEY) || '[]');
    return reviewedProducts.includes(productId);
  } catch {
    return false;
  }
}

// Fonction pour marquer un produit comme évalué
function markProductAsReviewed(productId: string): void {
  try {
    const reviewedProducts = JSON.parse(localStorage.getItem(REVIEWED_PRODUCTS_KEY) || '[]');
    if (!reviewedProducts.includes(productId)) {
      reviewedProducts.push(productId);
      localStorage.setItem(REVIEWED_PRODUCTS_KEY, JSON.stringify(reviewedProducts));
    }
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

export async function createReview(review: Omit<Review, 'id' | 'created_at' | 'is_approved'>) {
  // Vérifier si l'utilisateur a déjà évalué ce produit
  if (hasUserReviewedProduct(review.product_id)) {
    throw new Error('Vous avez déjà donné votre avis sur ce produit');
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert(review)
    .select()
    .single();

  if (error) throw error;

  // Marquer le produit comme évalué
  markProductAsReviewed(review.product_id);

  return data;
}

export async function getProductReviews(productId: string) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('product_id', productId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Fonction pour vérifier si l'utilisateur peut donner son avis
export function canUserReview(productId: string): boolean {
  return !hasUserReviewedProduct(productId);
}