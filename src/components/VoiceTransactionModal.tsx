/**
 * FICHIER : src/components/VoiceTransactionModal.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-056-VOICE-MODAL
 * COMPOSANT : Modal Interactif de Transaction Vocale Intelligente
 *
 * MISSION DU FICHIER :
 * Permettre à tout profil (Utilisateur, Parent, Enfant) d'enregistrer des opérations à la voix :
 * 1. Interface microphone animée (ondes sonores pulsantes).
 * 2. Reconnaissance vocale continue via Web Speech API (sur navigateur/Web) ou phrases de test/saisie vocale assistée.
 * 3. Phrases de test rapides bilingues (FR, Arabe, Derja tunisienne) pour essai immédiat.
 * 4. Aperçu interactif avec modification possible de tous les champs extraits :
 *    - Type d'opération (Achat, Dépense, Allocation).
 *    - Montant numérique (en DT).
 *    - Catégorie sélectionnée.
 *    - Libellé / description.
 *    - Destinataire (si allocation à un enfant).
 *    - Date de l'opération.
 * 5. Validation finale et écriture sécurisée dans SQLite via `actions.applyVoiceTransaction`.
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AlertBanner, Button, Input } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useStore } from '@/state/store';
import type { ParsedVoiceTransaction } from '@/state/types';
import { formatTND } from '@/utils/format';
import { useTranslation } from '@/utils/i18n';
import { detectLanguage, parseVoiceInput, toArabicScript } from '@/utils/voiceParser';

interface VoiceTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Phrases de test multilingues (Français, Arabe, Anglais, Dialecte tunisien, Allocations enfants, Dons)
const SAMPLE_PHRASES = [
  "شريت حليب وخبز بألفين", // Arabe / Tunisien (Achat)
  "J'ai acheté du lait et du pain pour 3 dinars", // Français (Achat)
  "I bought milk and bread for 5 dinars", // Anglais (Achat)
  "J'ai acheté des courses pour 45 dinars", // Français (Achat)
  "دفعت فاتورة الكهرباء 75 دينار", // Arabe standard (Dépense)
  "I paid the internet bill 30 dinars", // Anglais (Dépense)
  "أعطيت 20 دينار ليوسف مصروف", // Don / argent donné à un enfant (Arabe)
  "J'ai donné 25 DT à mon enfant", // Argent donné à un enfant (Français)
  "تبرعت بـ 15 دينار للجمعية", // Don caritatif (Arabe)
  "Donation of 10 dinars for charity", // Don caritatif (Anglais)
];

export function VoiceTransactionModal({
  visible,
  onClose,
  onSuccess,
}: VoiceTransactionModalProps) {
  const { db, me, actions } = useStore();
  const { t, isRTL, langue } = useTranslation();

  // Enfants du foyer pour la détection des allocations
  const childrenList = db.users.filter(
    (u) => u.role === 'child' && (u.parentId === me?.id || u.familyId === me?.familyId)
  );

  const [selectedVoiceLang, setSelectedVoiceLang] = useState<'auto' | 'fr' | 'ar' | 'en'>('auto');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsed, setParsed] = useState<ParsedVoiceTransaction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Détermination du code BCP-47 pour la reconnaissance vocale
  const getRecognitionLangCode = (pref: 'auto' | 'fr' | 'ar' | 'en') => {
    if (pref === 'fr') return 'fr-FR';
    if (pref === 'ar') return 'ar-TN';
    if (pref === 'en') return 'en-US';
    // Mode Auto : se caler sur la langue d'interface active
    if (langue === 'ar') return 'ar-TN';
    if (langue === 'en') return 'en-US';
    return 'fr-FR';
  };

  // Animation pulsante de l'icône microphone
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  // Initialisation Web Speech API si plateforme web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = getRecognitionLangCode(selectedVoiceLang);

        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const rawTranscript = event.results[current][0].transcript;
          // Détection de la langue parlée (FR, AR, EN)
          const detected = selectedVoiceLang !== 'auto' ? selectedVoiceLang : detectLanguage(rawTranscript);
          // Si arabe : retranscription en caractères arabes (convertit l'arabizi si présent)
          // Si français ou anglais : conservation intégrale de l'alphabet latin de la langue parlée
          const formatted = detected === 'ar' ? toArabicScript(rawTranscript) : rawTranscript;
          setTranscript(formatted);
          analyzeText(formatted);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        // Gestion explicite des cas limites : micro refusé, rien entendu, erreur réseau
        recognition.onerror = (event: any) => {
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setError(
              isRTL
                ? 'تم رفض إذن الميكروفون. يرجى تفعيل إذن الوصول في إعدادات الجهاز.'
                : 'Autorisation d’accès au micro refusée. Veuillez activer le microphone dans les paramètres de votre appareil.'
            );
          } else if (event.error === 'no-speech') {
            setError(
              isRTL
                ? 'لم يتم التقاط أي صوت. يرجى التحدث بوضوح وإعادة المحاولة.'
                : 'Rien entendu. Aucun son détecté, veuillez parler distinctement près du micro.'
            );
          } else {
            setError(
              isRTL
                ? 'تعذر التعرف على الصوت. يرجى إعادة المحاولة.'
                : 'Impossible de capturer la voix. Veuillez réessayer.'
            );
          }
        };

        recognitionRef.current = recognition;
      }
    }
  }, [isRTL, selectedVoiceLang, langue]);

  // Déclenchement de l'analyse sémantique dès que le texte change
  const analyzeText = (text: string) => {
    if (!text.trim()) {
      setParsed(null);
      return;
    }
    const detected = selectedVoiceLang !== 'auto' ? selectedVoiceLang : detectLanguage(text);
    const normalized = detected === 'ar' ? toArabicScript(text) : text;
    const result = parseVoiceInput(normalized, db.categories, childrenList);
    if (result && !result.initialAllocationPercent) {
      result.initialAllocationPercent = 5;
    }
    setParsed(result);

    // Détection d'une phrase sans montant : avertir immédiatement l'utilisateur
    if (result && !result.hasAmount) {
      setError(
        isRTL
          ? 'لم يتم العثور على مبلغ في الجملة. يرجى تحديد المبلغ بالدينار (مثال: ألفين، 15 دينار).'
          : 'Phrase sans montant détecté. Veuillez préciser le montant en dinars (ex: 2 dinars, ألفين, 15 دينار).'
      );
    } else {
      setError('');
    }
  };

  // Démarrer / arrêter l'écoute
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
    } else {
      setTranscript('');
      setParsed(null);
      setError('');
      setIsListening(true);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.lang = getRecognitionLangCode(selectedVoiceLang);
          recognitionRef.current.start();
        } catch {
          setIsListening(false);
        }
      } else {
        // Simulation pour mobile / fallback
        setTimeout(() => {
          setIsListening(false);
        }, 3000);
      }
    }
  };

  // Utiliser une phrase d'exemple
  const handleSelectSample = (sample: string) => {
    setTranscript(sample);
    analyzeText(sample);
  };

  // Enregistrer la transaction dans SQLite
  const handleConfirm = async () => {
    if (!parsed) return;

    if (parsed.amount <= 0) {
      setError('Veuillez spécifier un montant valide supérieur à 0.');
      return;
    }

    if (parsed.type === 'allocation' && !parsed.recipientChildId && (me?.role === 'parent' || me?.role === 'admin')) {
      setError('Veuillez sélectionner l’enfant bénéficiaire dans la liste.');
      return;
    }

    setBusy(true);
    setError('');

    const res = await actions.applyVoiceTransaction(parsed);
    setBusy(false);

    if (!res.ok) {
      setError(res.error ?? 'Erreur lors de l’enregistrement de la transaction.');
    } else {
      Alert.alert(
        'Transaction enregistrée !',
        `L’opération "${parsed.title || parsed.label}" de ${formatTND(parsed.amount)} a été enregistrée avec succès dans votre journal SQLite.`
      );
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* En-tête */}
          <View
            style={[
              styles.header,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}
              >
                {t('transaction_vocale')}
              </Text>
              <Text
                style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}
              >
                {isRTL
                  ? 'تحدث بالفرنسية، العربية أو الإنجليزية (FR / AR / EN)'
                  : 'Parlez en Français, Arabe ou Anglais (FR / AR / EN)'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={colors.forest} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
          >
            {error ? (
              <AlertBanner tone="danger" title={t('erreur')} detail={error} />
            ) : null}

            {/* SÉLECTEUR RAPIDE DE LANGUE VOCALE (AUTO, FR, AR, EN) */}
            <View style={[styles.langPillRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.langPill, selectedVoiceLang === 'auto' && styles.langPillActive]}
                onPress={() => setSelectedVoiceLang('auto')}
                activeOpacity={0.8}
              >
                <Text style={[styles.langPillText, selectedVoiceLang === 'auto' && styles.langPillTextActive]}>
                  ✨ Auto
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langPill, selectedVoiceLang === 'fr' && styles.langPillActive]}
                onPress={() => setSelectedVoiceLang('fr')}
                activeOpacity={0.8}
              >
                <Text style={[styles.langPillText, selectedVoiceLang === 'fr' && styles.langPillTextActive]}>
                  🇫🇷 Français
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langPill, selectedVoiceLang === 'ar' && styles.langPillActive]}
                onPress={() => setSelectedVoiceLang('ar')}
                activeOpacity={0.8}
              >
                <Text style={[styles.langPillText, selectedVoiceLang === 'ar' && styles.langPillTextActive]}>
                  🇹🇳 العربية
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langPill, selectedVoiceLang === 'en' && styles.langPillActive]}
                onPress={() => setSelectedVoiceLang('en')}
                activeOpacity={0.8}
              >
                <Text style={[styles.langPillText, selectedVoiceLang === 'en' && styles.langPillTextActive]}>
                  🇬🇧 English
                </Text>
              </TouchableOpacity>
            </View>

            {/* BOUTON MICROPHONE ET ANIMATION */}
            <View style={styles.micContainer}>
              <Animated.View
                style={[
                  styles.micPulseCircle,
                  {
                    transform: [{ scale: pulseAnim }],
                    backgroundColor: isListening
                      ? 'rgba(225, 29, 72, 0.2)'
                      : 'rgba(46, 196, 182, 0.2)',
                  },
                ]}
              />

              <TouchableOpacity
                style={[
                  styles.micButton,
                  isListening && styles.micButtonListening,
                ]}
                onPress={toggleListening}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isListening ? 'mic' : 'mic-outline'}
                  size={36}
                  color={colors.white}
                />
              </TouchableOpacity>

              <Text style={styles.micStatusText}>
                {isListening ? t('ecoute_en_cours') : (isRTL ? 'اضغط للتحدث' : 'Appuyez pour parler')}
              </Text>
            </View>

            {/* CHAMP TEXTE OU TRANSCRIPTION RECONNUE */}
            <View style={styles.transcriptCard}>
              <View style={[styles.transcriptHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.transcriptLabel}>
                  {t('phrase_reconnue')} :
                </Text>

                {parsed?.detectedLanguage && (
                  <View style={[styles.langBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons name="language-outline" size={13} color={colors.forest} />
                    <Text style={styles.langBadgeText}>
                      {parsed.detectedLanguage === 'ar'
                        ? '🇹🇳 العربية'
                        : parsed.detectedLanguage === 'en'
                        ? '🇬🇧 English'
                        : '🇫🇷 Français'}
                    </Text>
                  </View>
                )}
              </View>

              <TextInput
                style={[
                  styles.transcriptInput,
                  { textAlign: isRTL || parsed?.detectedLanguage === 'ar' ? 'right' : 'left' },
                ]}
                value={transcript}
                onChangeText={(txt) => {
                  setTranscript(txt);
                  analyzeText(txt);
                }}
                placeholder={
                  isRTL
                    ? 'مثال: شريت حليب وخبز بألفين...'
                    : "Ex: J'ai acheté du lait pour 2 dinars..."
                }
                multiline
              />
            </View>

            {/* EXEMPLES PRÊTS À L'EMPLOI */}
            <View style={styles.samplesSection}>
              <Text style={styles.samplesLabel}>Phrases d'essai rapides :</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.samplesScroll}
              >
                {SAMPLE_PHRASES.map((sample, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.sampleChip}
                    onPress={() => handleSelectSample(sample)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.sampleChipText}>{sample}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* APERÇU STRUCTURÉ ET 100% MODIFIABLE DE LA TRANSACTION EXTRAITE */}
            {parsed && (
              <View style={styles.previewCard}>
                {/* En-tête de l'aperçu avec icône et titre */}
                <View style={styles.previewHeader}>
                  <Ionicons name="sparkles" size={16} color={colors.mint} />
                  <Text style={styles.previewTitle}>
                    {t('apercu_transaction')} (Modifiable avant validation)
                  </Text>
                </View>

                {/* 1. Type d'opération modifiable tactilement */}
                <Text style={styles.previewSectionLabel}>Type d'opération :</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                  {/* Bouton type Achat */}
                  <TouchableOpacity
                    style={[
                      styles.typeSelectBtn,
                      parsed.type === 'purchase' && styles.typeSelectBtnActive,
                    ]}
                    onPress={() => setParsed((prev) => prev ? { ...prev, type: 'purchase' } : null)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="cart-outline"
                      size={14}
                      color={parsed.type === 'purchase' ? colors.white : colors.forest}
                    />
                    <Text
                      style={[
                        styles.typeSelectBtnText,
                        parsed.type === 'purchase' && styles.typeSelectBtnTextActive,
                      ]}
                    >
                      Achat
                    </Text>
                  </TouchableOpacity>

                  {/* Bouton type Dépense */}
                  <TouchableOpacity
                    style={[
                      styles.typeSelectBtn,
                      parsed.type === 'expense' && styles.typeSelectBtnActive,
                    ]}
                    onPress={() => setParsed((prev) => prev ? { ...prev, type: 'expense' } : null)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="receipt-outline"
                      size={14}
                      color={parsed.type === 'expense' ? colors.white : colors.forest}
                    />
                    <Text
                      style={[
                        styles.typeSelectBtnText,
                        parsed.type === 'expense' && styles.typeSelectBtnTextActive,
                      ]}
                    >
                      Dépense
                    </Text>
                  </TouchableOpacity>

                  {/* Bouton type Don enfant réservé au parent */}
                  {(me?.role === 'parent' || me?.role === 'admin') && (
                    <TouchableOpacity
                      style={[
                        styles.typeSelectBtn,
                        parsed.type === 'allocation' && styles.typeSelectBtnActive,
                      ]}
                      onPress={() =>
                        setParsed((prev) =>
                          prev
                            ? {
                                ...prev,
                                type: 'allocation',
                                needsChildSelection: !prev.recipientChildId,
                              }
                            : null
                        )
                      }
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="gift-outline"
                        size={14}
                        color={parsed.type === 'allocation' ? colors.white : colors.forest}
                      />
                      <Text
                        style={[
                          styles.typeSelectBtnText,
                          parsed.type === 'allocation' && styles.typeSelectBtnTextActive,
                        ]}
                      >
                        Don enfant
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* 2. Montant modifiable */}
                <View style={styles.previewRow}>
                  <Text style={styles.previewFieldLbl}>Montant (TND) :</Text>
                  <TextInput
                    style={styles.editableInput}
                    value={String(parsed.amount)}
                    keyboardType="decimal-pad"
                    onChangeText={(val) => {
                      const num = parseFloat(val.replace(',', '.'));
                      setParsed((prev) => (prev ? { ...prev, amount: isNaN(num) ? 0 : num } : null));
                    }}
                  />
                </View>

                {/* 3. Libellé / Titre de la transaction modifiable */}
                <View style={styles.previewRow}>
                  <Text style={styles.previewFieldLbl}>Libellé :</Text>
                  <TextInput
                    style={[styles.editableInput, { flex: 1, marginLeft: 10, textAlign: 'left' }]}
                    value={parsed.title || parsed.label || ''}
                    onChangeText={(txt) => {
                      setParsed((prev) => (prev ? { ...prev, title: txt, label: txt } : null));
                    }}
                    placeholder="Ex: Lait et pain"
                  />
                </View>

                {/* 4. Catégorie avec mention 'à confirmer' si incertaine et sélecteur rapide */}
                <View style={{ marginVertical: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={styles.previewFieldLbl}>Catégorie :</Text>
                    {parsed.isUncertainCategory && (
                      <View style={styles.uncertainBadge}>
                        <Text style={styles.uncertainBadgeText}>⚠️ À confirmer</Text>
                      </View>
                    )}
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ flexDirection: 'row', gap: 6, paddingVertical: 4 }}
                  >
                    {db.categories.map((c) => {
                      const isSelected = parsed.categoryId === c.id;
                      return (
                        <TouchableOpacity
                          key={c.id}
                          style={[
                            styles.catChip,
                            isSelected && styles.catChipActive,
                          ]}
                          onPress={() =>
                            setParsed((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    categoryId: c.id,
                                    categoryName: c.name,
                                    isUncertainCategory: false,
                                  }
                                : null
                            )
                          }
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.catChipText,
                              isSelected && styles.catChipTextActive,
                            ]}
                          >
                            {c.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Saisie ou modification directe du nom de la catégorie (créée si inexistante) */}
                  <TextInput
                    style={[styles.editableInput, { marginTop: 6, textAlign: isRTL ? 'right' : 'left' }]}
                    value={parsed.categoryName || ''}
                    onChangeText={(catTxt) => {
                      const match = db.categories.find(
                        (c) => c.name.toLowerCase() === catTxt.trim().toLowerCase()
                      );
                      setParsed((prev) =>
                        prev
                          ? {
                              ...prev,
                              categoryId: match ? match.id : 'custom-voice-cat',
                              categoryName: catTxt,
                              isUncertainCategory: false,
                            }
                          : null
                      );
                    }}
                    placeholder="Nom exact de la catégorie..."
                  />

                  {/* Pourcentage d'allocation du budget pour la catégorie ajoutée */}
                  <View style={[styles.previewRow, { marginTop: 6 }]}>
                    <Text style={styles.previewFieldLbl}>
                      {isRTL ? 'نسبة تخصيص الميزانية (%) :' : 'Allocation du budget (%) :'}
                    </Text>
                    <TextInput
                      style={[styles.editableInput, { width: 75, textAlign: 'center' }]}
                      value={String(parsed.initialAllocationPercent ?? 5)}
                      keyboardType="numeric"
                      onChangeText={(pctVal) => {
                        const val = parseInt(pctVal, 10);
                        setParsed((prev) =>
                          prev
                            ? {
                                ...prev,
                                initialAllocationPercent: isNaN(val)
                                  ? 5
                                  : Math.min(100, Math.max(1, val)),
                              }
                            : null
                        );
                      }}
                    />
                  </View>
                </View>

                {/* 5. Date modifiable */}
                <View style={styles.previewRow}>
                  <Text style={styles.previewFieldLbl}>Date (AAAA-MM-JJ) :</Text>
                  <TextInput
                    style={[styles.editableInput, { minWidth: 120 }]}
                    value={parsed.date}
                    onChangeText={(d) => {
                      setParsed((prev) => (prev ? { ...prev, date: d } : null));
                    }}
                  />
                </View>

                {/* 6. Champs spécifiques si Achat / Produit */}
                {parsed.type === 'purchase' && (
                  <View style={{ gap: 8, marginTop: 4 }}>
                    {/* Magasin */}
                    <View style={styles.previewRow}>
                      <Text style={styles.previewFieldLbl}>Magasin :</Text>
                      <TextInput
                        style={[styles.editableInput, { flex: 1, marginLeft: 10, textAlign: 'left' }]}
                        value={parsed.store || ''}
                        onChangeText={(s) => setParsed((prev) => prev ? { ...prev, store: s } : null)}
                        placeholder="Ex: Monoprix, Épicerie..."
                      />
                    </View>

                    {/* Quantité & Unité */}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.previewFieldLbl}>Quantité :</Text>
                        <TextInput
                          style={[styles.editableInput, { textAlign: 'left', marginTop: 4 }]}
                          value={String(parsed.quantity || 1)}
                          keyboardType="decimal-pad"
                          onChangeText={(q) => {
                            const num = parseFloat(q.replace(',', '.'));
                            setParsed((prev) => prev ? { ...prev, quantity: isNaN(num) ? 1 : num } : null);
                          }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.previewFieldLbl}>Unité :</Text>
                        <TextInput
                          style={[styles.editableInput, { textAlign: 'left', marginTop: 4 }]}
                          value={parsed.unit || 'pièce'}
                          onChangeText={(u) => setParsed((prev) => prev ? { ...prev, unit: u } : null)}
                          placeholder="Ex: pièce, kg, L"
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* 7. Destinataire si allocation d'argent à un enfant */}
                {parsed.type === 'allocation' && (
                  <View style={{ marginVertical: 6 }}>
                    <Text style={[styles.previewFieldLbl, { marginBottom: 6 }]}>
                      Bénéficiaire (Enfant) :
                    </Text>

                    {parsed.needsChildSelection && (
                      <View style={styles.childPromptBox}>
                        <Text style={styles.childPromptText}>
                          ⚠️ Plusieurs enfants détectés : veuillez sélectionner l'enfant ci-dessous.
                        </Text>
                      </View>
                    )}

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}
                    >
                      {childrenList.map((ch) => {
                        const isSelected = (parsed.recipientChildId || parsed.childId) === ch.id;
                        return (
                          <TouchableOpacity
                            key={ch.id}
                            style={[
                              styles.childChip,
                              isSelected && styles.childChipActive,
                            ]}
                            onPress={() =>
                              setParsed((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      recipientChildId: ch.id,
                                      childId: ch.id,
                                      childName: ch.name,
                                      needsChildSelection: false,
                                    }
                                  : null
                              )
                            }
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name="person"
                              size={14}
                              color={isSelected ? colors.white : colors.forest}
                            />
                            <Text
                              style={[
                                styles.childChipText,
                                isSelected && styles.childChipTextActive,
                              ]}
                            >
                              {ch.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Bouton de confirmation de la transaction */}
                <View style={{ marginTop: 12 }}>
                  <Button
                    label={t('confirmer_transaction')}
                    onPress={handleConfirm}
                    loading={busy}
                  />
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.forest,
  },
  subtitle: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
  },
  micContainer: {
    alignItems: 'center',
    marginVertical: 14,
  },
  micPulseCircle: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.forest,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  micButtonListening: {
    backgroundColor: '#E11D48',
    shadowColor: '#E11D48',
  },
  micStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.forest,
    marginTop: 10,
  },
  transcriptCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  transcriptLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gray,
    marginBottom: 4,
  },
  transcriptInput: {
    fontSize: 14,
    color: colors.forest,
    fontWeight: '500',
    minHeight: 40,
  },
  samplesSection: {
    marginBottom: 16,
  },
  samplesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gray,
    marginBottom: 8,
  },
  samplesScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  sampleChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sampleChipText: {
    fontSize: 12,
    color: colors.forest,
    fontWeight: '600',
  },
  previewCard: {
    backgroundColor: '#FAFBFD',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    gap: 10,
    marginTop: 6,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.forest,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewFieldLbl: {
    fontSize: 13,
    color: colors.gray,
    fontWeight: '600',
  },
  previewFieldVal: {
    fontSize: 14,
    color: colors.forest,
    fontWeight: '700',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  editableInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 15,
    fontWeight: '800',
    color: colors.forest,
    minWidth: 90,
    textAlign: 'right',
    backgroundColor: colors.white,
  },
  previewSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gray,
    marginTop: 4,
    marginBottom: 4,
  },
  typeSelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeSelectBtnActive: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  typeSelectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.forest,
  },
  typeSelectBtnTextActive: {
    color: colors.white,
  },
  uncertainBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  uncertainBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catChipActive: {
    backgroundColor: colors.mint,
    borderColor: colors.forest,
  },
  catChipText: {
    fontSize: 12,
    color: colors.forest,
    fontWeight: '600',
  },
  catChipTextActive: {
    fontWeight: '800',
    color: colors.forest,
  },
  childPromptBox: {
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
    marginBottom: 6,
  },
  childPromptText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  childChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  childChipActive: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  childChipText: {
    fontSize: 12,
    color: colors.forest,
    fontWeight: '600',
  },
  childChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  langPillRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  langPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  langPillActive: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  langPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.forest,
  },
  langPillTextActive: {
    color: colors.white,
  },
  transcriptHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  langBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  langBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.forest,
  },
});
