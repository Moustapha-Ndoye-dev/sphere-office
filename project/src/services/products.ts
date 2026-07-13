import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

export type PublicProduct = Database['public']['Views']['public_products']['Row'];

const PUBLIC_PRODUCT_SELECT = `
  id,
  name,
  slug,
  description,
  price,
  sale_price,
  sku,
  is_featured,
  category_id,
  category_name,
  category_slug,
  availability,
  is_in_stock,
  images,
  created_at,
  updated_at
`;

export async function getProducts(page = 1, pageSize = 24) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await supabase
    .from('public_products')
    .select(PUBLIC_PRODUCT_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return {
    data: data || [],
    totalCount: count || 0,
    totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
  };
}

export async function getProductBySlug(slug: string) {
  const { data, error } = await supabase
    .from('public_products')
    .select(PUBLIC_PRODUCT_SELECT)
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getProductsByCategory(categoryId: string) {
  const { data, error } = await supabase
    .from('public_products')
    .select(PUBLIC_PRODUCT_SELECT)
    .eq('category_id', categoryId)
    .order('created_at', { ascending: false })
    .limit(24);

  if (error) throw error;
  return data;
}

export async function getProductsByIds(productIds: string[]) {
  const uniqueIds = [...new Set(productIds)].filter(Boolean).slice(0, 50);
  if (uniqueIds.length === 0) return [];

  const { data, error } = await supabase
    .from('public_products')
    .select(PUBLIC_PRODUCT_SELECT)
    .in('id', uniqueIds);

  if (error) throw error;
  return data || [];
}

export async function getCategories() {
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) throw error;
  return data;
}
