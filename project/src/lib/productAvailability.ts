type ProductAvailabilityShape = {
  availability?: 'available' | 'unavailable' | 'on_order';
  is_in_stock: boolean;
  price: number;
  sale_price: number | null;
};

export function isOnOrderProduct(product: Pick<ProductAvailabilityShape, 'availability'>) {
  return product.availability === 'on_order';
}

export function getEffectiveProductPrice(
  product: Pick<ProductAvailabilityShape, 'price' | 'sale_price'>
) {
  const price = product.sale_price ?? product.price;
  return Number.isFinite(price) && price > 0 ? price : null;
}

export function isSellableProduct(product: ProductAvailabilityShape) {
  return product.availability !== 'on_order'
    && product.availability !== 'unavailable'
    && product.is_in_stock
    && getEffectiveProductPrice(product) !== null;
}

export function compareProductsByPrice(
  first: ProductAvailabilityShape,
  second: ProductAvailabilityShape,
  direction: 'asc' | 'desc'
) {
  const firstPrice = isOnOrderProduct(first) ? null : getEffectiveProductPrice(first);
  const secondPrice = isOnOrderProduct(second) ? null : getEffectiveProductPrice(second);

  if (firstPrice === null && secondPrice === null) return 0;
  if (firstPrice === null) return 1;
  if (secondPrice === null) return -1;
  return direction === 'asc' ? firstPrice - secondPrice : secondPrice - firstPrice;
}
