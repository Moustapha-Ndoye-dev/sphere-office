import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { InvoiceTemplate, type InvoiceTemplateData } from './InvoiceTemplate';

interface InvoiceProps {
  order: {
    id: string;
    customer_name: string;
    email: string;
    phone: string;
    address: string;
    total: number;
    payment_status?: 'unpaid' | 'partial' | 'paid' | 'refunded';
    subtotal?: number;
    discount_total?: number;
    delivery_fee?: number;
    total_ht?: number;
    tax_total?: number;
    total_ttc?: number;
    amount_paid?: number;
    balance_due?: number;
    created_at: string;
    items: Array<{
      product?: { sku?: string | null } | null;
      item_name?: string | null;
      item_reference?: string | null;
      quantity: number;
      price: number;
    }>;
  };
}

const DEFAULT_SHOP = {
  name: 'SPHERE OFFICE',
  description: 'Fournitures, mobilier et equipements de bureau',
  address: '111, Avenue Blaise Diagne',
  phone: '+221 33 848 46 68',
  email: 'ibrahimadiawo582@gmail.com',
  website: 'www.sphereoffice92.com',
  ninea: import.meta.env.VITE_COMPANY_NINEA?.trim() || null,
  rccm: import.meta.env.VITE_COMPANY_RCCM?.trim() || null,
};

function formatInvoiceNumber(orderId: string, createdAt: string) {
  const year = new Date(createdAt).getFullYear();
  return `FACT-${year}-${orderId.slice(0, 8).toUpperCase()}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('fr-FR');
}

export const Invoice = React.forwardRef<HTMLDivElement, InvoiceProps>(({ order }, ref) => {
  const { data: settings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('*').single();
      if (error) throw error;
      return data;
    },
  });

  const frozenLineTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotal = order.subtotal ?? frozenLineTotal;
  const discountTotal = order.discount_total ?? 0;
  const deliveryFee = order.delivery_fee ?? 0;
  const total = order.total_ttc ?? order.total ?? Math.max(0, subtotal - discountTotal + deliveryFee);
  const paid = Math.min(Math.max(order.amount_paid ?? 0, 0), total);

  const invoiceData: InvoiceTemplateData = {
    shop: {
      ...DEFAULT_SHOP,
      address: settings?.location_address || DEFAULT_SHOP.address,
      phone: settings?.location_phone || DEFAULT_SHOP.phone,
      email: settings?.location_email || DEFAULT_SHOP.email,
      logo: settings?.logo || '/assets/logo-sphere.png',
    },
    client: {
      name: order.customer_name || 'Client au comptoir',
      phone: order.phone || 'Non renseigne',
      email: order.email || 'Non renseigne',
      address: order.address || 'Non renseigne',
      ninea: null,
    },
    invoice: {
      number: formatInvoiceNumber(order.id, order.created_at),
      orderReference: order.id,
      date: formatDate(order.created_at),
      dueDate: null,
      status: order.payment_status === 'partial' ? 'partial' : order.payment_status === 'paid' ? 'paid' : 'pending',
    },
    items: order.items.map((item) => {
      const designation = item.item_name || 'Article enregistre';
      const lineTotal = item.price * item.quantity;
      return {
        designation,
        sku: item.item_reference || item.product?.sku || null,
        quantity: item.quantity,
        unitPrice: item.price,
        discount: 0,
        total: lineTotal,
      };
    }),
    totals: {
      subtotal,
      globalDiscount: discountTotal,
      deliveryFee,
      total,
      paid,
      remaining: order.balance_due ?? Math.max(0, total - paid),
    },
  };

  return (
    <div ref={ref}>
      <InvoiceTemplate data={invoiceData} />
    </div>
  );
});

Invoice.displayName = 'Invoice';
