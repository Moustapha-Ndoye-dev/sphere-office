import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildTrackingPath,
  buildTrackingReference,
  getAllowedOrderTransitions,
  getOrderTrackingStepIndex,
  parseTrackingReference,
  TRACKING_REFRESH_INTERVAL_MS,
} from '../src/lib/orderTracking.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const orderId = '11111111-1111-4111-8111-111111111111';
const token = '22222222-2222-4222-8222-222222222222';
let checks = 0;

function check(condition, message) {
  assert.ok(condition, message);
  checks += 1;
}

const reference = parseTrackingReference(`${orderId}:${token}`);
check(reference?.orderId === orderId && reference.trackingToken === token, 'Une reference securisee valide doit etre analysee');
check(parseTrackingReference(`${orderId}:${token}:extra`) === null, 'Une reference avec un segment supplementaire doit etre refusee');
check(parseTrackingReference(`${orderId}:not-a-token`) === null, 'Un jeton non UUID doit etre refuse');
check(parseTrackingReference('') === null, 'Une reference vide doit etre refusee');
check(buildTrackingReference(orderId, token) === `${orderId}:${token}`, 'La reference doit rester copiable sans perte');
check(buildTrackingPath(reference) === `/order-tracking/${orderId}?token=${token}`, 'Le lien canonique de suivi doit contenir le jeton encode');
check(TRACKING_REFRESH_INTERVAL_MS === 30_000, 'Le suivi doit etre actualise toutes les 30 secondes');
check(getOrderTrackingStepIndex('pending') === 0 && getOrderTrackingStepIndex('delivered') === 4, 'La progression normale doit conserver cinq etapes');
check(getOrderTrackingStepIndex('cancelled') === -1, 'Une annulation ne doit jamais etre affichee comme recue');
check(getAllowedOrderTransitions('pending').join(',') === 'confirmed,cancelled', 'Une commande en attente ne doit avancer que vers confirmee ou annulee');
check(getAllowedOrderTransitions('shipped').join(',') === 'delivered,cancelled', 'Une commande expediee ne doit avancer que vers livree ou annulee');
check(getAllowedOrderTransitions('delivered').length === 0 && getAllowedOrderTransitions('cancelled').length === 0, 'Les statuts terminaux doivent rester terminaux');

const [migration, trackingPage, confirmationPage, adminOrders, ordersService] = await Promise.all([
  readFile(resolve(root, 'supabase/migrations/20260713000700_improve_order_tracking.sql'), 'utf8'),
  readFile(resolve(root, 'src/pages/OrderTracking.tsx'), 'utf8'),
  readFile(resolve(root, 'src/pages/OrderConfirmation.tsx'), 'utf8'),
  readFile(resolve(root, 'src/pages/admin/Orders.tsx'), 'utf8'),
  readFile(resolve(root, 'src/services/orders.ts'), 'utf8'),
]);

check(/CREATE TABLE IF NOT EXISTS public\.order_status_history/.test(migration), 'La migration doit creer un historique de statut');
check(/ALTER TABLE public\.order_status_history ENABLE ROW LEVEL SECURITY/.test(migration), 'La RLS doit proteger l historique');
check(/REVOKE ALL ON TABLE public\.order_status_history FROM PUBLIC, anon, authenticated/.test(migration), 'Le public ne doit pas lire directement l historique');
check(/CREATE OR REPLACE FUNCTION public\.update_order_status_secure/.test(migration), 'Les changements de statut doivent passer par une RPC staff');
check(/FOR UPDATE/.test(migration) && /INSERT INTO public\.order_status_history/.test(migration) && /INSERT INTO public\.notifications/.test(migration), 'Le verrou, l historique et la notification doivent appartenir a la meme transaction');
check(/Transition de statut interdite/.test(migration), 'Les transitions invalides doivent etre refusees cote serveur');
check(/REVOKE UPDATE ON TABLE public\.orders FROM authenticated/.test(migration), 'La mise a jour directe du statut doit etre revoquee');
check(/'estimated_delivery_at'/.test(migration) && /'status_history'/.test(migration) && /'payment_status'/.test(migration), 'La RPC publique doit fournir ETA, historique et paiement');
check(/orders\.tracking_token = p_tracking_token/.test(migration), 'Le suivi public doit continuer a exiger le jeton secret');

check(trackingPage.includes('refetchInterval: TRACKING_REFRESH_INTERVAL_MS'), 'La page de suivi doit interroger regulierement les changements');
check(trackingPage.includes("order.status === 'cancelled'"), 'L annulation doit avoir une presentation explicite');
check(trackingPage.includes('OrderTrackingNotFoundError') && trackingPage.includes('isLikelyNetworkError'), 'Une panne reseau ne doit pas etre presentee comme une commande introuvable');
check(trackingPage.includes('Copier la reference') && trackingPage.includes('wa.me'), 'Le client doit pouvoir conserver ou partager son suivi');
check(trackingPage.includes('status_history') && trackingPage.includes('estimated_delivery_at'), 'Historique et ETA doivent etre affiches');
check(!trackingPage.includes("cancelled: 0"), 'L ancienne progression incorrecte des annulations doit avoir disparu');

check(!confirmationPage.includes('estimatedDeliveryDate.setDate'), 'La confirmation ne doit plus inventer une livraison a quatre jours');
check(confirmationPage.includes('estimated_delivery_at') && confirmationPage.includes('Articles commandes'), 'La confirmation doit afficher ETA reelle et recapitulatif articles');
check(confirmationPage.includes('Copier la reference') && confirmationPage.includes('wa.me'), 'La confirmation doit rendre le suivi sauvegardable et partageable');
check(confirmationPage.includes('prefers-reduced-motion'), 'L animation de confirmation doit respecter la preference de mouvement reduit');

check(ordersService.includes("supabase.rpc('update_order_status_secure'"), 'Le service admin doit appeler la RPC atomique');
check(!/\.update\(\{\s*status/.test(ordersService), 'Le service ne doit plus modifier directement le statut');
check(adminOrders.includes('getAllowedOrderTransitions'), 'L administration doit seulement proposer les transitions autorisees');
check(!adminOrders.includes("kind: 'order_status'"), 'La notification de statut ne doit plus etre creee une seconde fois dans le frontend');
check(adminOrders.includes('type="datetime-local"') && adminOrders.includes('updateEstimate: true'), 'L administration doit pouvoir publier ou retirer une ETA');

process.stdout.write(`Tests suivi de commande reussis : ${checks}\n`);
