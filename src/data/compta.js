/* ---------- 2035: categories and the ventilation exercise ---------- */
export const DEP_CATS = {
  cotis: 'Cotisations sociales obligatoires',
  km: 'Frais de déplacement (km)',
  redev: 'Redevance au titulaire (assimilée à un loyer)',
  local: 'Charges du local',
  interets: "Intérêts d'emprunt",
  assur: "Primes d'assurance (RCP)",
  petitmat: 'Petit outillage (moins de 598 € TTC)',
  vetem: 'Blanchissage et blouses',
  honor: 'Honoraires (AGA, comptable)',
  syndic: 'Cotisations syndicales',
  formation: 'Frais de formation',
  ordre: 'Cotisation ordinale'
};
export const VENT = {
  honoraires: { ans: 'recette', why: 'Les honoraires encaissés sont des recettes imposables.' },
  chocolats: { ans: 'recette', why: 'Avantage en nature : les chocolats offerts par tes patients sont une recette à déclarer !' },
  redevance: { ans: 'recette', why: 'La redevance de ton assistant est une recette : on la déclare en gains divers.' },
  retroV: { ans: 'depense', why: "La rétrocession versée au titulaire est une charge déductible : sur la 2035, elle vient en déduction de tes recettes (et en micro-BNC, on l'exclut de tes recettes)." },
  redev: { ans: 'depense', why: "La redevance que tu verses en tant qu'assistant est assimilée à un loyer : dépense déductible (annexe 2035 A). Mais en micro-BNC, elle est déjà « comprise » dans les 34 % !" },
  km: { ans: 'depense', why: 'Frais kilométriques professionnels : déductibles. Et pour un remplaçant, même au-delà de 40 km !' },
  apport: { ans: 'hors', why: "Un apport personnel n'est pas une recette : il n'est pas imposable." },
  perso: { ans: 'hors', why: "Tes prélèvements personnels (loyer, courses…) ne sont ni une recette ni une dépense professionnelle." },
  pret: { ans: 'hors', why: "Un prêt n'est pas une recette : déclare-le comme un prêt, sinon tu serais imposé dessus !" },
  capital: { ans: 'hors', why: "Le remboursement du capital d'un emprunt n'est pas déductible." },
  interets: { ans: 'depense', why: "Les intérêts d'un emprunt professionnel sont déductibles." },
  amende: { ans: 'hors', why: "Une amende pénale n'est jamais déductible (et ta RCP ne la couvre pas)." },
  somptu: { ans: 'hors', why: 'Une dépense somptuaire n\'est pas déductible.' },
  penalite: { ans: 'hors', why: 'Les pénalités et majorations ne sont pas déductibles.' },
  impot: { ans: 'hors', why: "L'impôt sur le revenu n'est pas une charge déductible de ton bénéfice." },
  local: { ans: 'depense', why: 'Les charges du local professionnel (énergie, entretien) sont déductibles.' },
  cotis: { ans: 'depense', why: 'Tes cotisations sociales obligatoires (URSSAF, CARPIMKO) sont déductibles.' },
  assur: { ans: 'depense', why: "La prime d'assurance RCP est une dépense déductible." },
  petitmat: { ans: 'depense', why: 'Moins de 598 € TTC : petit outillage, déductible en entier cette année.' },
  vetem: { ans: 'depense', why: 'Les blouses sont les seuls vêtements déductibles.' },
  honor: { ans: 'depense', why: 'Les honoraires versés à ton AGA ou à ton comptable sont déductibles.' },
  syndic: { ans: 'depense', why: 'Les cotisations syndicales sont déductibles.' },
  formation: { ans: 'depense', why: 'Les frais de formation professionnelle sont déductibles.' },
  ordre: { ans: 'depense', why: "La cotisation à l'Ordre est une dépense déductible." },
  immo: { ans: 'immo', why: "Plus de 598 € TTC : c'est une immobilisation, amortie sur plusieurs années." }
};
export const VENT_PRIORITY = ['honoraires', 'retroV', 'redev', 'pret', 'capital', 'perso', 'km', 'interets', 'apport', 'amende', 'chocolats', 'immo', 'petitmat', 'redevance', 'somptu', 'assur', 'honor', 'syndic', 'vetem', 'formation', 'cotis', 'local'];
