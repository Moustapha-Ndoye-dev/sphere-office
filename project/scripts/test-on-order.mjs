import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  compareProductsByPrice,
  getEffectiveProductPrice,
  isOnOrderProduct,
  isSellableProduct,
} from '../src/lib/productAvailability.ts';
import {
  clearProductRequestAttempt,
  getProductRequestIdempotencyKey,
  normalizeProductRequestInput,
} from '../src/lib/productRequest.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let checks = 0;

function check(condition, message) {
  assert.ok(condition, message);
  checks += 1;
}

function rejectsInput(input, expectedMessage) {
  assert.throws(() => normalizeProductRequestInput(input), expectedMessage);
  checks += 1;
}

const m23 = { availability: 'on_order', is_in_stock: false, price: 0, sale_price: null };
const bafc = { availability: 'on_order', is_in_stock: false, price: 0, sale_price: null };
const desk = { availability: 'available', is_in_stock: true, price: 125000, sale_price: null };
const archived = { availability: 'unavailable', is_in_stock: false, price: 95000, sale_price: null };

check(isOnOrderProduct(m23), 'M23 doit etre reconnu comme produit sur commande');
check(isOnOrderProduct(bafc), 'bafc doit etre reconnu comme produit sur commande');
check(!isSellableProduct(m23) && !isSellableProduct(bafc), 'Un produit sur commande ne doit jamais etre vendable dans le panier');
check(isSellableProduct(desk), 'Un produit classique actif, en stock et price doit rester vendable');
check(!isSellableProduct(archived), 'Un produit indisponible doit rester non vendable');
check(getEffectiveProductPrice(m23) === null, 'Un prix nul ne doit pas devenir un prix affiche comme valide');
check(compareProductsByPrice(m23, desk, 'asc') > 0, 'Les produits sans prix doivent etre places apres les prix connus');
check(compareProductsByPrice(m23, desk, 'desc') > 0, 'Les produits sans prix doivent rester apres les prix connus en tri descendant');

const validInput = {
  productId: '11111111-1111-4111-8111-111111111111',
  quantity: 3,
  customerName: '  Client Test  ',
  phone: ' +221 77 123 45 67 ',
  address: ' Dakar Plateau ',
  notes: ' Couleur noire ',
};
const normalized = normalizeProductRequestInput(validInput);
check(normalized.quantity === 3 && normalized.customerName === 'Client Test', 'La demande valide doit etre normalisee');
check(normalized.phone === '+221 77 123 45 67' && normalized.address === 'Dakar Plateau', 'Les coordonnees doivent etre normalisees');

rejectsInput({ ...validInput, quantity: 0 }, /1 et 100/);
rejectsInput({ ...validInput, quantity: 101 }, /1 et 100/);
rejectsInput({ ...validInput, quantity: 1.5 }, /1 et 100/);
rejectsInput({ ...validInput, customerName: 'A' }, /2 et 120/);
rejectsInput({ ...validInput, customerName: 'A'.repeat(121) }, /2 et 120/);
rejectsInput({ ...validInput, phone: '1234' }, /telephone valide/);
rejectsInput({ ...validInput, phone: '1'.repeat(31) }, /telephone valide/);
rejectsInput({ ...validInput, address: 'abc' }, /4 et 500/);
rejectsInput({ ...validInput, address: 'A'.repeat(501) }, /4 et 500/);
rejectsInput({ ...validInput, notes: 'A'.repeat(2001) }, /2 000/);

const sessionValues = new Map();
globalThis.sessionStorage = {
  getItem: (key) => sessionValues.get(key) ?? null,
  setItem: (key, value) => sessionValues.set(key, value),
  removeItem: (key) => sessionValues.delete(key),
};

const firstKey = await getProductRequestIdempotencyKey(normalized);
const retryKey = await getProductRequestIdempotencyKey(normalized);
check(firstKey === retryKey, 'Une relance apres erreur reseau doit reutiliser la meme cle');

