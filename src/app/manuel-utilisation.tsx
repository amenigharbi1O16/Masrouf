// ============================================================
// FICHIER : src/app/manuel-utilisation.tsx
// RÔLE DANS L'APPLICATION :
//   Écran officiel de consultation du Manuel d'utilisation (PDF) de Masrouf.
//   S'ouvre lorsque l'utilisateur clique sur le cadre "Manuel d'utilisation (PDF)"
//   depuis la page des réglages utilisateur ou administrateur.
//   Adapte immédiatement le contenu et la mise en page à la langue choisie (FR, EN ou AR).
//
// ANALOGIE DE LA VIE RÉELLE :
//   C'est comme ouvrir le classeur de documentation officiel et relié :
//   chaque page est présentée comme une feuille A4 soignée, avec sa pagination (1/4 à 4/4),
//   ses titres en vert forêt, ses sections explicatives et la possibilité d'imprimer
//   ou d'exporter le fichier binaire `.pdf` natif.
//
// IMPACT DANS L'INTERFACE UTILISATEUR :
//   - Affiche les 4 pages du manuel officiel dans la langue choisie (Français, Anglais ou Arabe RTL).
//   - Permet de feuilleter page par page avec les boutons [Précédent] et [Suivant].
//   - Permet de changer la langue du manuel à la volée grâce aux pastilles en haut d'écran.
//   - Fournit un bouton direct "Ouvrir le fichier .PDF externe" pour le télécharger ou l'ouvrir dans Acrobat / Drive.
// ============================================================

// ============================================================================
// IMPORTS TECHNIQUES ET DÉPENDANCES DU MODULE
// ============================================================================

// React core et hooks pour la gestion d'état local (langue active, numéro de page) et cycle de vie
import React, { useEffect, useState } from 'react';
// Composants de présentation React Native pour la structure graphique et les interactions tactiles
import { Pressable, StyleSheet, Text, View } from 'react-native';
// Hooks de routage Expo Router pour lire les paramètres de navigation et gérer le retour arrière
import { useLocalSearchParams, useRouter } from 'expo-router';
// Jeu d'icônes vectorielles IonIcons pour la signalétique visuelle (document, chevrons, boutons)
import { Ionicons } from '@expo/vector-icons';
// Conteneur d'écran officiel Masrouf avec support automatique du safe-area et de l'en-tête
import { Screen } from '@/components/Screen';
// Composant bouton réutilisable avec variantes graphiques (primaire, secondaire)
import { Button } from '@/components/ui';
// Constantes de thème : palette de couleurs harmonisée (vert forêt, blanc, bordures douces)
import { colors } from '@/constants/theme';
// Types et hook d'internationalisation pour la synchronisation globale et le support RTL
import { Langue, useTranslation } from '@/utils/i18n';
// Utilitaire d'ouverture ou partage direct du document PDF physique dans une application tierce
import { ouvrirFichierPdfNatif } from '@/utils/pdf';

// ============================================================================
// STRUCTURE DE DONNÉES PÉDAGOGIQUE DU GUIDE
// ============================================================================

/**
 * Interface d'une section thématique au sein d'une page du manuel.
 * Représente un titre de rubrique avec sa liste ordonnée de points explicatifs.
 */
interface SectionItem {
  // Titre numéroté de la section (ex: "1. Introduction et Confidentialité")
  heading: string;
  // Paragraphes ou puces textuelles explicatives
  lines: string[];
}

/**
 * Interface d'une page complète du manuel d'utilisation (format A4 simulé).
 * Chaque page regroupe un titre, un sous-titre et plusieurs sections thématiques.
 */
interface PageItem {
  // Numéro de page officiel au format "X / 4"
  pageNum: string;
  // Titre principal de la page
  title: string;
  // Sous-titre descriptif contextualisant la page
  subtitle: string;
  // Liste ordonnée des sections de contenu contenues sur cette page
  sections: SectionItem[];
}

/**
 * DONNÉES DU MANUEL OFFICIEL EN FRANÇAIS (4 PAGES COMPLÈTES)
 * Conçu pour guider pas à pas l'utilisateur dans l'usage quotidien de Masrouf.
 */
