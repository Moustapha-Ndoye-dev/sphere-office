import React from 'react';
import { formatPrice } from '../../lib/utils';
import { useAuthStore } from '../../store/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

interface InvoiceProps {
  order: {
    id: string;
    customer_name: string;
    email: string;
    phone: string;
    address: string;
    total: number;
    created_at: string;
    items: Array<{
      product: {
        name: string;
        price: number;
      };
      quantity: number;
      price: number;
    }>;
  };
}

export const Invoice = React.forwardRef<HTMLDivElement, InvoiceProps>(({ order }, ref) => {
  const user = useAuthStore((state) => state.user);

  const { data: settings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div ref={ref} className="bg-white p-8 max-w-2xl mx-auto">
      {/* En-tête */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-4">
            {settings?.logo && (
              <img 
                src={settings.logo} 
                alt="Logo" 
                className="h-16 w-auto object-contain"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SPHERE OFFICE</h1>
              <p className="text-gray-600">111 AVENUE BLAISE DIAGNE</p>
              <p className="text-gray-600">DAKAR - SENEGAL</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-gray-900">FACTURE</p>
            <p className="text-gray-600">N° {order.id.slice(0, 8)}</p>
            <p className="text-gray-600">
              Date : {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Informations légales */}
        <div className="mt-4 text-sm text-gray-600">
          <p>RC : SN.DKR.2018.A.27973</p>
          <p>NINEA : 007275292 1D1</p>
          <p>Tél : +221 77 541 45 90 / 77 118 34 60</p>
          <p>Email : IBRAHIMADIAW@GMAIL.COM</p>
        </div>
      </div>

      {/* Informations client */}
      <div className="mb-8">
        <div className="border-b-2 border-gray-200 pb-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Client</h2>
        </div>
        <div className="text-gray-600">
          <p className="font-medium">{order.customer_name}</p>
          <p>{order.email}</p>
          <p>{order.phone}</p>
          <p className="whitespace-pre-line">{order.address}</p>
        </div>
      </div>

      {/* Tableau des articles */}
      <div className="mb-8">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="py-2 text-left text-gray-900">Description</th>
              <th className="py-2 text-right text-gray-900">Prix unitaire</th>
              <th className="py-2 text-right text-gray-900">Quantité</th>
              <th className="py-2 text-right text-gray-900">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {order.items.map((item, index) => (
              <tr key={index}>
                <td className="py-4 text-gray-600">{item.product.name}</td>
                <td className="py-4 text-right text-gray-600">
                  {formatPrice(item.price)}
                </td>
                <td className="py-4 text-right text-gray-600">{item.quantity}</td>
                <td className="py-4 text-right text-gray-600">
                  {formatPrice(item.price * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-900">
              <td colSpan={3} className="py-4 text-right font-bold text-gray-900">
                Total
              </td>
              <td className="py-4 text-right font-bold text-gray-900">
                {formatPrice(order.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Conditions et signatures */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="font-bold text-gray-900 mb-2">Conditions de paiement</h3>
          <p className="text-sm text-gray-600">
            Paiement à la livraison ou par virement bancaire.<br />
            Merci de votre confiance.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-gray-900 mb-2">Signature</h3>
          <div className="h-20 border-b border-gray-300"></div>
        </div>
      </div>

      {/* Pied de page */}
      <div className="text-center text-sm text-gray-600 border-t pt-8">
        <p>SPHERE OFFICE - 111 AVENUE BLAISE DIAGNE, DAKAR - SENEGAL</p>
        <p>RC : SN.DKR.2018.A.27973 - NINEA : 007275292 1D1</p>
        <p>Tél : +221 77 541 45 90 / 77 118 34 60 - Email : IBRAHIMADIAW@GMAIL.COM</p>
      </div>
    </div>
  );
});

Invoice.displayName = 'Invoice';