import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from 'pdf-lib';
import { createAdminClient, resolveRequesterProfile } from '../_profilesAuth.ts';
import { applyApiCorsHeaders, applyApiSecurityHeaders } from '../_httpSecurity.ts';

type ApiRequest = {
  method?: string;
  headers: {
    authorization?: string;
    origin?: string | string[];
    host?: string | string[];
    'x-forwarded-host'?: string | string[];
    'x-forwarded-proto'?: string | string[];
  };
  query?: {
    orderId?: string | string[];
  };
};

type ApiResponse = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => {
    json: (body: unknown) => void;
    send: (body: Uint8Array | Buffer | string) => void;
    end: () => void;
  };
};

type SiteSettings = {
  location_address?: string;
  location_phone?: string;
  location_email?: string;
  logo?: string | null;
};

type InvoiceOrder = {
  id: string;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  total: number;
  payment_status: 'unpaid' | 'partial' | 'paid' | 'refunded';
  subtotal: number;
  discount_total: number;
  delivery_fee: number;
  total_ht: number;
  tax_total: number;
  total_ttc: number;
  amount_paid: number;
  balance_due: number;
  payment_method: string | null;
  created_at: string;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    item_name: string | null;
    item_reference: string | null;
  }>;
};

const COMPANY_NAME = 'SPHERE OFFICE';
const COMPANY_DESCRIPTION = 'Fournitures, mobilier et equipements de bureau';
const COMPANY_NINEA = process.env.VITE_COMPANY_NINEA?.trim() || '';
const COMPANY_RCCM = process.env.VITE_COMPANY_RCCM?.trim() || '';
const COMPANY_WEBSITE = 'www.sphereoffice92.com';
const DEFAULT_ADDRESS = '111, Avenue Blaise Diagne';
const DEFAULT_PHONE = '+221 33 848 46 68';
const DEFAULT_EMAIL = 'ibrahimadiawo582@gmail.com';
const PAYMENT_STATUS_LABELS: Record<InvoiceOrder['payment_status'], string> = {
  unpaid: 'Non payee',
  partial: 'Partiellement payee',
  paid: 'Payee',
  refunded: 'Remboursee',
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const MAX_INVOICE_ROWS_PER_PAGE = 12;
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const COLORS = {
  ink: rgb(0.06, 0.09, 0.16),
  muted: rgb(0.36, 0.41, 0.49),
  line: rgb(0.84, 0.87, 0.91),
  soft: rgb(0.95, 0.97, 0.99),
  primary: rgb(0.03, 0.18, 0.34),
  primarySoft: rgb(0.9, 0.95, 1),
  white: rgb(1, 1, 1),
  paid: rgb(0.02, 0.45, 0.23),
};

function getBearerToken(request: ApiRequest) {
  const authorization = request.headers.authorization || '';
  if (!authorization.startsWith('Bearer ') || authorization.length > 4096) {
    throw new Error('Unauthorized');
  }

  const accessToken = authorization.slice('Bearer '.length).trim();
  if (!accessToken || /\s/.test(accessToken)) {
    throw new Error('Unauthorized');
  }

  return accessToken;
}

function getOrderId(request: ApiRequest) {
  const rawOrderId = request.query?.orderId;
  const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;

  if (!orderId) {
    throw new Error('Missing order id');
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
    throw new Error('Invalid order id');
  }

  return orderId;
}

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString('fr-FR').replace(/\u202f/g, ' ')} FCFA`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('fr-FR');
}

function formatInvoiceNumber(orderId: string, createdAt: string) {
  return `FACT-${new Date(createdAt).getFullYear()}-${orderId.slice(0, 8).toUpperCase()}`;
}

function normalizeText(value: string) {
  return value
    .replace(/\u00a0|\u202f/g, ' ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\uFFFD/g, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '');
}

function textWidth(font: PDFFont, text: string, size: number) {
  return font.widthOfTextAtSize(normalizeText(text), size);
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  options: {
    size: number;
    font: PDFFont;
    color?: RGB;
    align?: 'left' | 'right';
    width?: number;
  }
) {
  const value = normalizeText(text);
  const drawX = options.align === 'right' && options.width
    ? x + options.width - textWidth(options.font, value, options.size)
    : x;

  page.drawText(value, {
    x: drawX,
    y,
    size: options.size,
    font: options.font,
    color: options.color || COLORS.ink,
  });
}

function wrapText(font: PDFFont, text: string, size: number, maxWidth: number) {
  const words = normalizeText(text || '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(font, candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }

    if (line) lines.push(line);
    line = word;
  }

  if (line) lines.push(line);
  return lines.length > 0 ? lines : [''];
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  options: { size: number; font: PDFFont; color?: RGB; lineHeight?: number; maxLines?: number }
) {
  const lineHeight = options.lineHeight || options.size + 3;
  const lines = wrapText(options.font, text, options.size, maxWidth).slice(0, options.maxLines || 100);
  lines.forEach((line, index) => {
    drawText(page, line, x, y - index * lineHeight, {
      size: options.size,
      font: options.font,
      color: options.color,
    });
  });
  return y - lines.length * lineHeight;
}

function drawBox(page: PDFPage, x: number, y: number, width: number, height: number, options?: { fill?: RGB; border?: RGB; thickness?: number }) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: options?.fill,
    borderColor: options?.border,
    borderWidth: options?.border ? options.thickness || 1 : 0,
  });
}

function getSafeLogoUrl(logoUrl?: string | null) {
  if (!logoUrl) return null;

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) return null;

    const allowedOrigin = new URL(supabaseUrl).origin;
    const candidate = new URL(logoUrl);
    if (
      candidate.protocol !== 'https:' ||
      candidate.origin !== allowedOrigin ||
      !candidate.pathname.startsWith('/storage/v1/object/public/products/')
    ) {
      return null;
    }

    return candidate.toString();
  } catch {
    return null;
  }
}

async function tryEmbedLogo(pdf: PDFDocument, logoUrl?: string | null) {
  const safeLogoUrl = getSafeLogoUrl(logoUrl);
  if (!safeLogoUrl) return null;

  try {
    const response = await fetch(safeLogoUrl, {
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const declaredSize = Number(response.headers.get('content-length') || 0);
    if (declaredSize > MAX_LOGO_BYTES) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_LOGO_BYTES) return null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('png')) {
      return await pdf.embedPng(bytes);
    }
    if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      return await pdf.embedJpg(bytes);
    }
  } catch {
    return null;
  }

  return null;
}

function drawLogo(page: PDFPage, logo: PDFImage | null, fontBold: PDFFont, x: number, y: number) {
  drawBox(page, x, y, 48, 48, { fill: COLORS.white, border: COLORS.line });
  if (logo) {
    const scale = Math.min(38 / logo.width, 38 / logo.height);
    const width = logo.width * scale;
    const height = logo.height * scale;
    page.drawImage(logo, {
      x: x + (48 - width) / 2,
      y: y + (48 - height) / 2,
      width,
      height,
    });
    return;
  }

  drawText(page, 'SO', x + 12, y + 18, {
    size: 16,
    font: fontBold,
    color: COLORS.primary,
  });
}

function getErrorStatus(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';

  if (message === 'Unauthorized') return 401;
  if (message === 'Forbidden') return 403;
  if (message === 'Missing order id') return 400;
  if (message === 'Invalid order id') return 400;
  if (message === 'Order not found') return 404;
  return 500;
}

async function buildInvoicePdf(order: InvoiceOrder, settings: SiteSettings | null) {
  const pdf = await PDFDocument.create();
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await tryEmbedLogo(pdf, settings?.logo);

  const address = settings?.location_address || DEFAULT_ADDRESS;
  const phone = settings?.location_phone || DEFAULT_PHONE;
  const email = settings?.location_email || DEFAULT_EMAIL;
  const invoiceNumber = formatInvoiceNumber(order.id, order.created_at);
  const frozenLineTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotal = order.subtotal ?? frozenLineTotal;
  const discountTotal = order.discount_total || 0;
  const deliveryFee = order.delivery_fee || 0;
  const total = order.total_ttc ?? order.total ?? Math.max(0, subtotal - discountTotal + deliveryFee);
  const amountPaid = order.amount_paid || 0;
  const balanceDue = order.balance_due ?? Math.max(0, total - amountPaid);
  const totalInvoicePages = Math.max(1, Math.ceil(order.items.length / MAX_INVOICE_ROWS_PER_PAGE));
  let currentInvoicePage = 1;

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const drawHeader = () => {
    drawLogo(page, logo, fontBold, MARGIN, y - 50);

    drawText(page, COMPANY_DESCRIPTION, MARGIN + 62, y - 8, {
      size: 7,
      font: fontBold,
      color: COLORS.primary,
    });
    drawText(page, COMPANY_NAME, MARGIN + 62, y - 25, {
      size: 18,
      font: fontBold,
      color: COLORS.ink,
    });
    drawWrappedText(page, address, MARGIN + 62, y - 39, 255, {
      size: 8,
      font: fontRegular,
      color: COLORS.muted,
      lineHeight: 9,
      maxLines: 2,
    });
    drawText(page, `Tel : ${phone} - Email : ${email}`, MARGIN + 62, y - 60, {
      size: 8,
      font: fontRegular,
      color: COLORS.muted,
    });
    drawText(page, `Web : ${COMPANY_WEBSITE}`, MARGIN + 62, y - 72, {
      size: 8,
      font: fontRegular,
      color: COLORS.muted,
    });
    const legalIdentifiers = [
      COMPANY_NINEA ? `NINEA : ${COMPANY_NINEA}` : '',
      COMPANY_RCCM ? `RCCM : ${COMPANY_RCCM}` : '',
    ].filter(Boolean).join(' - ');
    if (legalIdentifiers) {
      drawText(page, legalIdentifiers, MARGIN + 62, y - 84, {
        size: 8,
        font: fontRegular,
        color: COLORS.muted,
      });
    }

    const invoiceBoxWidth = 166;
    drawBox(page, PAGE_WIDTH - MARGIN - invoiceBoxWidth, y - 88, invoiceBoxWidth, 88, {
      fill: COLORS.soft,
      border: COLORS.line,
    });
    drawText(page, 'FACTURE', PAGE_WIDTH - MARGIN - invoiceBoxWidth + 12, y - 17, {
      size: 9,
      font: fontBold,
      color: COLORS.primary,
    });
    drawText(page, invoiceNumber, PAGE_WIDTH - MARGIN - invoiceBoxWidth + 12, y - 37, {
      size: 13,
      font: fontBold,
      color: COLORS.ink,
    });
    drawText(page, `Date : ${formatDate(order.created_at)}`, PAGE_WIDTH - MARGIN - invoiceBoxWidth + 12, y - 53, {
      size: 8,
      font: fontRegular,
      color: COLORS.muted,
    });
    drawText(page, 'Echeance : A reception', PAGE_WIDTH - MARGIN - invoiceBoxWidth + 12, y - 65, {
      size: 8,
      font: fontRegular,
      color: COLORS.muted,
    });
    drawText(page, `Page : ${currentInvoicePage}/${totalInvoicePages}`, PAGE_WIDTH - MARGIN - invoiceBoxWidth + 12, y - 77, {
      size: 8,
      font: fontRegular,
      color: COLORS.muted,
    });
    drawText(page, `Paiement : ${PAYMENT_STATUS_LABELS[order.payment_status] || 'Non renseigne'}`, PAGE_WIDTH - MARGIN - invoiceBoxWidth + 86, y - 77, {
      size: 8,
      font: fontRegular,
      color: COLORS.muted,
    });

    y -= 94;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 1.4,
      color: COLORS.primary,
    });
    y -= 12;
  };

  const drawParties = () => {
    const boxHeight = 66;
    drawBox(page, MARGIN, y - boxHeight, CONTENT_WIDTH, boxHeight, { border: COLORS.line });

    drawText(page, 'CLIENT', MARGIN + 12, y - 16, { size: 8, font: fontBold, color: COLORS.primary });
    drawText(page, order.customer_name || 'Client au comptoir', MARGIN + 12, y - 32, { size: 11, font: fontBold, color: COLORS.ink });
    drawText(page, `${order.phone || 'Non renseigne'} - ${order.email || 'Non renseigne'}`, MARGIN + 12, y - 46, { size: 8, font: fontRegular, color: COLORS.muted });
    drawWrappedText(page, order.address || 'Non renseigne', MARGIN + 12, y - 58, 295, { size: 8, font: fontRegular, color: COLORS.muted, lineHeight: 9, maxLines: 1 });

    const refX = MARGIN + 340;
    drawText(page, 'REFERENCE COMMANDE', refX, y - 16, { size: 8, font: fontBold, color: COLORS.primary });
    drawWrappedText(page, order.id, refX, y - 32, CONTENT_WIDTH - 352, { size: 8, font: fontBold, color: COLORS.ink, lineHeight: 9, maxLines: 2 });

    y -= boxHeight + 14;
  };

  const table = {
    x: MARGIN,
    widths: [26, 205, 62, 38, 70, 54, 84],
  };

  const drawTableHeader = () => {
    drawBox(page, table.x, y - 22, CONTENT_WIDTH, 22, { fill: COLORS.primary });
    const headers = ['N°', 'Designation', 'Ref/SKU', 'Qte', 'Prix U.', 'Remise', 'Total'];
    let x = table.x;
    headers.forEach((header, index) => {
      drawText(page, header, x + 6, y - 14, {
        size: 8,
        font: fontBold,
        color: COLORS.white,
        align: index >= 3 ? 'right' : 'left',
        width: table.widths[index] - 12,
      });
      x += table.widths[index];
    });
    y -= 22;
  };

  drawHeader();
  drawParties();
  drawTableHeader();

  let rowsOnCurrentPage = 0;

  order.items.forEach((item, index) => {
    const designation = item.item_name || 'Article enregistre';
    const lines = wrapText(fontRegular, designation, 9, table.widths[1] - 14);
    const rowHeight = Math.max(24, Math.min(lines.length, 2) * 9 + 10);

    if (rowsOnCurrentPage >= MAX_INVOICE_ROWS_PER_PAGE || y - rowHeight < 170) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      currentInvoicePage += 1;
      rowsOnCurrentPage = 0;
      y = PAGE_HEIGHT - MARGIN;
      drawHeader();
      drawParties();
      drawTableHeader();
    }

    drawBox(page, table.x, y - rowHeight, CONTENT_WIDTH, rowHeight, {
      fill: index % 2 === 0 ? COLORS.white : COLORS.soft,
      border: COLORS.line,
      thickness: 0.5,
    });

    let x = table.x;
    drawText(page, String(index + 1), x + 6, y - 16, { size: 8, font: fontBold, color: COLORS.muted });
    x += table.widths[0];
    drawWrappedText(page, designation, x + 6, y - 14, table.widths[1] - 12, { size: 8, font: fontRegular, color: COLORS.ink, lineHeight: 9, maxLines: 2 });
    x += table.widths[1];
    drawText(page, item.item_reference || '-', x + 6, y - 16, { size: 8, font: fontRegular, color: COLORS.muted });
    x += table.widths[2];
    drawText(page, String(item.quantity), x + 6, y - 16, { size: 8, font: fontRegular, color: COLORS.ink, align: 'right', width: table.widths[3] - 12 });
    x += table.widths[3];
    drawText(page, formatCurrency(item.price), x + 6, y - 16, { size: 8, font: fontRegular, color: COLORS.ink, align: 'right', width: table.widths[4] - 12 });
    x += table.widths[4];
    drawText(page, formatCurrency(0), x + 6, y - 16, { size: 8, font: fontRegular, color: COLORS.ink, align: 'right', width: table.widths[5] - 12 });
    x += table.widths[5];
    drawText(page, formatCurrency(item.price * item.quantity), x + 6, y - 16, { size: 8, font: fontBold, color: COLORS.ink, align: 'right', width: table.widths[6] - 12 });

    y -= rowHeight;
    rowsOnCurrentPage += 1;
  });

  if (y < 180) {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  }

  y -= 14;
  const notesWidth = 295;
  const totalsWidth = CONTENT_WIDTH - notesWidth - 14;
  const blockHeight = 104;
  drawBox(page, MARGIN, y - blockHeight, notesWidth, blockHeight, { fill: COLORS.soft, border: COLORS.line });
  drawText(page, 'NOTE', MARGIN + 12, y - 16, { size: 8, font: fontBold, color: COLORS.primary });
  [
    'Merci pour votre confiance.',
    'Marchandises non reprises ni echangees sauf defaut constate.',
    'Facture generee automatiquement par Sphere Office.',
  ].reduce((currentY, note) => drawWrappedText(page, note, MARGIN + 12, currentY, notesWidth - 24, {
    size: 8,
    font: fontRegular,
    color: COLORS.muted,
    lineHeight: 10,
  }) - 2, y - 34);

  const totalsX = MARGIN + notesWidth + 14;
  drawBox(page, totalsX, y - blockHeight, totalsWidth, blockHeight, { border: COLORS.line });
  const totalRows: Array<[string, number]> = [
    ['Sous-total', subtotal],
    ['Remise globale', discountTotal],
    ['Frais de livraison', deliveryFee],
    ['Montant paye', amountPaid],
    ['Reste a payer', balanceDue],
  ];
  let totalY = y - 14;
  totalRows.forEach(([label, value]) => {
    drawText(page, label, totalsX + 10, totalY, { size: 8, font: fontRegular, color: COLORS.muted });
    drawText(page, formatCurrency(value), totalsX + 10, totalY, {
      size: 8,
      font: fontBold,
      color: COLORS.ink,
      align: 'right',
      width: totalsWidth - 20,
    });
    totalY -= 11;
  });
  drawBox(page, totalsX + 8, y - blockHeight + 8, totalsWidth - 16, 24, { fill: COLORS.primary });
  drawText(page, 'TOTAL', totalsX + 18, y - blockHeight + 17, { size: 8, font: fontBold, color: COLORS.white });
  drawText(page, formatCurrency(total), totalsX + 18, y - blockHeight + 17, {
    size: 10,
    font: fontBold,
    color: COLORS.white,
    align: 'right',
    width: totalsWidth - 36,
  });

  y -= blockHeight + 22;
  if (y < 105) {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  }

  const signatureWidth = (CONTENT_WIDTH - 34) / 2;
  drawText(page, 'SIGNATURE DU CLIENT', MARGIN, y, { size: 8, font: fontBold, color: COLORS.muted });
  page.drawLine({
    start: { x: MARGIN, y: y - 44 },
    end: { x: MARGIN + signatureWidth, y: y - 44 },
    thickness: 0.8,
    color: COLORS.muted,
  });
  const stampX = MARGIN + signatureWidth + 34;
  drawText(page, 'SIGNATURE ET CACHET SPHERE OFFICE', stampX, y, { size: 8, font: fontBold, color: COLORS.muted });
  drawBox(page, stampX, y - 58, signatureWidth, 46, { border: COLORS.muted, thickness: 0.8 });

  return pdf.save();
}

export async function handler(request: ApiRequest, response: ApiResponse) {
  applyApiSecurityHeaders(response);
  response.setHeader('Content-Type', 'application/json');
  try {
    if (!applyApiCorsHeaders(request, response, ['GET'])) {
      response.status(403).json({ error: 'Origin not allowed' });
      return;
    }

    if (request.method === 'OPTIONS') {
      response.setHeader('Allow', ['GET', 'OPTIONS']);
      response.status(204).end();
      return;
    }

    if (request.method !== 'GET') {
      response.setHeader('Allow', ['GET', 'OPTIONS']);
      response.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const accessToken = getBearerToken(request);
    const adminClient = createAdminClient();
    const requester = await resolveRequesterProfile(adminClient, accessToken);

    if (requester.role !== 'superadmin' && requester.role !== 'admin' && requester.role !== 'cashier') {
      throw new Error('Forbidden');
    }

    const orderId = getOrderId(request);

    const [{ data: order, error: orderError }, { data: settings, error: settingsError }] = await Promise.all([
      adminClient
        .from('orders')
        .select(`
          *,
          items:order_items(
            id,
            quantity,
            price,
            item_name,
            item_reference
          )
        `)
        .eq('id', orderId)
        .single(),
      adminClient.from('site_settings').select('location_address, location_phone, location_email, logo').single(),
    ]);

    if (orderError) {
      throw new Error('Order not found');
    }

    if (settingsError && settingsError.code !== 'PGRST116') {
      throw settingsError;
    }

    const pdfBytes = await buildInvoicePdf(order as InvoiceOrder, (settings || null) as SiteSettings | null);

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="facture-${orderId.slice(0, 8)}.pdf"`);
    response.status(200).send(Buffer.from(pdfBytes));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = getErrorStatus(error);
    response.status(status).json({
      error: status >= 500 ? 'Internal server error' : message,
    });
  }
}

export default handler;
