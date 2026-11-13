// ============================================================
// SCRIPT : scripts/generate-manuals.mjs
// MISSION : Générer des fichiers PDF standards valides (PDF-1.4)
//           pour le manuel d'utilisation de Masrouf en 3 langues
//           (FR, EN, AR) de 3 à 4 pages chacun.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';

function createPdf(pages) {
  let objects = [];
  let nextObjId = 1;

  function addObj(content) {
    const id = nextObjId++;
    objects.push({ id, content });
    return id;
  }

  // 1. Font standard Helvetica
  const fontObjId = addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);
  const fontBoldObjId = addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`);

  const pageObjIds = [];

  // Création des pages
  for (const page of pages) {
    let streamLines = ['BT'];

    // En-tête de page
    streamLines.push('/F2 18 Tf');
    streamLines.push(`50 790 Td (${escapePdf(page.title)}) Tj`);

    if (page.subtitle) {
      streamLines.push('/F1 12 Tf');
      streamLines.push(`0 -24 Td (${escapePdf(page.subtitle)}) Tj`);
      streamLines.push('0 -20 Td');
    } else {
      streamLines.push('0 -30 Td');
    }

    // Sections de texte
    for (const sec of page.sections) {
      streamLines.push('/F2 13 Tf');
      streamLines.push(`0 -24 Td (${escapePdf(sec.heading)}) Tj`);

      streamLines.push('/F1 10 Tf');
      for (const line of sec.lines) {
        streamLines.push(`0 -16 Td (${escapePdf(line)}) Tj`);
      }
      streamLines.push('0 -8 Td');
    }

    // Pied de page
    streamLines.push('/F1 9 Tf');
    streamLines.push(`0 -40 Td (Masrouf - Page ${page.pageNum}) Tj`);
    streamLines.push('ET');

    const streamContent = streamLines.join('\n');
    const streamLen = Buffer.byteLength(streamContent, 'ascii');

    const streamObjId = addObj(`<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream`);

    const pageObjId = addObj(
      `<< /Type /Page\n/Parent 0 0 R\n/MediaBox [0 0 595 842]\n/Resources << /Font << /F1 ${fontObjId} 0 R /F2 ${fontBoldObjId} 0 R >> >>\n/Contents ${streamObjId} 0 R >>`
    );
    pageObjIds.push(pageObjId);
  }

  // Objet Pages (Catalogue parent)
  const pagesObjId = addObj(
    `<< /Type /Pages\n/Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}]\n/Count ${pageObjIds.length} >>`
  );

  // Mettre à jour le parent des pages
  for (const pId of pageObjIds) {
    const obj = objects.find((o) => o.id === pId);
    if (obj) {
      obj.content = obj.content.replace('/Parent 0 0 R', `/Parent ${pagesObjId} 0 R`);
    }
  }

  // Catalogue racine
  const catalogObjId = addObj(`<< /Type /Catalog /Pages ${pagesObjId} 0 R >>`);

  // Construction du binaire PDF
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [];

  for (const obj of objects) {
    offsets[obj.id] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${obj.id} 0 obj\n${obj.content}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let i = 1; i <= objects.length; i++) {
    const off = String(offsets[i]).padStart(10, '0');
    pdf += `${off} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1}\n/Root ${catalogObjId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}

