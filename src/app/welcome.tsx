/**
 * FICHIER : src/app/welcome.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-021-WELCOME
 * ÉCRAN : PARCOURS D'ACCUEIL COMPLET (Botanique -> 3 Slides -> Choix du Type de Compte)
 *
 * MISSION DU FICHIER :
 * Fournir la séquence d'accueil officielle, fluide et pédagogique de Masrouf :
 * 1. PHASE 1 ('welcome') : Écran d'accueil botanique minimaliste et apaisant (fond crème #FBFAF6,
 *    logo vectoriel, vagues organiques, typographie élégante "Welcome to Masrouf" et sélecteur de langue).
 * 2. PHASE 2 ('slides') : Déclenchée au clic sur 'Commencer'. Carrousel pédagogique de 3 slides
 *    présentant les piliers de Masrouf (Finances personnelles, Budgets et Organisation, Gestion familiale & Enfants).
 * 3. PHASE 3 ('select_type') : Choix du type de compte ('Compte Personnel' ou 'Compte Famille / Parent')
 *    orientant vers l'inscription personnalisée (/inscription?type=personal ou /inscription?type=family).
 * 4. ACCÈS DIRECT CONNEXION : Le lien 'Déjà un compte ? Se connecter' redirige immédiatement vers /login.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * Une navigation par étapes harmonieuse et sans rupture, respectant la charte graphique botanique
 * et le sens de lecture (RTL en Arabe, LTR en Français et Anglais).
 */

// Importation des icônes vectorielles Ionicons
import { Ionicons } from '@expo/vector-icons';
// Importation du hook de navigation impérative Expo Router
import { useRouter } from 'expo-router';
// Importation de React et des hooks d'état et d'animation
import React, { useEffect, useRef, useState } from 'react';
// Importation des composants graphiques et tactiles React Native
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
// Gestion sécurisée des zones matérielles (barre d'état, encoche)
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Contrôle de la barre d'état
import { StatusBar } from 'expo-status-bar';
// Outil de dessin vectoriel SVG pour le soulignement courbé
import Svg, { Path } from 'react-native-svg';
// Arrière-plan botanique avec vagues et filigranes organiques
import { BotanicalBackground } from '@/components/BotanicalBackground';
// Sélecteur de langue trilingue universel
import { LanguageSelector } from '@/components/LanguageSelector';
// Logo officiel Masrouf vectoriel
import { MasroufLogo } from '@/components/MasroufLogo';
// Composants atomiques d'interface utilisateur
import { Body, Button, Eyebrow, SectionTitle } from '@/components/ui';
// Constantes de thème (couleurs vert forêt, menthe, blanc)
import { colors, radius } from '@/constants/theme';
// Hook de traduction multilingue et sens de lecture
import { useTranslation } from '@/utils/i18n';

// Définition des 3 phases du parcours d'accueil
type Phase = 'welcome' | 'slides' | 'select_type';

/**
 * MISSION DU COMPOSANT : WelcomeScreen
 * Composant racine du parcours de bienvenue et de sélection de profil.
 * CE QU'IL FAIT :
 * Gère la transition d'étapes entre l'accueil botanique, les 3 slides de présentation
 * et la sélection finale du type de compte sans quitter l'écran.
 * CE QU'IL AFFICHE :
 * L'écran botanique avec animations douces, puis le carrousel explicatif, puis les cartes de choix de compte.
 */