const changedKey = await getProductRequestIdempotencyKey({ ...normalized, quantity: 4 });
check(changedKey !== firstKey, 'Un contenu different doit recevoir une nouvelle cle');

clearProductRequestAttempt();
const secondRequestKey = await getProductRequestIdempotencyKey(normalized);
check(secondRequestKey !== firstKey, 'Une nouvelle demande apres succes doit recevoir une nouvelle cle');

const migration = await readFile(resolve(root, 'supabase/migrations/20260713000600_add_on_order_product_requests.sql'), 'utf8');
const productsService = await readFile(resolve(root, 'src/services/products.ts'), 'utf8');
const productCard = await readFile(resolve(root, 'src/components/ui/ProductCard.tsx'), 'utf8');
const mobileCard = await readFile(resolve(root, 'src/components/mobile/MobileProductCard.tsx'), 'utf8');
const productDetail = await readFile(resolve(root, 'src/pages/ProductDetail.tsx'), 'utf8');
const cartStore = await readFile(resolve(root, 'src/store/cart.ts'), 'utf8');
const app = await readFile(resolve(root, 'src/App.tsx'), 'utf8');

check(!migration.startsWith('Failed to run sql query'), 'Le fichier de migration doit contenir du SQL, pas un message d\'erreur');
check(
  /AS is_in_stock,\s*c\.name AS category_name,\s*c\.slug AS category_slug,\s*p\.availability\s*FROM/.test(migration),
  'availability doit etre ajoutee apres toutes les colonnes historiques de public_products'
);
check(/p\.availability = 'on_order'/.test(migration), 'La vue doit inclure explicitement on_order');
check(/p\.status = 'active'/.test(migration), 'La vue doit exclure les brouillons et archives');
check(/p\.availability = 'available'[\s\S]*COALESCE\(p\.sale_price, p\.price\) > 0/.test(migration), 'La vue doit exiger un prix valide pour les ventes immediates');
check(/CREATE TABLE IF NOT EXISTS public\.product_requests/.test(migration), 'La migration doit creer la table de demandes distincte');
check(/ALTER TABLE public\.product_requests ENABLE ROW LEVEL SECURITY/.test(migration), 'La RLS doit etre activee');
check(/REVOKE ALL ON TABLE public\.product_requests FROM PUBLIC, anon, authenticated/.test(migration), 'Les ecritures directes anonymes doivent etre revoquees');
check(/SECURITY DEFINER/.test(migration) && /GRANT EXECUTE ON FUNCTION public\.create_product_request_secure/.test(migration), 'La creation publique doit passer par la RPC securisee');
check(/availability = 'on_order'/.test(migration) && /status = 'active'/.test(migration), 'La RPC doit verifier le statut du produit cote serveur');
check(/ON CONFLICT \(idempotency_key\) DO NOTHING/.test(migration), 'La RPC doit etre idempotente en concurrence');
check(/v_product\.name/.test(migration) && /v_product\.sku/.test(migration), 'Le nom et la reference doivent etre captures depuis le produit serveur');
check(!productsService.includes('SELLABLE_PRICE_FILTER'), 'Le service public ne doit plus masquer tous les prix nuls');
check(productCard.includes('Disponible sur commande') && mobileCard.includes('Disponible sur commande'), 'Les cartes desktop et mobile doivent afficher le badge');
check(productCard.includes('Prix sur demande') && mobileCard.includes('Prix sur demande') && productDetail.includes('Prix sur demande'), 'Aucun affichage sur commande ne doit presenter 0 FCFA');
check(cartStore.includes('isSellableProduct(product)'), 'Le panier doit refuser les produits sur commande');
check(app.includes(':slug/request') && app.includes('product-requests'), 'Les parcours public et administration doivent etre routes');

process.stdout.write(`Tests produits sur commande reussis : ${checks}\n`);
