import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

type Product = Database['public']['Tables']['products']['Row'];

export async function getProducts(page = 1, limit = 12) {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories!products_category_id_fkey(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return {
    data: data || [],
    totalPages: 1
  };
}

export async function getProductBySlug(slug: string) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories!products_category_id_fkey(*),
      reviews(*)
    `)
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data;
}

export async function getProductsByCategory(categoryId: string) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories!products_category_id_fkey(*)
    `)
    .eq('category_id', categoryId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  if (error) throw error;
  return data;
}

export async function getPromotedProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories!products_category_id_fkey(*)')
    .not('sale_price', 'is', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).filter(p => p.sale_price && p.price && p.sale_price < p.price);
}