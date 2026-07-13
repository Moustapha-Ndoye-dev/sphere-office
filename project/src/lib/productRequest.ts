export const PRODUCT_REQUEST_LIMITS = {
  quantityMin: 1,
  quantityMax: 100,
  customerNameMin: 2,
  customerNameMax: 120,
  phoneMax: 30,
  addressMin: 4,
  addressMax: 500,
  notesMax: 2000,
} as const;

export type ProductRequestInput = {
  productId: string;
  quantity: number;
  customerName: string;
  phone: string;
  address: string;
  notes: string;
};

export type NormalizedProductRequestInput = ProductRequestInput;

export function normalizeProductRequestInput(input: ProductRequestInput): NormalizedProductRequestInput {
  const productId = input.productId.trim();
  const customerName = input.customerName.trim();
  const phone = input.phone.trim();
  const address = input.address.trim();
  const notes = input.notes.trim();
  const quantity = Number(input.quantity);

  if (!productId) throw new Error('Produit invalide.');
  if (!Number.isInteger(quantity) || quantity < PRODUCT_REQUEST_LIMITS.quantityMin || quantity > PRODUCT_REQUEST_LIMITS.quantityMax) {
    throw new Error('La quantite doit etre comprise entre 1 et 100.');
  }
  if (customerName.length < PRODUCT_REQUEST_LIMITS.customerNameMin || customerName.length > PRODUCT_REQUEST_LIMITS.customerNameMax) {
    throw new Error('Le nom doit contenir entre 2 et 120 caracteres.');
  }
  if (phone.length > PRODUCT_REQUEST_LIMITS.phoneMax || phone.replace(/\D/g, '').length < 8) {
    throw new Error('Veuillez saisir un numero de telephone valide.');
  }
  if (address.length < PRODUCT_REQUEST_LIMITS.addressMin || address.length > PRODUCT_REQUEST_LIMITS.addressMax) {
    throw new Error('La zone de livraison doit contenir entre 4 et 500 caracteres.');
  }
  if (notes.length > PRODUCT_REQUEST_LIMITS.notesMax) {
    throw new Error('Le commentaire ne doit pas depasser 2 000 caracteres.');
  }

  return { productId, quantity, customerName, phone, address, notes };
}

type ProductRequestAttempt = {
  key: string;
  fingerprint: string;
};

const STORAGE_KEY = 'sphere-product-request-attempt-v1';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let memoryAttempt: ProductRequestAttempt | null = null;

async function hashPayload(payload: NormalizedProductRequestInput) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function readAttempt() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null') as Partial<ProductRequestAttempt> | null;
    if (parsed && typeof parsed.key === 'string' && typeof parsed.fingerprint === 'string') {
      memoryAttempt = { key: parsed.key, fingerprint: parsed.fingerprint };
    }
  } catch {
    // The in-memory attempt still protects retries in this page lifecycle.
  }
  return memoryAttempt;
}

function writeAttempt(attempt: ProductRequestAttempt) {
  memoryAttempt = attempt;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
  } catch {
    // Storage can be unavailable; the in-memory copy remains usable.
  }
}

export async function getProductRequestIdempotencyKey(input: NormalizedProductRequestInput) {
  const fingerprint = await hashPayload(input);
  const stored = readAttempt();
  if (stored && UUID_PATTERN.test(stored.key) && stored.fingerprint === fingerprint) {
    return stored.key;
  }

  const key = crypto.randomUUID();
  writeAttempt({ key, fingerprint });
  return key;
}

export function clearProductRequestAttempt() {
  memoryAttempt = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // The in-memory copy has already been cleared.
  }
}