export default function WelcomeScreen() {
  // Hook de navigation Expo Router
  const router = useRouter();
  // Données de langue, direction RTL et fonction de traduction
  const { t, isRTL, langue } = useTranslation();
  // Marges matérielles de l'appareil
  const insets = useSafeAreaInsets();
  // Dimensions dynamiques de l'écran pour adaptation responsive
  const { width, height } = useWindowDimensions();

  // Détection des écrans compacts pour ajuster les proportions
  const isCompact = height < 700 || width < 360;

  // Phase courante dans le parcours : 'welcome', 'slides' ou 'select_type'
  const [phase, setPhase] = useState<Phase>('welcome');
  // Numéro du slide actif dans la phase 'slides' (0, 1 ou 2)
  const [activeSlide, setActiveSlide] = useState<number>(0);

  // Références d'animation pour le logo (opacité et déplacement vertical)
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(18)).current;

  // Références d'animation pour la typographie (opacité et déplacement vertical)
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(14)).current;

  // Référence d'animation pour les boutons d'action
  const ctaOpacity = useRef(new Animated.Value(0)).current;

  // Animation d'entrée douce de l'écran d'accueil botanique
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.timing(logoTranslateY, {
          toValue: 0,
          duration: 550,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(ctaOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  // Configuration des 3 slides d'introduction
  const slides = [
    {
      icon: 'wallet-outline' as const,
      color: colors.forest,
      bg: '#EAF7F0',
      title: t('slide1_titre'),
      desc: t('slide1_desc'),
      bullet1: isRTL ? 'تتبع مشتريات البقالة والأسعار الفردية' : 'Suivi des achats d’épicerie et prix unitaires',
      bullet2: isRTL ? 'إدارة النفقات الثابتة والاشتراكات' : 'Gestion des dépenses fixes et abonnements',
    },
    {
      icon: 'pie-chart-outline' as const,
      color: colors.mint,
      bg: '#E8F5E9',
      title: t('slide2_titre'),
      desc: t('slide2_desc'),
      bullet1: isRTL ? 'تخصيص الميزانيات الشهرية حسب الفئات' : 'Enveloppes budgétaires mensuelles',
      bullet2: isRTL ? 'تنبيهات فورية لتفادي تجاوز الميزانية' : 'Alertes visuelles de dépassement et économies',
    },
    {
      icon: 'people-outline' as const,
      color: '#1E88E5',
      bg: '#E3F2FD',
      title: t('slide3_titre'),
      desc: t('slide3_desc'),
      bullet1: isRTL ? 'إنشاء حسابات مستقلة للأبناء بكلمات سر مؤقتة' : 'Création de comptes enfants avec accès sécurisé',
      bullet2: isRTL ? 'إدارة الاحتياطي العائلي ومصروف الجيب' : 'Réserve familiale, argent de poche & demandes d’argent',
    },
  ];

  // Gestion du passage au slide suivant ou à la sélection de compte
  const handleNextSlide = () => {
    if (activeSlide < slides.length - 1) {
      setActiveSlide(activeSlide + 1);
    } else {
      setPhase('select_type');
    }
  };

  // Passer directement les slides pour aller au choix du compte
  const handleSkip = () => {
    setPhase('select_type');
  };

  // Sélection du type de compte et redirection vers le formulaire d'inscription
  const handleSelectAccount = (type: 'personal' | 'family') => {
    router.push({
      pathname: '/inscription',
      params: { type },
    } as never);
  };

  // Gestion du retour arrière physique ou bouton
  const handleBack = () => {
    if (phase === 'select_type') {
      setPhase('slides');
    } else if (phase === 'slides') {
      if (activeSlide > 0) {
        setActiveSlide(activeSlide - 1);
      } else {
        setPhase('welcome');
      }
    }
  };

  // Libellé de la ligne 1 selon la langue courante
  const welcomePrefix =
    langue === 'ar'
      ? 'مرحبًا بك في'
      : langue === 'en'
      ? 'Welcome to'
      : 'Bienvenue sur';

  // Libellé de la ligne 2 (nom de la marque)
  const brandName = langue === 'ar' ? 'مصروف' : 'Masrouf';

  // Taille responsive du logo
  const logoSize = isCompact ? 76 : width > 480 ? 104 : 88;
  // Largeur responsive du soulignement courbé
  const underlineWidth = isCompact ? 130 : 160;

  return (
    <View style={styles.rootContainer}>
      <StatusBar style="dark" />

      {/* Décoration d'arrière-plan avec vagues organiques botaniques */}
      <BotanicalBackground />

      {/* =========================================================================
          ZONE SUPÉRIEURE : Navigation et Sélecteur de langue
          ========================================================================= */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top + 8, 20),
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        {/* Bouton retour arrière si on est dans les slides ou le choix de compte */}
        {phase !== 'welcome' ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('retour_liste')}
          >
            <Ionicons
              name={isRTL ? 'arrow-forward' : 'arrow-back'}
              size={22}
              color={colors.forest}
            />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}

        {/* Sélecteur de langue discret */}
        <LanguageSelector variant="discreet" />
      </View>

      {/* =========================================================================
          PHASE 1 : ACCUEIL BOTANIQUE OFFICIEL (WELCOME BOTANICAL)
          ========================================================================= */}
      {phase === 'welcome' && (
        <View style={styles.welcomeContainer}>
          {/* ZONE CENTRALE : Logo Masrouf et Typographie d'accueil élégante */}
          <View style={styles.centerContainer}>
            <Animated.View
              style={[
                styles.logoWrap,
                {
                  opacity: logoOpacity,
                  transform: [{ translateY: logoTranslateY }],
                },
              ]}
            >
              <MasroufLogo size={logoSize} variant="default" />
            </Animated.View>

            <Animated.View
              style={[
                styles.textWrap,
                {
                  opacity: textOpacity,
                  transform: [{ translateY: textTranslateY }],
                },
              ]}
            >
              <Text
                style={[
                  styles.welcomePrefixText,
                  { fontSize: isCompact ? 18 : 21 },
                ]}
              >
                {welcomePrefix}
              </Text>

              <Text
                style={[
                  styles.brandTitleText,
                  { fontSize: isCompact ? 34 : width > 480 ? 46 : 40 },
                ]}
              >
                {brandName}
              </Text>

              <View style={styles.underlineContainer}>
                <Svg
                  width={underlineWidth}
                  height={12}
                  viewBox="0 0 160 12"
                  fill="none"
                >
                  <Path
                    d="M 12 3 C 55 11, 105 11, 148 3"
                    stroke={colors.lightGreen}
                    strokeWidth={2.8}
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
            </Animated.View>
          </View>

          {/* ZONE INFÉRIEURE : Bouton Commencer (ouvre les slides) et Connexion directe */}
          <Animated.View
            style={[
              styles.bottomBar,
              {
                paddingBottom: Math.max(insets.bottom + 16, 24),
                opacity: ctaOpacity,
              },
            ]}
          >
            {/* Bouton principal Commencer -> Déclenche les slides d'introduction */}
            <Button
              label={t('commencer')}
              onPress={() => setPhase('slides')}
            />

            {/* Lien secondaire pour se connecter directement */}
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.replace('/login')}
              activeOpacity={0.7}
            >
              <Text style={styles.loginLinkPrefix}>{t('deja_compte')} </Text>
              <Text style={styles.loginLinkHighlight}>{t('se_connecter')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* =========================================================================
          PHASE 2 : LES 3 SLIDES D'INTRODUCTION (CARROUSEL PÉDAGOGIQUE)
          ========================================================================= */}
      {phase === 'slides' && (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 24, 32) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Barre de navigation d'introduction : Étape et Bouton Passer */}
          <View
            style={[
              styles.slideHeader,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Text style={styles.slideStepLabel}>
              0{activeSlide + 1} / 0{slides.length}
            </Text>
            <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
              <Text style={styles.skipButtonText}>{t('passer')}</Text>
            </TouchableOpacity>
          </View>

          {/* Carte Principale du Slide */}
          <View
            style={[
              styles.slideCard,
              { borderTopColor: slides[activeSlide].color, borderTopWidth: 4 },
            ]}
          >
            <View
              style={[
                styles.slideIconWrap,
                { backgroundColor: slides[activeSlide].bg },
              ]}
            >
              <Ionicons
                name={slides[activeSlide].icon}
                size={44}
                color={slides[activeSlide].color}
              />
            </View>

            <Text
              style={[
                styles.slideTitle,
                { textAlign: isRTL ? 'right' : 'left' },
              ]}
            >
              {slides[activeSlide].title}
            </Text>

            <Text
              style={[
                styles.slideDesc,
                { textAlign: isRTL ? 'right' : 'left' },
              ]}
            >
              {slides[activeSlide].desc}
            </Text>

            {/* Puces récapitulatives */}
            <View style={styles.bulletList}>
              <View
                style={[
                  styles.bulletItem,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={slides[activeSlide].color}
                />
                <Text
                  style={[
                    styles.bulletText,
                    { textAlign: isRTL ? 'right' : 'left' },
                  ]}
                >
                  {slides[activeSlide].bullet1}
                </Text>
              </View>
              <View
                style={[
                  styles.bulletItem,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={slides[activeSlide].color}
                />
                <Text
                  style={[
                    styles.bulletText,
                    { textAlign: isRTL ? 'right' : 'left' },
                  ]}
                >
                  {slides[activeSlide].bullet2}
                </Text>
              </View>
            </View>
          </View>

          {/* Indicateur de Progression (Dots) */}
          <View style={styles.dotsRow}>
            {slides.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx === activeSlide && styles.dotActive,
                  idx === activeSlide && {
                    backgroundColor: slides[activeSlide].color,
                  },
                ]}
              />
            ))}
          </View>

          {/* Boutons d'Action du Slide */}
          <View style={styles.ctaGroup}>
            <Button
              label={
                activeSlide === slides.length - 1
                  ? t('choisir_type_compte')
                  : t('suivant')
              }
              onPress={handleNextSlide}
            />

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.replace('/login')}
              activeOpacity={0.7}
            >
              <Text style={styles.loginLinkPrefix}>{t('deja_compte')} </Text>
              <Text style={styles.loginLinkHighlight}>{t('se_connecter')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* =========================================================================
          PHASE 3 : SÉLECTION DU TYPE DE COMPTE (PERSONNEL VS FAMILLE)
          ========================================================================= */}
      {phase === 'select_type' && (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 24, 32) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
            MASROUF · {isRTL ? 'اختيار نوع الحساب' : 'CHOIX DU COMPTE'}
          </Eyebrow>

          <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('choisir_type_compte')}
          </SectionTitle>

          <Body style={{ textAlign: isRTL ? 'right' : 'left', marginBottom: 20 }}>
            {t('choisir_type_compte_desc')}
          </Body>

          {/* CARTE 1 : COMPTE PERSONNEL */}
          <TouchableOpacity
            style={styles.accountCard}
            onPress={() => handleSelectAccount('personal')}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.accountCardHeader,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <View
                style={[styles.accountIconWrap, { backgroundColor: '#EAF7F0' }]}
              >
                <Ionicons name="person" size={26} color={colors.forest} />
              </View>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <View
                  style={[
                    styles.titleRow,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <Text style={styles.accountTitle}>
                    {t('compte_personnel_titre')}
                  </Text>
                  <View style={styles.personalBadge}>
                    <Text style={styles.badgeText}>
                      {t('compte_personnel_badge')}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.accountSubtitle,
                    { textAlign: isRTL ? 'right' : 'left' },
                  ]}
                >
                  {t('compte_personnel_desc')}
                </Text>
              </View>
            </View>

            <View style={styles.featureDivider} />

            <View style={styles.featureList}>
              <View
                style={[
                  styles.featureItem,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <Ionicons name="checkmark-sharp" size={16} color={colors.forest} />
                <Text
                  style={[
                    styles.featureText,
                    { textAlign: isRTL ? 'right' : 'left' },
                  ]}
                >
                  {isRTL ? 'إدارة مالية فردية ومستقلة' : 'Gestion financière individuelle et autonome'}
                </Text>
              </View>
              <View
                style={[
                  styles.featureItem,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <Ionicons name="checkmark-sharp" size={16} color={colors.forest} />
                <Text
                  style={[
                    styles.featureText,
                    { textAlign: isRTL ? 'right' : 'left' },
                  ]}
                >
                  {isRTL ? 'مشتريات، نفقات يومية وميزانيات شهرية' : 'Achats, dépenses quotidiennes et enveloppes budgétaires'}
                </Text>
              </View>
              <View
                style={[
                  styles.featureItem,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <Ionicons name="checkmark-sharp" size={16} color={colors.forest} />
                <Text
                  style={[
                    styles.featureText,
                    { textAlign: isRTL ? 'right' : 'left' },
                  ]}
                >
                  {isRTL ? 'تتبع الأسعار الفردية ومؤشرات التوفير' : 'Suivi des prix unitaires et économies'}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.cardActionRow,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <Text style={styles.cardActionText}>
                {t('choisir_compte_personnel')}
              </Text>
              <Ionicons
                name={isRTL ? 'arrow-back' : 'arrow-forward'}
                size={18}
                color={colors.forest}
              />
            </View>
          </TouchableOpacity>

          {/* CARTE 2 : COMPTE FAMILLE (PARENT) */}
          <TouchableOpacity
            style={[styles.accountCard, styles.accountCardFeatured]}
            onPress={() => handleSelectAccount('family')}
            activeOpacity={0.85}
          >
            <View style={styles.featuredRibbon}>
              <Ionicons name="star" size={12} color={colors.white} />
              <Text style={styles.ribbonText}>
                {isRTL ? 'الخيار العائلي' : 'EXPÉRIENCE COMPLÈTE'}
              </Text>
            </View>

            <View
              style={[
                styles.accountCardHeader,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <View
                style={[styles.accountIconWrap, { backgroundColor: '#E3F2FD' }]}
              >
                <Ionicons name="people" size={26} color="#1565C0" />
              </View>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <View
                  style={[
                    styles.titleRow,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <Text style={styles.accountTitle}>
                    {t('compte_famille_titre')}
                  </Text>
                  <View style={styles.familyBadge}>
                    <Text style={[styles.badgeText, { color: '#0D47A1' }]}>
                      {t('compte_famille_badge')}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.accountSubtitle,
                    { textAlign: isRTL ? 'right' : 'left' },
                  ]}
                >
                  {t('compte_famille_desc')}
                </Text>
              </View>
            </View>

            <View style={styles.featureDivider} />

            <View style={styles.featureList}>
              <View
                style={[
                  styles.featureItem,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <Ionicons name="checkmark-sharp" size={16} color="#1565C0" />
                <Text
                  style={[
                    styles.featureText,
                    { textAlign: isRTL ? 'right' : 'left' },
                  ]}
                >
                  {isRTL ? 'مساحة شخصية + مساحة عائلية موحدة' : 'Espace Personnel + Espace Familial'}
                </Text>
              </View>
              <View
                style={[
                  styles.featureItem,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <Ionicons name="checkmark-sharp" size={16} color="#1565C0" />
                <Text
                  style={[
                    styles.featureText,
                    { textAlign: isRTL ? 'right' : 'left' },
                  ]}
                >
                  {isRTL ? 'إنشاء حسابات مستقلة للأبناء بكلمات سر مؤقتة' : 'Création de comptes enfants avec accès sécurisé'}
                </Text>
              </View>
              <View
                style={[
                  styles.featureItem,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <Ionicons name="checkmark-sharp" size={16} color="#1565C0" />
                <Text
                  style={[
                    styles.featureText,
                    { textAlign: isRTL ? 'right' : 'left' },
                  ]}
                >
                  {isRTL ? 'احتياطي عائلي، تحويل مصروف الجيب وموافقة الطلبات' : 'Réserve familiale, argent de poche & validation des demandes'}
                </Text>
              </View>
              <View
                style={[
                  styles.featureItem,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <Ionicons name="checkmark-sharp" size={16} color="#1565C0" />
                <Text
                  style={[
                    styles.featureText,
                    { textAlign: isRTL ? 'right' : 'left' },
                  ]}
                >
                  {isRTL ? 'ميزانية موحدة ورسوم بيانية شاملة للأسرة' : 'Budgets et rapports analytiques consolidés de la famille'}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.cardActionRow,
                { borderTopColor: '#BBDEFB', flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <Text style={[styles.cardActionText, { color: '#1565C0' }]}>
                {t('choisir_compte_famille')}
              </Text>
              <Ionicons
                name={isRTL ? 'arrow-back' : 'arrow-forward'}
                size={18}
                color="#1565C0"
              />
            </View>
          </TouchableOpacity>

          {/* Lien de connexion pour utilisateur déjà inscrit */}
          <TouchableOpacity
            style={[styles.loginLink, { marginTop: 16 }]}
            onPress={() => router.replace('/login')}
            activeOpacity={0.7}
          >
            <Text style={styles.loginLinkPrefix}>{t('deja_compte')} </Text>
            <Text style={styles.loginLinkHighlight}>{t('se_connecter')}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

// Styles graphiques harmonisés avec la charte Masrouf
const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#FBFAF6',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: -20,
  },
  logoWrap: {
    marginBottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    alignItems: 'center',
  },
  welcomePrefixText: {
    color: colors.deepGreen,
    fontWeight: '400',
    letterSpacing: 0.3,
    marginBottom: 4,
    textAlign: 'center',
  },
  brandTitleText: {
    color: colors.forest,
    fontWeight: '800',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  underlineContainer: {
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    paddingHorizontal: 24,
    gap: 12,
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  loginLinkPrefix: {
    fontSize: 14,
    color: colors.gray,
  },
  loginLinkHighlight: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.forest,
    textDecorationLine: 'underline',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  slideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8,
  },
  slideStepLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.forest,
    letterSpacing: 1,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  slideCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E8ECEF',
  },
  slideIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  slideTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.forest,
    marginBottom: 10,
  },
  slideDesc: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 22,
    marginBottom: 20,
  },
  bulletList: {
    width: '100%',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F8',
    paddingTop: 16,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bulletText: {
    fontSize: 13,
    color: '#2D3748',
    fontWeight: '500',
    flex: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CBD5E1',
  },
  dotActive: {
    width: 24,
    height: 10,
    borderRadius: 5,
  },
  ctaGroup: {
    marginTop: 10,
    gap: 12,
  },
  accountCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  accountCardFeatured: {
    borderColor: '#1976D2',
    backgroundColor: '#FAFBFD',
  },
  featuredRibbon: {
    position: 'absolute',
    top: -10,
    right: 18,
    backgroundColor: '#1565C0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  ribbonText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  accountCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  accountIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  accountTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.forest,
  },
  personalBadge: {
    backgroundColor: '#EAF7F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  familyBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.forest,
  },
  accountSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  featureDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  featureList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
    flex: 1,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cardActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.forest,
  },
});
