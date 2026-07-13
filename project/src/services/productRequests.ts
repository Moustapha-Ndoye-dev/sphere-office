import { supabase } from '../lib/supabase';
import type { NormalizedProductRequestInput } from '../lib/productRequest';

export async function createProductRequest(
  input: NormalizedProductRequestInput,
  idempotencyKey: string
) {
  const { data, error } = await supabase.rpc('create_product_request_secure', {
    p_product_id: input.productId,
    p_quantity: input.quantity,
    p_customer_name: input.customerName,
    p_phone: input.phone,
    p_address: input.address,
    p_notes: input.notes || null,
    p_idempotency_key: idempotencyKey,
  });

  if (error) throw error;
  return data;
}
