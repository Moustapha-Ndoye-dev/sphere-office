import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

export async function createOrder(
  order: {
    customer_name: string;
    email: string;
    phone: string;
    address: string;
    total: number;
    status: Database['public']['Enums']['order_status'];
  },
  items: {
    product_id: string;
    quantity: number;
    price: number;
  }[]
) {
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert(order)
    .select()
    .single();

  if (orderError) throw orderError;

  const orderItems = items.map(item => ({
    ...item,
    order_id: orderData.id
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) throw itemsError;

  return orderData;
}

export async function getOrderById(id: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(
        *,
        product:products(*)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function generateInvoice(orderId: string) {
  const { data, error } = await supabase
    .rpc('generate_invoice_number');

  if (error) throw error;
  return data;
}