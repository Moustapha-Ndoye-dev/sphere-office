import http from 'node:http';
import { createHash, randomUUID } from 'node:crypto';

const port = Number(process.env.MOCK_SUPABASE_PORT || 54329);
const category = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Mobilier de bureau',
  slug: 'mobilier-de-bureau',
  parent_id: null,
  created_at: '2026-07-01T10:00:00.000Z',
  updated_at: '2026-07-01T10:00:00.000Z',
};

const products = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'M23',
    slug: 'M23',
    description: 'Bureau professionnel fabrique sur commande selon vos dimensions.',
    price: 0,
    sale_price: null,
    sku: 'M23',
    is_featured: true,
    category_id: category.id,
    category_name: category.name,
    category_slug: category.slug,
    availability: 'on_order',
    is_in_stock: false,
    images: ['http://127.0.0.1:4101/hero-bureau.jpg'],
    created_at: '2026-07-13T12:00:00.000Z',
    updated_at: '2026-07-13T12:00:00.000Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'bafc',
    slug: 'bafc',
    description: 'Fauteuil personnalise disponible sur commande.',
    price: 0,
    sale_price: null,
    sku: 'BAFC',
    is_featured: false,
    category_id: category.id,
    category_name: category.name,
    category_slug: category.slug,
    availability: 'on_order',
    is_in_stock: false,
    images: ['http://127.0.0.1:4101/logo-sphere.png'],
    created_at: '2026-07-12T12:00:00.000Z',
    updated_at: '2026-07-12T12:00:00.000Z',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Bureau Classic 160',
    slug: 'bureau-classic-160',
    description: 'Bureau disponible immediatement.',
    price: 185000,
    sale_price: null,
    sku: 'BC160',
    is_featured: true,
    category_id: category.id,
    category_name: category.name,
    category_slug: category.slug,
    availability: 'available',
    is_in_stock: true,
    images: ['http://127.0.0.1:4101/hero-bureau.jpg'],
    created_at: '2026-07-11T12:00:00.000Z',
    updated_at: '2026-07-11T12:00:00.000Z',
  },
];

const calls = [];
const recordsByKey = new Map();
const failedNetworkFingerprints = new Set();
const orderCalls = [];
const ordersByKey = new Map();

const cancelledFixture = {
  id: '44444444-4444-4444-8444-444444444444',
  customer_name: 'Client Annulation Test',
  email: 'annulation@example.test',
  phone: '+221 77 000 00 00',
  address: 'Dakar, Senegal',
  notes: null,
  status: 'cancelled',
  payment_status: 'unpaid',
  total: 185000,
  subtotal: 185000,
  discount_total: 0,
  delivery_fee: 0,
  total_ht: 185000,
  tax_total: 0,
  total_ttc: 185000,
  amount_paid: 0,
  balance_due: 185000,
  payment_method: null,
  paid_at: null,
  payment_note: null,
  tracking_token: '55555555-5555-4555-8555-555555555555',
  idempotency_key: 'browser-cancelled-fixture',
  idempotency_fingerprint: 'mock',
  created_at: '2026-07-13T12:00:00.000Z',
  updated_at: '2026-07-13T13:00:00.000Z',
  last_status_changed_at: '2026-07-13T13:00:00.000Z',
  estimated_delivery_at: null,
  status_history: [
    { id: '66666666-6666-4666-8666-666666666666', old_status: 'pending', new_status: 'cancelled', changed_at: '2026-07-13T13:00:00.000Z', note: 'Annulation de test' },
    { id: '77777777-7777-4777-8777-777777777777', old_status: null, new_status: 'pending', changed_at: '2026-07-13T12:00:00.000Z', note: 'Commande enregistree' },
  ],
  __items: [{
    id: '88888888-8888-4888-8888-888888888888',
    quantity: 1,
    price: 185000,
    item_name: 'Bureau Classic 160',
    item_reference: 'BC160',
    product: { name: 'Bureau Classic 160', images: [] },
  }],
};
ordersByKey.set(cancelledFixture.idempotency_key, cancelledFixture);

