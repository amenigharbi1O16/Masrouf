// Prouve que les requêtes admin ne lisent aucun montant personnel.
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/db/queries.ts', import.meta.url), 'utf8');

function entre(debut, fin) {
  const a = source.indexOf(debut);
  const b = source.indexOf(fin, a + debut.length);
  if (a < 0 || b < 0) {
    console.error('Fonction introuvable', debut);
    process.exit(1);
  }
  return source.slice(a, b);
}

const stats = entre('export function getAdminGlobalStats', 'export function getAllUsersAdmin');
const users = entre('export function getAllUsersAdmin', 'export function setCategoryType');

const interdit = [
  'prix_total',
  'budget_mensuel',
  'volumeTotal',
  'SUM(prix',
  'FROM purchase',
  'FROM expense',
  'FROM achats',
  'password_hash',
];
for (const mot of interdit) {
  if (stats.includes(mot) || users.includes(mot)) {
    console.error('Fuite financière admin :', mot);
    process.exit(1);
  }
}

if (!users.includes('email') || !users.includes('role') || !users.includes('is_active')) {
  console.error('La liste admin doit garder nom, email, rôle et statut.');
  process.exit(1);
}

console.log('Confidentialité admin : aucun montant dans les requêtes de comptes.');
