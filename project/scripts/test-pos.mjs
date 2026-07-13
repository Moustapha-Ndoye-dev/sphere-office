import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculatePosPayment } from '../src/lib/pos.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let checks = 0;

function check(condition, message) {
  assert.ok(condition, message);
  checks += 1;
}

const exactCash = calculatePosPayment(185000, '185000', 'cash');
check(exactCash.amountPaid === 185000 && exactCash.balanceDue === 0 && exactCash.changeDue === 0, 'Un paiement exact doit solder la vente');
check(exactCash.paymentStatus === 'paid', 'Un paiement exact doit etre marque paye');

const cashWithChange = calculatePosPayment(185000, '200000', 'cash');
check(cashWithChange.amountPaid === 185000, 'Le montant comptabilise ne doit pas depasser le total');
check(cashWithChange.changeDue === 15000, 'La monnaie a rendre doit etre calculee');

const partial = calculatePosPayment(185000, '100000', 'wave');
check(partial.amountPaid === 100000 && partial.balanceDue === 85000, 'Le paiement partiel doit conserver le solde');
check(partial.paymentStatus === 'partial' && partial.changeDue === 0, 'Un paiement Wave partiel ne doit pas produire de monnaie');

const unpaid = calculatePosPayment(185000, '0', 'cash');
check(unpaid.paymentStatus === 'unpaid' && unpaid.balanceDue === 185000, 'Une vente a credit doit rester non payee');

const defaultFull = calculatePosPayment(185000, '', 'card');
check(defaultFull.amountPaid === 185000 && defaultFull.paymentStatus === 'paid', 'Le champ vide doit proposer le total exact');

const invalid = calculatePosPayment(185000, '-1', 'cash');
check(!invalid.isValid && invalid.amountPaid === 0, 'Un montant negatif doit etre invalide');

const posPage = await readFile(resolve(root, 'src/pages/admin/Pos.tsx'), 'utf8');
check(posPage.includes(".eq('availability', 'available')") && posPage.includes(".gt('stock', 0)"), 'La caisse doit afficher uniquement les produits vendables et en stock');
check(posPage.includes("value: 'wave'") && posPage.includes("value: 'orange_money'") && posPage.includes("value: 'bank_transfer'"), 'Les moyens de paiement locaux doivent etre proposes');
check(posPage.includes('id="pos-payment-method"') && !posPage.includes('<method.icon'), 'Les moyens de paiement doivent etre regroupes dans un select compact');
check(posPage.includes('xl:grid-cols-[minmax(0,1fr)_360px]') && posPage.includes('min-h-[230px]'), 'Le catalogue doit conserver une zone large et des cartes produit agrandies');
check(!posPage.includes('xl:sticky') && !posPage.includes('xl:max-h-[34vh]'), 'Le panier ne doit pas etre fige ni couper les lignes de vente');
check(posPage.includes('Monnaie à rendre') && posPage.includes('Total exact'), 'Le panneau d encaissement doit aider le caissier');
check(posPage.includes('showManualItem') && posPage.includes('Article hors catalogue'), 'L ajout manuel doit rester disponible sans encombrer la page');
check(posPage.includes('aria-label={`Supprimer ${item.name} du panier`}'), 'Les actions du panier doivent etre accessibles');
check(!posPage.includes('useReactToPrint') && !posPage.includes('currentOrder'), 'La vente ne doit plus ouvrir une impression en plus du PDF');

process.stdout.write(`Tests caisse reussis : ${checks}\n`);