function escapePdf(text) {
  // Remplacement des caractères non-ASCII par des équivalents sûrs pour Type1 Helvetica
  return text
    .replace(/[éèêë]/g, 'e')
    .replace(/[àâä]/g, 'a')
    .replace(/[îï]/g, 'i')
    .replace(/[ôö]/g, 'o')
    .replace(/[ùûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ÉÈÊ]/g, 'E')
    .replace(/[ÀÂ]/g, 'A')
    .replace(/[Ç]/g, 'C')
    .replace(/’/g, "'")
    .replace(/[«»]/g, '"')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

// ------------------------------------------------------------
// MANUEL EN FRANÇAIS (4 pages)
// ------------------------------------------------------------
const pagesFr = [
  {
    pageNum: '1 / 4',
    title: 'Masrouf - Manuel d\'utilisation',
    subtitle: 'Application locale de gestion budgetaire familiale',
    sections: [
      {
        heading: '1. Introduction et Confidentialite Totale',
        lines: [
          'Masrouf est une application mobile locale de suivi budgetaire pour les familles tunisiennes.',
          'Elle fonctionne a 100 % en local sur votre appareil avec SQLite.',
          'Aucune connexion internet ni serveur distant n\'est requis : vos donnees restent privees.',
          'L\'application prend en charge deux profils : Utilisateur et Administrateur.',
        ],
      },
      {
        heading: '2. Premier demarrage et Inscription',
        lines: [
          'A la premiere installation, creez un compte via l\'ecran d\'inscription.',
          'Un assistant de depart en 3 etapes vous guide sans forcer de budget initial.',
          'Choisissez vos categories de depenses preferees parmi la selection officielle.',
          'Vous arrivez ensuite directement sur l\'ecran d\'accueil dans son etat d\'origine.',
        ],
      },
    ],
  },
  {
    pageNum: '2 / 4',
    title: 'Gestion des Budgets et des Achats',
    subtitle: 'Planification par enveloppes et enregistrement quotidien',
    sections: [
      {
        heading: '3. Creation et Repartition du Budget',
        lines: [
          'Fixez un montant global en Dinars Tunisiens pour la periode de votre choix.',
          'Repartissez la somme entre vos differentes categories d\'enveloppes.',
          'Une regle stricte interdit que la somme allouee depasse votre budget total.',
          'La fonction "Copier la periode precedente" permet de reconduire vos choix en un clic.',
        ],
      },
      {
        heading: '4. Enregistrement d\'un Achat ou d\'une Depense',
        lines: [
          'L\'ecran Nouvel Achat permet d\'enregistrer deux types d\'operations distinctes :',
          '- Achat de produit : selection du produit avec photo, prix total et quantite.',
          '- Depense directe simple : transport, factures, loyer ou loisirs sans produit.',
          'Lors de la saisie, un systeme de suggestions instantanees evite les doublons.',
          'Le prix unitaire est calcule automatiquement et compare au precedent achat.',
        ],
      },
    ],
  },
  {
    pageNum: '3 / 4',
    title: 'Catalogue, Fiche Produit et Suivi',
    subtitle: 'Photos, historique des prix et magasin le moins cher',
    sections: [
      {
        heading: '5. Catalogue des Produits et Photos',
        lines: [
          'Le catalogue liste tous vos produits avec une section "Achats du jour" en tete.',
          'Chaque produit peut comporter une vraie photo prise par camera ou galerie.',
          'Le composant ProductThumb affiche la photo ou l\'icone categorie de repli.',
          'Le fichier photo est stocke de maniere securisee dans le dossier permanent.',
        ],
      },
      {
        heading: '6. Fiche Produit et Comparaison des Magasins',
        lines: [
          'La fiche detaillee affiche le magasin ou le produit a ete paye le moins cher.',
          'Un graphique retrace l\'evolution historique du prix unitaire dans le temps.',
          'Une banniere coloree signale si le dernier achat etait plus cher ou plus econome.',
        ],
      },
    ],
  },
  {
    pageNum: '4 / 4',
    title: 'Analyses, Points et Espace Admin',
    subtitle: 'Statistiques financieres, regles automatiques et gouvernance',
    sections: [
      {
        heading: '7. Analyses et Conclusion Automatique',
        lines: [
          'L\'ecran Analyses compare la periode active a la periode precedente de meme duree.',
          'Un diagramme a segments proportionnels met en valeur vos principales depenses.',
          'Une conclusion par regles sans IA resume vos habitudes et vos depassements.',
          'Les calculs s\'effectuent en millimes entiers pour eviter toute erreur d\'arrondi.',
        ],
      },
      {
        heading: '8. Gamification et Supervision Admin',
        lines: [
          'Gagnez des points a chaque fin de periode respectee : Debutant, Econome, Expert.',
          'L\'espace Administrateur donne acces a des statistiques globales et anonymisees.',
          'L\'admin ne peut jamais consulter les transactions ni les budgets prives des usagers.',
        ],
      },
    ],
  },
];

// ------------------------------------------------------------
// MANUEL EN ANGLAIS (4 pages)
// ------------------------------------------------------------
const pagesEn = [
  {
    pageNum: '1 / 4',
    title: 'Masrouf - User Manual',
    subtitle: '100% Local Family Budget Tracking App',
    sections: [
      {
        heading: '1. Introduction & Total Privacy',
        lines: [
          'Masrouf is a mobile personal budget application built for Tunisian families.',
          'It runs 100% locally on your phone using SQLite: no internet, no external server.',
          'All your financial data remains confidential on your physical device.',
          'Masrouf features two separate roles: Standard User and Administrator.',
        ],
      },
      {
        heading: '2. Onboarding & Registration',
        lines: [
          'Create your personal account using the registration form upon first launch.',
          'A three-step onboarding assistant walks you through without forcing a budget.',
          'Pick your preferred expense categories from the built-in system categories.',
          'You will then arrive at the clean home dashboard in its initial zero state.',
        ],
      },
    ],
  },
  {
    pageNum: '2 / 4',
    title: 'Budget Envelopes & Purchases',
    subtitle: 'Envelope allocations and daily expense logging',
    sections: [
      {
        heading: '3. Creating and Allocating Budget',
        lines: [
          'Define a total budget in Tunisian Dinars for your selected custom date range.',
          'Distribute the sum into your active envelopes with real-time balance check.',
          'Total envelope allocations cannot exceed the specified overall budget.',
          'Use "Copy Previous Period" to quickly re-apply your favorite budget distribution.',
        ],
      },
      {
        heading: '4. Logging Purchases and Simple Expenses',
        lines: [
          'Record purchases in two visually distinct modes:',
          '- Product Purchase: product catalog selection, quantity, and total price.',
          '- Simple Expense: recurring bills, transit, rent, or utilities without products.',
          'Instant suggestions help you pick existing items without creating duplicates.',
          'Unit price is calculated in real time and compared to your last recorded purchase.',
        ],
      },
    ],
  },
  {
    pageNum: '3 / 4',
    title: 'Product Catalog & Price Insights',
    subtitle: 'Permanent photos, price history, and best store detection',
    sections: [
      {
        heading: '5. Product Catalog and Camera Photos',
        lines: [
          'The catalog features "Today\'s Purchases" at the top alongside instant search.',
          'Attach real photos to products via camera snapshot or gallery picker.',
          'The shared ProductThumb component displays the image or fallback icon.',
          'Images are copied to the permanent app directory with stable filenames.',
        ],
      },
      {
        heading: '6. Product Details & Best Store Indicator',
        lines: [
          'The product sheet highlights the cheapest store where you bought the item.',
          'A price history curve plots past unit prices across your recorded transactions.',
          'Color banners tell you whether your latest purchase saved money or cost more.',
        ],
      },
    ],
  },
  {
    pageNum: '4 / 4',
    title: 'Analytics, Points & Administration',
    subtitle: 'Precise financial metrics, automated rules, and governance',
    sections: [
      {
        heading: '7. Analytics & Rule-based Conclusions',
        lines: [
          'The Analytics screen compares the current period against a prior identical span.',
          'A proportional segmented bar visualizes your main expense categories.',
          'An automatic rule engine (no AI) summarizes key habits and exceeded envelopes.',
          'Calculations run in integer millimes to eliminate any floating-point rounding errors.',
        ],
      },
      {
        heading: '8. Points Gamification & Admin Space',
        lines: [
          'Earn points when keeping within budget: Beginner, Saver, and Expert ranks.',
          'The Admin space provides anonymous global metrics and category management.',
          'Administrators have strictly no access to individual user budgets or purchases.',
        ],
      },
    ],
  },
];

// ------------------------------------------------------------
// MANUEL EN ARABE (Translittéré / format standardisé clair)
// ------------------------------------------------------------
const pagesAr = [
  {
    pageNum: '1 / 4',
    title: 'Masrouf - Dalil Al-Isti\'mal (Manuel)',
    subtitle: 'Tatbiq Masrouf li-tadbir mizaniyat al-usra',
    sections: [
      {
        heading: '1. Mukaddima wa Khususiyya Kamila',
        lines: [
          'Masrouf tatbiq mahalli 100% li-mutaba\'at al-masarif al-usriyya.',
          'Yastakhdim qa\'idat bayanat SQLite dakhiliyya duna hajat ila internet.',
          'Kull bayanatika al-maliyya tabqa mahmiyya 100% \'ala hatifika.',
          'Yad\'am al-tatbiq hisabayn : Hisab Mustakhdim wa Hisab Mas\'ul (Admin).',
        ],
      },
      {
        heading: '2. Al-Bidayah wa Insha\' Hisab',
        lines: [
          'Qum bi-insha\' hisab jadid \'abr shashat al-tasjil al-awwaliyya.',
          'Musai\'d al-intilaq min 3 marahil yusa\'iduka duna fardh mizaniyya musbaqan.',
          'Ikhtar al-asnaf al-mufadhala ladayka min qa\'imat al-asnaf al-rasmiyya.',
          'Satasil ba\'daha ila al-shashah al-ra\'isiyya fi halatiha al-asliyya.',
        ],
      },
    ],
  },
  {
    pageNum: '2 / 4',
    title: 'Tadbir Al-Mizaniyya wa Al-Mushtarayat',
    subtitle: 'Nidham al-adhruf al-maliyya wa tasjil al-masarif',
    sections: [
      {
        heading: '3. Tahdid wa Tawzi\' Al-Mizaniyya',
        lines: [
          'Haddid al-mablagh al-ijmali bi-al-Dinar al-Tunisi li-kull fatra.',
          'Wazzi\' al-mablagh \'ala azhrufika al-maliyya bi-diqqa \'aliya.',
          'Qa\'ida sarima : la yumkin an yatajawaz al-tawzi\' al-mablagh al-kulli.',
          'Khasisyat "Naskh al-fatra al-sabiqa" tumakkinuka min i\'adat al-khitta bi-naqra.',
        ],
      },
      {
        heading: '4. Tasjil Al-Mushtarayat wa Al-Masarif',
        lines: [
          'Yumkinuka tasjil naw\'ayn min al-mu\'amalat fi shashat Idhafah :',
          '- Shira\' muntaj : ikhtiyar al-muntaj ma\'a al-sura wa al-kimiya wa al-si\'r.',
          '- Masrouf mubashir : fawateer, naql, sira\' aw masarif duna muntaj.',
          'Iqtirahath fawriyya \'inda kitabat al-ism li-tafadi al-takrar.',
        ],
      },
    ],
  },
  {
    pageNum: '3 / 4',
    title: 'Fihris Al-Muntajat wa Suwar',
    subtitle: 'Al-Suwar al-da\'ima wa al-matjar al-aqall si\'ran',
    sections: [
      {
        heading: '5. Fihris Al-Muntajat wa Al-Suwar',
        lines: [
          'Qism "Mushtarayat al-yawm" fi a\'la al-fihris li-tashil al-wusul.',
          'Iltaqit suwar haqiqiyya li-al-muntaj bi-al-kamira aw al-ma\'radh.',
          'Juz\' ProductThumb ya\'ridh al-sura aw ayqunat al-sanf bi-shakl saliys.',
          'Al-suwar tuhfadh fi majallad da\'im ma\'a asma\' farida wa mustaqirrah.',
        ],
      },
      {
        heading: '6. Bitaqat Al-Muntaj wa Muqaranat Al-As\'ar',
        lines: [
          'Bitaqat al-muntaj tu\'ridh al-matjar al-ladhi ishtareyta minhu bi-aqall si\'r.',
          'Rasm bayani yuwadhih tatawwur si\'r al-wihda \'abr al-zaman.',
          'Sharid mulawwan yubayyin ma idha kan al-shira\' al-akhir arkhis aw aghla.',
        ],
      },
    ],
  },
  {
    pageNum: '4 / 4',
    title: 'Al-Tahleelat wa Al-Niqat wa Al-Idarah',
    subtitle: 'Mu\'ashirat daqiqa, khulasa aliyya wa fada\' al-mas\'ul',
    sections: [
      {
        heading: '7. Shashat Al-Tahleelat wa Al-Khulasa',
        lines: [
          'Muqaranah daqiqa bayn al-fatra al-haliyya wa al-fatra al-sabiqa bi-nafs al-mudda.',
          'Rasm bayani muqassam bi-al-asnaf ma\'a tartib al-masarif al-kubra.',
          'Khulasa aliyya bi-al-qawa\'id (duna AI) tulakhis al-ada\' al-mali.',
          'Hisabat bi-al-Millim li-dhaman daqqa hisabiyya kamila bila akhta\' taghrib.',
        ],
      },
      {
        heading: '8. Niqat Al-Tashji\' wa Fada\' Al-Mas\'ul',
        lines: [
          'Iksib niqat \'inda ihtiram al-mizaniyya : Mubtadi\', Muqtasid, wa Khabir.',
          'Fada\' al-mas\'ul yatafatash \'ala mu\'ashirat ijmaliyya ghayr shakhsiyya.',
          'La yumkin li-al-mas\'ul al-ittila\' \'ala ay mu\'amala maliyya fardiyya.',
        ],
      },
    ],
  },
];

// Création du dossier assets/manuals
const destDir = path.resolve('assets/manuals');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.writeFileSync(path.join(destDir, 'manuel_fr.pdf'), createPdf(pagesFr));
fs.writeFileSync(path.join(destDir, 'manuel_en.pdf'), createPdf(pagesEn));
fs.writeFileSync(path.join(destDir, 'manuel_ar.pdf'), createPdf(pagesAr));

console.log('PDFs generated successfully in assets/manuals/:');
console.log('- manuel_fr.pdf (' + fs.statSync(path.join(destDir, 'manuel_fr.pdf')).size + ' bytes)');
console.log('- manuel_en.pdf (' + fs.statSync(path.join(destDir, 'manuel_en.pdf')).size + ' bytes)');
console.log('- manuel_ar.pdf (' + fs.statSync(path.join(destDir, 'manuel_ar.pdf')).size + ' bytes)');
