import { formatPrice } from '../../lib/utils';

export type InvoiceStatus = 'paid' | 'partial' | 'pending';

export type InvoiceTemplateData = {
  shop: {
    name: string;
    description: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    ninea?: string | null;
    rccm?: string | null;
    logo?: string | null;
  };
  client: {
    name: string;
    phone: string;
    email: string;
    address: string;
    ninea?: string | null;
  };
  invoice: {
    number: string;
    orderReference: string;
    date: string;
    dueDate?: string | null;
    status: InvoiceStatus;
  };
  items: Array<{
    designation: string;
    sku?: string | null;
    quantity: number;
    unitPrice: number;
    discount?: number;
    total: number;
  }>;
  totals: {
    subtotal: number;
    globalDiscount: number;
    deliveryFee: number;
    total: number;
    paid: number;
    remaining: number;
  };
};

type InvoiceTemplateProps = {
  data: InvoiceTemplateData;
};

const MAX_INVOICE_ROWS_PER_PAGE = 12;

const statusLabels: Record<InvoiceStatus, string> = {
  paid: 'Payee',
  partial: 'Partiellement payee',
  pending: 'En attente',
};

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks.length > 0 ? chunks : [[]];
}

export function InvoiceTemplate({ data }: InvoiceTemplateProps) {
  const itemPages = chunkItems(data.items, MAX_INVOICE_ROWS_PER_PAGE);

  return (
    <div className="invoice-pages">
      <style>
        {`
          @page {
            size: A4 portrait;
            margin: 0;
          }

          .invoice-template {
            width: 210mm;
            min-height: 297mm;
            padding: 10mm;
            font-size: 10px;
            line-height: 1.28;
          }

          .invoice-template + .invoice-template {
            margin-top: 18px;
          }

          .invoice-table {
            width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
          }

          .invoice-table th,
          .invoice-table td {
            overflow-wrap: anywhere;
            vertical-align: top;
          }

          @media screen and (max-width: 900px) {
            .invoice-template {
              width: 100%;
              min-height: auto;
              padding: 14px;
              box-shadow: none;
            }
          }

          @media screen and (max-width: 640px) {
            .invoice-template {
              padding: 10px;
              overflow-x: hidden;
            }

            .invoice-header-main,
            .invoice-client-grid,
            .invoice-summary-grid,
            .invoice-signatures {
              grid-template-columns: 1fr;
            }

            .invoice-header-card {
              text-align: left;
            }
          }

          @media print {
            html,
            body {
              width: 210mm;
              min-height: 297mm;
              margin: 0 !important;
              background: #ffffff !important;
            }

            .invoice-template {
              width: 210mm !important;
              min-height: 297mm !important;
              margin: 0 !important;
              padding: 10mm !important;
              box-shadow: none !important;
              color: #0f172a !important;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }

            .invoice-template:not(:last-child) {
              break-after: page;
              page-break-after: always;
            }

            .invoice-avoid-break {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .invoice-table thead {
              display: table-header-group;
            }

            .invoice-table tr,
            .invoice-table td,
            .invoice-table th {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        `}
      </style>

      {itemPages.map((pageItems, pageIndex) => {
        const isLastPage = pageIndex === itemPages.length - 1;
        const firstRowNumber = pageIndex * MAX_INVOICE_ROWS_PER_PAGE + 1;

        return (
          <div key={pageIndex} className="invoice-template mx-auto flex flex-col bg-white text-slate-950 shadow-xl shadow-slate-950/10">
            <header className="invoice-avoid-break border-b-2 border-sky-900 pb-3">
              <div className="invoice-header-main grid grid-cols-[1fr_178px] items-start gap-5">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white p-1.5">
                    {data.shop.logo ? (
                      <img src={data.shop.logo} alt="Logo Sphere Office" className="max-h-11 max-w-full object-contain" />
                    ) : (
                      <span className="text-base font-black tracking-tight text-sky-900">SO</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase text-sky-800">{data.shop.description}</p>
                    <h1 className="mt-0.5 text-xl font-black uppercase text-slate-950">{data.shop.name}</h1>
                    <div className="mt-1 grid gap-0.5 text-[10px] text-slate-600">
                      <span>{data.shop.address}</span>
                      <span>Tel : {data.shop.phone} - Email : {data.shop.email}</span>
                      <span>Web : {data.shop.website}</span>
                      {(data.shop.ninea || data.shop.rccm) && (
                        <span>
                          {data.shop.ninea ? `NINEA : ${data.shop.ninea}` : ''}
                          {data.shop.ninea && data.shop.rccm ? ' - ' : ''}
                          {data.shop.rccm ? `RCCM : ${data.shop.rccm}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="invoice-header-card rounded-md border border-slate-200 bg-slate-50 p-3 text-right">
                  <p className="text-[10px] font-black uppercase text-sky-900">{pageIndex === 0 ? 'Facture' : 'Facture - suite'}</p>
                  <p className="mt-1 text-sm font-black text-slate-950">{data.invoice.number}</p>
                  <div className="mt-2 grid gap-0.5 text-[10px] text-slate-600">
                    <p>Date : <span className="font-semibold text-slate-900">{data.invoice.date}</span></p>
                    <p>Echeance : <span className="font-semibold text-slate-900">{data.invoice.dueDate || 'A reception'}</span></p>
                    <p>Page : <span className="font-semibold text-slate-900">{pageIndex + 1}/{itemPages.length}</span></p>
                    {isLastPage && <p>Statut : <span className="font-semibold text-emerald-700">{statusLabels[data.invoice.status]}</span></p>}
                  </div>
                </div>
              </div>
            </header>

            <main className="flex flex-1 flex-col pt-4">
              <section className="invoice-client-grid invoice-avoid-break grid grid-cols-[1fr_180px] gap-4 rounded-md border border-slate-200 p-3">
                <div>
                  <h2 className="text-[10px] font-black uppercase text-sky-900">Client</h2>
                  <p className="mt-1 text-sm font-black text-slate-950">{data.client.name}</p>
                  <div className="mt-1 grid gap-0.5 text-[10px] text-slate-600">
                    <p>{data.client.phone} - {data.client.email}</p>
                    <p className="whitespace-pre-line">{data.client.address}</p>
                    <p>NINEA client : {data.client.ninea || 'Non renseigne'}</p>
                  </div>
                </div>
                <div className="text-[10px] text-slate-600">
                  <h2 className="text-[10px] font-black uppercase text-sky-900">Reference</h2>
                  <p className="mt-1 break-all font-semibold text-slate-900">{data.invoice.orderReference}</p>
                </div>
              </section>

              <section className="mt-4">
                <table className="invoice-table overflow-hidden rounded-md border border-slate-200 text-[10px]">
                  <colgroup>
                    <col className="w-[6%]" />
                    <col className="w-[36%]" />
                    <col className="w-[13%]" />
                    <col className="w-[8%]" />
                    <col className="w-[14%]" />
                    <col className="w-[11%]" />
                    <col className="w-[12%]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-sky-950 text-white">
                      <th className="px-2 py-2 text-left font-bold uppercase">N°</th>
                      <th className="px-2 py-2 text-left font-bold uppercase">Designation</th>
                      <th className="px-2 py-2 text-left font-bold uppercase">Ref/SKU</th>
                      <th className="px-2 py-2 text-right font-bold uppercase">Qte</th>
                      <th className="px-2 py-2 text-right font-bold uppercase">Prix U.</th>
                      <th className="whitespace-nowrap px-2 py-2 text-right font-bold uppercase">Remise</th>
                      <th className="px-2 py-2 text-right font-bold uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item, index) => (
                      <tr key={`${item.designation}-${pageIndex}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="border-t border-slate-200 px-2 py-1.5 font-semibold text-slate-500">{firstRowNumber + index}</td>
                        <td className="border-t border-slate-200 px-2 py-1.5 font-semibold text-slate-900">{item.designation}</td>
                        <td className="border-t border-slate-200 px-2 py-1.5 text-slate-500">{item.sku || '-'}</td>
                        <td className="border-t border-slate-200 px-2 py-1.5 text-right text-slate-700">{item.quantity}</td>
                        <td className="border-t border-slate-200 px-2 py-1.5 text-right text-slate-700">{formatPrice(item.unitPrice)}</td>
                        <td className="border-t border-slate-200 px-2 py-1.5 text-right text-slate-700">{formatPrice(item.discount || 0)}</td>
                        <td className="border-t border-slate-200 px-2 py-1.5 text-right font-bold text-slate-950">{formatPrice(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              {isLastPage ? (
                <>
                  <section className="invoice-summary-grid invoice-avoid-break mt-4 grid grid-cols-[1fr_238px] gap-4">
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-[10px] leading-5 text-slate-600">
                      <span className="font-black uppercase text-sky-900">Note</span>
                      <p className="mt-1">Merci pour votre confiance.</p>
                      <p>Marchandises non reprises ni echangees sauf defaut constate.</p>
                      <p>Facture generee automatiquement par Sphere Office.</p>
                    </div>

                    <div className="rounded-md border border-slate-200 p-3 text-[10px]">
                      {[
                        ['Sous-total', data.totals.subtotal],
                        ['Remise', data.totals.globalDiscount],
                        ['Frais de livraison', data.totals.deliveryFee],
                        ['Montant paye', data.totals.paid],
                        ['Reste a payer', data.totals.remaining],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-4 border-b border-slate-100 py-1">
                          <span className="text-slate-500">{label}</span>
                          <span className="font-semibold text-slate-900">{formatPrice(value as number)}</span>
                        </div>
                      ))}
                      <div className="mt-2 flex items-center justify-between rounded bg-sky-950 px-3 py-2 text-white">
                        <span className="text-[10px] font-black uppercase">Total</span>
                        <span className="text-sm font-black">{formatPrice(data.totals.total)}</span>
                      </div>
                    </div>
                  </section>

                  <section className="invoice-signatures invoice-avoid-break mt-5 grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-600">Signature du client</p>
                      <div className="mt-10 border-b border-slate-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-600">Signature et cachet Sphere Office</p>
                      <div className="mt-3 h-16 rounded-md border border-dashed border-slate-400" />
                    </div>
                  </section>
                </>
              ) : (
                <div className="mt-auto rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-right text-[10px] font-semibold text-sky-900">
                  Suite des lignes produits sur la page suivante.
                </div>
              )}
            </main>

            <footer className="invoice-avoid-break mt-auto h-2" />
          </div>
        );
      })}
    </div>
  );
}