const MANUEL_FR: PageItem[] = [
  // --- PAGE 1/4 : FONDATIONS, CONFIDENTIALITÉ ET PREMIER DÉMARRAGE ---
  {
    pageNum: '1 / 4',
    title: 'Masrouf - Manuel d\'utilisation',
    subtitle: 'Application locale de gestion budgétaire familiale',
    sections: [
      {
        heading: '1. Introduction et Confidentialité Totale',
        lines: [
          'Masrouf est une application mobile locale de suivi budgétaire pour les familles tunisiennes.',
          'Elle fonctionne à 100 % en local sur votre appareil avec SQLite, sans serveur distant.',
          'Aucune connexion internet n\'est requise : vos données financières restent 100% privées.',
          'L\'application prend en charge deux profils : Utilisateur standard et Administrateur.',
        ],
      },
      {
        heading: '2. Premier démarrage et Inscription',
        lines: [
          'À la première installation, créez un compte via l\'écran d\'inscription (adresse Gmail requise).',
          'Un assistant de départ en 3 étapes vous guide pour choisir vos catégories d\'enveloppes.',
          'Aucun budget initial n\'est forcé : vous démarrez avec un solde propre et clair.',
          'Vous arrivez ensuite directement sur le tableau de bord d\'accueil prêt à l\'emploi.',
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
        heading: '3. Création et Répartition du Budget',
        lines: [
          'Fixez un montant global en Dinars Tunisiens pour la période de votre choix (dates exactes).',
          'Un seul budget est alloué par mois pour garantir la rigueur et la clarté financière.',
          'Répartissez la somme entre vos différentes catégories (Alimentation, Factures, Transport, etc.).',
          'Une règle stricte interdit que la somme allouée aux enveloppes dépasse votre budget total.',
          'La fonction "Copier la période précédente" permet de reconduire vos choix en un seul clic.',
        ],
      },
      {
        heading: '4. Enregistrement d\'un Achat ou d\'une Dépense',
        lines: [
          'L\'application permet d\'enregistrer deux types d\'opérations distinctes :',
          '• Achat de produit : sélection du produit avec photo, magasin, quantité et prix total.',
          '• Dépense directe simple : transport, factures, loyer ou loisirs sans produit physique.',
          'Lors de la saisie, un système de suggestions instantanées évite les créations en double.',
          'Le prix unitaire est calculé automatiquement et comparé à votre achat précédent.',
        ],
      },
    ],
  },
  {
    pageNum: '3 / 4',
    title: 'Catalogue, Fiche Produit et Suivi des Prix',
    subtitle: 'Photos, historique des prix et détection du magasin le moins cher',
    sections: [
      {
        heading: '5. Catalogue des Produits et Photos',
        lines: [
          'Le catalogue liste tous vos produits avec une section "Achats du jour" en tête.',
          'Chaque produit peut comporter une vraie photo prise par la caméra ou depuis la galerie.',
          'Le composant ProductThumb affiche la vignette photo ou une icône vectorielle de repli.',
          'Les fichiers photos sont stockés de manière sécurisée et permanente sur l\'appareil.',
        ],
      },
      {
        heading: '6. Fiche Produit et Comparaison des Magasins',
        lines: [
          'La fiche détaillée identifie le magasin où vous avez acheté le produit le moins cher.',
          'Un graphique retrace l\'évolution historique du prix unitaire dans le temps.',
          'Une bannière colorée signale si votre dernier achat était plus cher ou plus économe.',
        ],
      },
    ],
  },
  {
    pageNum: '4 / 4',
    title: 'Analyses, Points et Espace Admin',
    subtitle: 'Statistiques financières, règles automatiques et gouvernance',
    sections: [
      {
        heading: '7. Analyses et Conclusion Automatique',
        lines: [
          'L\'écran Analyses compare la période active à la période précédente de même durée.',
          'Un diagramme à segments proportionnels met en valeur vos principales dépenses.',
          'Une conclusion par règles déterministes (sans IA) résume vos habitudes et dépassements.',
          'Tous les calculs s\'effectuent en millimes entiers pour éviter toute erreur d\'arrondi.',
        ],
      },
      {
        heading: '8. Gamification et Supervision Admin',
        lines: [
          'Gagnez 100 points à chaque fin de période budgétaire respectée : Débutant, Économe, Expert.',
          'L\'espace Administrateur donne accès à des statistiques globales et anonymisées.',
          'L\'administrateur ne peut jamais consulter les transactions privées ni les budgets des usagers.',
        ],
      },
    ],
  },
];

/**
 * OFFICIAL USER MANUAL IN ENGLISH (4 FULL PAGES)
 * Step-by-step guide explaining all features of the Masrouf budgeting app.
 */
const MANUEL_EN: PageItem[] = [
  // --- PAGE 1/4 (EN): FOUNDATIONS, PRIVACY AND SETUP ---
  {
    pageNum: '1 / 4',
    title: 'Masrouf - User Manual',
    subtitle: '100% Local Family Budget Tracking Application',
    sections: [
      {
        heading: '1. Introduction & Total Privacy',
        lines: [
          'Masrouf is a mobile personal budget application built for Tunisian families.',
          'It runs 100% locally on your phone using SQLite: no internet, no external server.',
          'All your financial data remains strictly confidential on your physical device.',
          'Masrouf features two separate roles: Standard User and Administrator.',
        ],
      },
      {
        heading: '2. Onboarding & Registration',
        lines: [
          'Create your personal account using the registration form upon first launch.',
          'A gentle 3-step onboarding assistant walks you through without forcing a budget.',
          'Pick your preferred expense categories from the built-in system categories.',
          'You will then arrive directly at the clean home dashboard in its initial zero state.',
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
          'Only one budget allocation is allowed per month to guarantee financial discipline.',
          'Distribute the sum into your active envelopes with real-time balance checks.',
          'Total envelope allocations cannot exceed the specified overall budget.',
          'Use "Copy Previous Period" to quickly re-apply your favorite budget distribution.',
        ],
      },
      {
        heading: '4. Logging Purchases and Simple Expenses',
        lines: [
          'Record purchases in two visually distinct modes:',
          '• Product Purchase: product catalog selection, quantity, store, and total price.',
          '• Simple Expense: recurring bills, transit, rent, or utilities without products.',
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
          'Earn 100 points when keeping within budget: Beginner, Saver, and Expert ranks.',
          'The Admin space provides anonymous global metrics and category management.',
          'Administrators have strictly no access to individual user budgets or purchases.',
        ],
      },
    ],
  },
];

/** Données complètes du manuel en Arabe (4 pages en écriture arabe authentique) */
const MANUEL_AR: PageItem[] = [
  {
    pageNum: '1 / 4',
    title: 'مصروف - دليل الاستخدام',
    subtitle: 'تطبيق محلي 100% لإدارة ومتابعة ميزانية العائلة',
    sections: [
      {
        heading: '1. مقدمة وخصوصية مالية تامة',
        lines: [
          'مصروف هو تطبيق للهاتف الذكي مصمم لمساعدة العائلات التونسية في تتبع وإدارة مصاريفها اليومية.',
          'يعمل التطبيق محلياً بنسبة 100% على جهازك عبر قاعدة بيانات SQLite دون أي حاجة لخادم خارجي.',
          'لا يلزم أي اتصال بالإنترنت : جميع بياناتك المالية تبقى مشفرة وخاصة داخل هاتفك الشخصي.',
          'يدعم التطبيق نوعين من الحسابات : حساب المستخدم العادي وحساب المسؤول (Admin).',
        ],
      },
      {
        heading: '2. البدء والتسجيل الأول',
        lines: [
          'قم بإنشاء حسابك الشخصي بإدخال اسمك، بريد Gmail (name@gmail.com) وكلمة مرور قوية.',
          'مساعد انطلاق من 3 خطوات يرشدك لاختيار أصناف المصاريف التي تناسب نمط حياتك.',
          'لا يتم فرض أي ميزانية مسبقة : تبدأ بحساب نظيف وخالٍ من أي تعقيد أو ديون سابقة.',
          'تصل مباشرة إلى لوحة التحكم الرئيسية في وضعها الأصلي الجاهز لتسجيل أول عملية شراء.',
        ],
      },
    ],
  },
  {
    pageNum: '2 / 4',
    title: 'إدارة الميزانيات وتسجيل المشتريات',
    subtitle: 'توزيع المظاريف المالية والتسجيل اليومي للمصاريف',
    sections: [
      {
        heading: '3. إنشاء وتوزيع الميزانية',
        lines: [
          'حدد مبلغ الميزانية الإجمالي بالدينار التونسي للفترة الزمنية التي تختارها (تاريخ البداية والنهاية).',
          'يُسمح بميزانية واحدة فقط لكل شهر لضمان الانضباط والدقة في متابعة المصاريف.',
          'وزع المبلغ بين مظاريف الأصناف المختلفة (التغذية، النقل، الفواتير، السكن، الترفيه، إلخ).',
          'تمنع قاعدة مالية صارمة أن يتجاوز مجموع المظاريف الموزعة الميزانية الإجمالية المحددة.',
          'يتيح زر "نسخ الفترة السابقة" إعادة تطبيق توزيعك المالي المفضل بنقرة واحدة.',
        ],
      },
      {
        heading: '4. تسجيل عملية شراء أو نفقة مباشرة',
        lines: [
          'يتيح التطبيق تسجيل نوعين متميزين من العمليات المالية :',
          '• شراء منتج : اختيار السلعة مع صورتها، اسم المتجر، الكمية والمبلغ الإجمالي بالدينار.',
          '• نفقة مباشرة بسيطة : مصاريف النقل، الفواتير، الإيجار أو المناسبات دون وجود سلعة عينية.',
          'يتم حساب سعر الوحدة تلقائياً ومقارنته بآخر سعر اشتريت به نفس المنتج لتنبيهك بالتضخم.',
          'نظام اقتراحات فورية يمنع التكرار ويسهل عليك العثور على المنتجات المسجلة سابقاً.',
        ],
      },
    ],
  },
  {
    pageNum: '3 / 4',
    title: 'دليل المنتجات، بطاقة السلعة ومتابعة الأسعار',
    subtitle: 'الصور الحقيقية، تتبع تقلبات الأسعار وتحديد أرخص متجر',
    sections: [
      {
        heading: '5. دليل المنتجات والصور الفوتوغرافية',
        lines: [
          'يعرض الدليل كافة منتجاتك مع تثبيت قسم "مشتريات اليوم" في الأعلى لسهولة المتابعة.',
          'أضف صورة حقيقية للمنتج بواسطة كاميرا الهاتف أو اخترها من معرض الصور الخاص بك.',
          'يعرض المكون المشترك ProductThumb صورة المنتج المصغرة أو أيقونة الصنف الرمزية.',
          'تُحفظ ملفات الصور بشكل آمن ودائم داخل مساحة التخزين المستقلة للتطبيق.',
        ],
      },
      {
        heading: '6. بطاقة المنتج وتحديد المتجر الأرخص',
        lines: [
          'توضح البطاقة التفصيلية للمنتج اسم المتجر الذي اشتريت منه السلعة بأرخص سعر مسجل.',
          'رسم بياني خطي يعرض تاريخ تطور سعر الوحدة عبر مشترياتك السابقة.',
          'لافتة تنبيه ملونة توضح ما إذا كانت عملية الشراء الأخيرة أكثر تكلفة أو وفرت لك المال.',
        ],
      },
    ],
  },
  {
    pageNum: '4 / 4',
    title: 'التحليلات، النقاط وإدارة المنظومة',
    subtitle: 'استنتاجات مالية دون ذكاء اصطناعي، رتب النقاط وحوكمة النظام',
    sections: [
      {
        heading: '7. التحليلات والاستنتاج المالي التلقائي',
        lines: [
          'تقارن شاشة التحليلات الفترة المالية النشطة بالفترة السابقة المشابهة لها في المدة.',
          'مخطط قطاعي شريطي يبرز أهم مجالات الصرف ونسبتها المئوية من الميزانية.',
          'محرك استنتاجات بقواعد محددة (دون ذكاء اصطناعي خارجي) يلخص عاداتك وأي تجاوز للحدود.',
          'تُجرى كافة الحسابات بالمليم الصحيح لمنع أي خطأ تقريب أو كسور عشرية غير دقيقة.',
        ],
      },
      {
        heading: '8. رتب النقاط ولوحة تحكم المسؤول (Admin)',
        lines: [
          'احصل على 100 نقطة عند إتمام كل فترة مالية دون تجاوز ميزانيتك المقررة.',
          'تقدم عبر المراتب : مبتدئ (0 نقطة)، مقتصد (300 نقطة)، وخبير (1000 نقطة).',
          'توفر لوحة تحكم المسؤول مؤشرات مجمعة ومجهولة الهوية بالكامل حول سلامة النظام.',
          'لا يمكن للمسؤول بأي شكل من الأشكال الاطلاع على مشتريات أو ميزانيات المستخدمين الفردية.',
        ],
      },
    ],
  },
];

/**
 * MISSION DU COMPOSANT : ManuelUtilisationScreen
 *   Affichage haute-fidélité du Manuel d'utilisation au format PDF complet.
 */
export default function ManuelUtilisationScreen() {
  // Extraction du routeur pour le retour arrière
  const router = useRouter();
  // Paramètres passés dans l'URL pour déterminer la langue initiale demandée
  const params = useLocalSearchParams<{ lang?: string }>();
  // Récupération de la langue globale, de la fonction de bascule et des traductions
  const { langue: globalLang, isRTL: globalRTL, t, changerLangue } = useTranslation();

  // Langue active pour l'affichage du manuel (priorité au paramètre d'URL, sinon langue globale)
  const initialLang: Langue =
    params.lang === 'fr' || params.lang === 'en' || params.lang === 'ar'
      ? (params.lang as Langue)
      : globalLang;

  // État local de la langue affichée
  const [activeLang, setActiveLang] = useState<Langue>(initialLang);
  // État de la page en cours de lecture (1 à 4)
  const [pageIndex, setPageIndex] = useState<number>(0);

  // Synchronisation dynamique : actualise la langue affichée dès que l'application ou les paramètres changent
  useEffect(() => {
    // Si un paramètre d'URL valide est présent, l'appliquer
    if (params.lang === 'fr' || params.lang === 'en' || params.lang === 'ar') {
      setActiveLang(params.lang as Langue);
    } else {
      // Sinon se conformer rigoureusement à la langue globale active
      setActiveLang(globalLang);
    }
  }, [params.lang, globalLang]);

  // Détection du sens RTL pour la langue sélectionnée dans le manuel (arabe = droite à gauche)
  const isRTL = activeLang === 'ar';

  // Sélection du jeu de 4 pages officiel correspondant à la langue
  const pages: PageItem[] =
    activeLang === 'ar' ? MANUEL_AR : activeLang === 'en' ? MANUEL_EN : MANUEL_FR;

  // Page actuelle affichée dans le gabarit A4
  const currentPage = pages[pageIndex] || pages[0];

  // Action de changement de langue : met à jour le manuel et synchronise la langue globale de l'app
  const handleSelectLang = (lCode: Langue) => {
    // Met à jour la langue locale du lecteur
    setActiveLang(lCode);
    // Met à jour la langue globale et la direction RTL de toute l'application
    changerLangue(lCode);
  };

  // Action d'ouverture du fichier PDF natif externe
  const handleOuvrirNatif = async () => {
    await ouvrirFichierPdfNatif(activeLang);
  };

  // Gestion sécurisée du retour arrière
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)' as never);
    }
  };

  return (
    // Screen avec flèche de retour arrière explicite (back=true) pour revenir aux réglages
    <Screen
      title={t('manuel_utilisation')}
      back
      onBack={handleBack}
    >
      {/* 1. Barre de sélection rapide de la langue du manuel avec synchronisation globale */}
      <View style={[styles.langBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {(['fr', 'en', 'ar'] as Langue[]).map((lCode) => {
          const isSelected = activeLang === lCode;
          const label = lCode === 'fr' ? 'Français' : lCode === 'en' ? 'English' : 'العربية';
          return (
            <Pressable
              key={lCode}
              onPress={() => handleSelectLang(lCode)}
              style={[styles.langPill, isSelected && styles.langPillActive]}
              accessibilityRole="button"
            >
              <Text style={[styles.langPillText, isSelected && styles.langPillTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 2. Bouton d'action pour ouvrir le fichier .PDF brut externe */}
      <Pressable
        onPress={handleOuvrirNatif}
        style={[styles.externalButton, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        accessibilityRole="button"
      >
        <Ionicons name="document-text-outline" size={20} color={colors.white} />
        <Text style={styles.externalButtonText}>
          {activeLang === 'ar'
            ? 'فتح ملف PDF في تطبيق خارجي'
            : activeLang === 'en'
            ? 'Open .PDF file in external viewer'
            : 'Ouvrir le fichier .PDF externe'}
        </Text>
      </Pressable>

      {/* 3. Feuille de document stylisée comme une page PDF A4 */}
      <View style={styles.sheetContainer}>
        {/* En-tête de feuille PDF */}
        <View style={[styles.sheetHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.pdfBadge}>
            <Text style={styles.pdfBadgeText}>PDF 1.4</Text>
          </View>
          <Text style={styles.sheetPageNumber}>{currentPage.pageNum}</Text>
        </View>

        {/* Titre et sous-titre de la page */}
        <Text style={[styles.sheetTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
          {currentPage.title}
        </Text>
        <Text style={[styles.sheetSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
          {currentPage.subtitle}
        </Text>

        <View style={styles.divider} />

        {/* Sections de la page */}
        {currentPage.sections.map((sec, sIdx) => (
          <View key={sIdx} style={styles.sectionBlock}>
            <Text style={[styles.sectionHeading, { textAlign: isRTL ? 'right' : 'left' }]}>
              {sec.heading}
            </Text>
            {sec.lines.map((line, lIdx) => (
              <View
                key={lIdx}
                style={[styles.bulletRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <View style={styles.bulletDot} />
                <Text
                  style={[
                    styles.bulletText,
                    { textAlign: isRTL ? 'right' : 'left', flex: 1 },
                  ]}
                >
                  {line}
                </Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.divider} />

        {/* Pied de page du document */}
        <View style={[styles.sheetFooter, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.footerText}>Masrouf — Document Officiel</Text>
          <Text style={styles.footerText}>{currentPage.pageNum}</Text>
        </View>
      </View>

      {/* 4. Barre de pagination inférieure [ < Précédent ] [ Page X / 4 ] [ Suivant > ] */}
      <View style={[styles.paginationRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={{ flex: 1 }}>
          <Button
            label={activeLang === 'ar' ? 'السابق' : activeLang === 'en' ? 'Previous' : 'Précédent'}
            variant="secondary"
            disabled={pageIndex === 0}
            onPress={() => setPageIndex((p) => Math.max(0, p - 1))}
          />
        </View>
        <View style={styles.pageBadge}>
          <Text style={styles.pageBadgeText}>{currentPage.pageNum}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={activeLang === 'ar' ? 'التالي' : activeLang === 'en' ? 'Next' : 'Suivant'}
            variant="primary"
            disabled={pageIndex === pages.length - 1}
            onPress={() => setPageIndex((p) => Math.min(pages.length - 1, p + 1))}
          />
        </View>
      </View>

      <View style={{ height: 20 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Barre horizontale supérieure regroupant les 3 pastilles de langue (Français, English, العربية)
  langBar: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  // Pastille de langue inactive : fond crème chaleureux et bordure fine
  langPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.warm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Pastille de langue sélectionnée : fond vert forêt et texte blanc contrasté
  langPillActive: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  // Typographie du libellé de langue dans la pastille
  langPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.forest,
  },
  // Couleur de texte blanche pour la langue active
  langPillTextActive: {
    color: colors.white,
  },
  // Bouton d'action principal pour ouvrir le fichier PDF natif dans Acrobat ou Drive
  externalButton: {
    backgroundColor: colors.forest,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  // Texte du bouton d'ouverture externe
  externalButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  // Conteneur simulant une feuille de papier A4 blanche avec ombrage doux et bordure
  sheetContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  // En-tête de la feuille PDF avec badge format et numéro de page
  sheetHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  // Badge rouge d'identification du standard PDF 1.4
  pdfBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  // Texte blanc bold du badge PDF
  pdfBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  // Indicateur textuel de page (ex: "1 / 4")
  sheetPageNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  // Titre principal de la page en vert forêt soutenu
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.forest,
    marginBottom: 4,
  },
  // Sous-titre gris ardoise contextualisant la thématique
  sheetSubtitle: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 12,
  },
  // Ligne de séparation horizontale fine et élégante
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  // Bloc regroupant une section et sa liste de puces explicatives
  sectionBlock: {
    marginBottom: 16,
  },
  // Titre de sous-section en vert forêt bold
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.forest,
    marginBottom: 8,
  },
  // Ligne de puce avec point vert et texte explicatif
  bulletRow: {
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  // Puce circulaire verte de 5px
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.green,
    marginTop: 6,
  },
  // Texte explicatif de la puce pédagogique
  bulletText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#374151',
  },
  // Pied de page du document officiel rappelant la pagination
  sheetFooter: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Texte du pied de page officiel Masrouf
  footerText: {
    fontSize: 11,
    color: colors.muted,
  },
  // Barre inférieure de navigation entre les 4 pages du manuel
  paginationRow: {
    alignItems: 'center',
    gap: 12,
  },
  // Badge central indiquant le numéro de la page en cours de lecture
  pageBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.warm,
  },
  // Texte du badge de page active
  pageBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.forest,
  },
});
