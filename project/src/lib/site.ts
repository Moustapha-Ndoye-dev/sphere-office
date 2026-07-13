import type { Json } from '../types/database';

export function getProductImages(images: Json | null | undefined): string[] {
  if (!Array.isArray(images)) {
    return [];
  }

  return images.filter((image): image is string => typeof image === 'string' && image.length > 0);
}

export function getPrimaryProductImage(images: Json | null | undefined) {
  return (
    getProductImages(images)[0] ||
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80'
  );
}

export function getProductCategoryName(product: {
  category_name?: string | null;
  categories?: { name?: string | null } | null;
  category?: { name?: string | null } | null;
}) {
  return product.category_name || product.categories?.name || product.category?.name || 'Collection Sphere Office';
}

export function normalizePhoneForTel(phone?: string | null) {
  if (!phone) return '';
  return phone.replace(/[^\d+]/g, '');
}

export function normalizePhoneForWhatsApp(phone?: string | null) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

export function buildWhatsAppUrl(phone: string | null | undefined, message: string) {
  const normalizedPhone = normalizePhoneForWhatsApp(phone);

  if (!normalizedPhone) {
    return '#';
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export function getSafeExternalUrl(url?: string | null) {
  if (!url) return '';

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:' ? parsedUrl.toString() : '';
  } catch {
    return '';
  }
}

export function getSafeAssetUrl(url?: string | null) {
  if (!url) return '';
  if (url.startsWith('/')) return url;
  return getSafeExternalUrl(url);
}
