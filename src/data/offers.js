/* ---------- Remplacement offers (the job board) ---------- */
export const OFFER_DEFS = {
  amb1: { cab: 'B', months: 2, H: 7200, r: 0.25, km: 3, bad: ['cps'], extra: ['concurrence'], why: 'Congés d’été', pitch: "« Salut ! Je pars deux mois cet été avec ma famille. Mon cabinet tourne bien : je cherche un remplaçant sérieux ! »" },
  pins1: { cab: 'A', months: 3, H: 5400, r: 0.20, km: 5, bad: ['ordre', 'cesse'], why: 'Mi-temps thérapeutique', pitch: "« Salut ! Mi-temps thérapeutique : je dois lever le pied pendant trois mois. Tu me remplacerais à l'IRSBC ? »" },
  port1: { cab: 'D', months: 1, H: 8600, r: 0.25, rb: 0.40, km: 2, bad: ['retro'], why: 'Congé paternité', pitch: "« Je pars en congé paternité ! Un mois à la Basquaise : beaucoup de patients… et un gros chiffre ! »" },
  stc1: { cab: 'X', months: 3, H: 6600, r: 0.22, km: 45, housing: true, bad: ['duree'], why: 'Désert médical', pitch: "« À Maransin, on manque cruellement de kinés. Logement offert pour le remplaçant ! »" },
  pins2: { cab: 'A', months: 2, H: 5600, r: 0.20, km: 5, bad: ['sortie'], why: 'Formation', pitch: "« Je pars deux mois en formation. Mon contrat est prêt, tu le lis ? »" },
  port2: { cab: 'D', months: 2, H: 8300, r: 0.28, km: 2, bad: ['tableau'], why: 'Vacances', pitch: "« Deux mois de remplacement à la Basquaise, ça te tente ? »" },
  stc2: { cab: 'X', months: 3, H: 6800, r: 0.22, km: 45, housing: true, bad: [], extra: ['concurrence'], why: 'Désert médical', pitch: "« Les patients de Maransin te réclament ! Même contrat, même logement. »" },
  amb2: { cab: 'B', months: 2, H: 7400, r: 0.25, km: 3, bad: [], extra: ['concurrence'], why: 'Vacances au ski', pitch: "« Re-salut ! Deux mois au ski cet hiver : tu reprends mes patients ? »" },
  pins3: { cab: 'A', months: 3, H: 5800, r: 0.22, km: 5, bad: ['cps'], why: 'Arrêt maladie', pitch: "« Je suis en arrêt trois mois, j'ai besoin de toi ! »" },
  port3: { cab: 'D', months: 3, H: 8200, r: 0.27, km: 2, bad: [], why: 'Congé sabbatique', pitch: "« Trois mois à la Basquaise, contrat type de l'Ordre. »" }
};
export const BOARD_ORDER = ['amb1', 'pins1', 'port1', 'stc1', 'pins2', 'port2', 'stc2', 'amb2', 'pins3', 'port3'];