function setCors(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'apikey, authorization, content-type, prefer, range, x-client-info');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  response.setHeader('Access-Control-Expose-Headers', 'Content-Range');
}

function sendJson(response, status, body, extraHeaders = {}) {
  setCors(response);
  Object.entries(extraHeaders).forEach(([name, value]) => response.setHeader(name, value));
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function requestedObject(request) {
  return String(request.headers.accept || '').includes('application/vnd.pgrst.object+json');
}

function filterRows(url, rows) {
  let result = [...rows];
  const slug = url.searchParams.get('slug');
  const categoryId = url.searchParams.get('category_id');
  const ids = url.searchParams.get('id');
  const orFilter = url.searchParams.get('or');
  if (slug?.startsWith('eq.')) result = result.filter((row) => row.slug === slug.slice(3));
  if (categoryId?.startsWith('eq.')) result = result.filter((row) => row.category_id === categoryId.slice(3));
  if (ids?.startsWith('in.(')) {
    const allowed = new Set(ids.slice(4, -1).split(','));
    result = result.filter((row) => allowed.has(row.id));
  }
  if (orFilter?.includes('ilike.')) {
    const match = orFilter.match(/ilike\.\*?%([^%]+)%/i);
    const query = decodeURIComponent(match?.[1] || '').toLowerCase();
    if (query) result = result.filter((row) => `${row.name} ${row.description}`.toLowerCase().includes(query));
  }
  return result;
}

const server = http.createServer(async (request, response) => {
  setCors(response);
  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url || '/', `http://${request.headers.host}`);

  if (request.method === 'GET' && url.pathname === '/__mock/state') {
    sendJson(response, 200, { calls, records: [...recordsByKey.values()], orderCalls, orders: [...ordersByKey.values()] });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/rest/v1/public_products') {
    const rows = filterRows(url, products);
    if (requestedObject(request)) {
      if (rows.length === 0) {
        sendJson(response, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' });
        return;
      }
      sendJson(response, 200, rows[0]);
      return;
    }
    sendJson(response, 200, rows, { 'Content-Range': `0-${Math.max(0, rows.length - 1)}/${rows.length}` });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/rest/v1/categories') {
    const rows = url.searchParams.get('slug') ? [category] : [category];
    sendJson(response, 200, requestedObject(request) ? rows[0] : rows, { 'Content-Range': '0-0/1' });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/rest/v1/site_settings') {
    sendJson(response, 200, {
      id: 'site',
      location_phone: '+221 33 848 46 68',
      whatsapp_number: '+221 77 000 00 00',
      favicon: null,
      logo: null,
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/rest/v1/rpc/create_product_request_secure') {
    const body = await readJson(request);
    calls.push({ ...body, received_at: new Date().toISOString() });
    const product = products.find((candidate) => candidate.id === body.p_product_id && candidate.availability === 'on_order');
    const normalized = {
      productId: body.p_product_id,
      quantity: body.p_quantity,
      customerName: String(body.p_customer_name || '').trim(),
      phone: String(body.p_phone || '').trim(),
      address: String(body.p_address || '').trim(),
      notes: String(body.p_notes || '').trim(),
    };
    const fingerprint = createHash('sha256').update(JSON.stringify(normalized)).digest('hex');

    if (normalized.notes === '[network-once]' && !failedNetworkFingerprints.has(fingerprint)) {
      failedNetworkFingerprints.add(fingerprint);
      request.socket.destroy();
      return;
    }

    if (!product) {
      sendJson(response, 400, { code: 'P0001', message: 'Produit non disponible sur commande' });
      return;
    }
    if (!Number.isInteger(normalized.quantity) || normalized.quantity < 1 || normalized.quantity > 100) {
      sendJson(response, 400, { code: 'P0001', message: 'Quantite invalide' });
      return;
    }
    if (normalized.customerName.length < 2 || normalized.customerName.length > 120
      || normalized.phone.replace(/\D/g, '').length < 8 || normalized.phone.length > 30
      || normalized.address.length < 4 || normalized.address.length > 500
      || normalized.notes.length > 2000) {
      sendJson(response, 400, { code: 'P0001', message: 'Champs invalides' });
      return;
    }

    const existing = recordsByKey.get(body.p_idempotency_key);
    if (existing) {
      if (existing.__fingerprint !== fingerprint) {
        sendJson(response, 409, { code: 'P0001', message: 'Cle d idempotence reutilisee avec un contenu different' });
        return;
      }
      const { __fingerprint, ...record } = existing;
      sendJson(response, 200, record);
      return;
    }

    const record = {
      id: randomUUID(),
      product_id: product.id,
      product_name: product.name,
      product_reference: product.sku,
      quantity: normalized.quantity,
      customer_name: normalized.customerName,
      phone: normalized.phone,
      address: normalized.address,
      notes: normalized.notes || null,
      status: 'pending',
      idempotency_key: body.p_idempotency_key,
      idempotency_fingerprint: fingerprint,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      __fingerprint: fingerprint,
    };
    recordsByKey.set(body.p_idempotency_key, record);
    const { __fingerprint, ...publicRecord } = record;
    sendJson(response, 200, publicRecord);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/rest/v1/rpc/create_order_secure') {
    const body = await readJson(request);
    orderCalls.push({ ...body, received_at: new Date().toISOString() });
    const existing = ordersByKey.get(body.p_idempotency_key);
    if (existing) {
      sendJson(response, 200, existing);
      return;
    }

    const items = Array.isArray(body.p_items) ? body.p_items : [];
    let subtotal = 0;
    const trackedItems = [];
    for (const item of items) {
      const product = products.find((candidate) => candidate.id === item.product_id && candidate.availability === 'available' && candidate.is_in_stock);
      if (!product || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) {
        sendJson(response, 400, { code: 'P0001', message: 'Article invalide' });
        return;
      }
      const price = product.sale_price ?? product.price;
      subtotal += price * item.quantity;
      trackedItems.push({
        id: randomUUID(),
        quantity: item.quantity,
        price,
        item_name: product.name,
        item_reference: product.sku,
        product: { name: product.name, images: product.images },
      });
    }
    if (subtotal <= 0) {
      sendJson(response, 400, { code: 'P0001', message: 'Total commande invalide' });
      return;
    }

    const createdAt = new Date().toISOString();
    const order = {
      id: randomUUID(),
      customer_name: String(body.p_customer_name || '').trim(),
      email: String(body.p_email || '').trim().toLowerCase(),
      phone: String(body.p_phone || '').trim(),
      address: String(body.p_address || '').trim(),
      notes: body.p_notes || null,
      status: 'pending',
      payment_status: 'unpaid',
      total: subtotal,
      subtotal,
      discount_total: 0,
      delivery_fee: 0,
      total_ht: subtotal,
      tax_total: 0,
      total_ttc: subtotal,
      amount_paid: 0,
      balance_due: subtotal,
      payment_method: null,
      paid_at: null,
      payment_note: null,
      tracking_token: randomUUID(),
      idempotency_key: body.p_idempotency_key,
      idempotency_fingerprint: 'mock',
      created_at: createdAt,
      updated_at: createdAt,
      last_status_changed_at: createdAt,
      estimated_delivery_at: null,
      status_history: [{
        id: randomUUID(),
        old_status: null,
        new_status: 'pending',
        changed_at: createdAt,
        note: 'Commande enregistree',
      }],
      __items: trackedItems,
    };
    ordersByKey.set(body.p_idempotency_key, order);
    const { __items, ...publicOrder } = order;
    sendJson(response, 200, publicOrder);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/rest/v1/rpc/get_order_tracking') {
    const body = await readJson(request);
    const order = [...ordersByKey.values()].find((candidate) => candidate.id === body.p_order_id && candidate.tracking_token === body.p_tracking_token);
    if (!order) {
      sendJson(response, 200, null);
      return;
    }
    const { __items, idempotency_key, idempotency_fingerprint, tracking_token, ...trackedOrder } = order;
    void tracking_token;
    sendJson(response, 200, { ...trackedOrder, items: __items });
    return;
  }

  sendJson(response, 404, { message: 'Mock route not found', path: url.pathname });
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Mock Supabase on-order actif sur http://127.0.0.1:${port}\n`);
});
