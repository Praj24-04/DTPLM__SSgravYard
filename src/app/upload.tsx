import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, categories } from '../theme';
import { analyzeScreenshot, AIResult } from '../ai';
import { saveEntry } from '../storage';
import { ApiKeyModal } from '../components/ApiKeyModal';

export default function Upload() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string>('ideas');
  const [apiKeyModalVisible, setApiKeyModalVisible] = useState(false);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert('Gallery access is needed to select a screenshot.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      base64: false,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setAiResult(null);
      setIsSaved(false);
      setShowCategoryPicker(false);

      // Immediately run AI understanding & auto-categorization
      processImageWithAI(asset.uri, asset.base64 ?? undefined);
    }
  };

  const processImageWithAI = async (uri: string, base64Data?: string) => {
    setAnalyzing(true);
    try {
      // 1. AI analyzes the screenshot
      const result = await analyzeScreenshot(uri, base64Data);
      setAiResult(result);
      setCurrentCategory(result.category);

      // 2. AUTOMATICALLY save immediately - NO manual human selection required!
      const entryId = Date.now().toString();
      await saveEntry({
        id: entryId,
        imageUri: uri,
        category: result.category,
        categoryLabel: result.categoryLabel,
        intent: result.intent,
        summary: result.summary,
        tags: result.tags,
        createdAt: Date.now(),
        confirmedByUser: true,
      });

      setSavedEntryId(entryId);
      setIsSaved(true);
    } catch (err) {
      console.warn('Analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleManualCategoryChange = async (catId: string) => {
    setCurrentCategory(catId);
    const catLabel = categories.find((c) => c.id === catId)?.label ?? 'Ideas & Notes';
    if (imageUri && savedEntryId) {
      await saveEntry({
        id: savedEntryId,
        imageUri,
        category: catId,
        categoryLabel: catLabel,
        intent: aiResult?.intent ?? 'Saved screenshot',
        summary: aiResult?.summary ?? '',
        tags: aiResult?.tags ?? [],
        createdAt: Date.now(),
        confirmedByUser: true,
      });
      if (aiResult) {
        setAiResult({ ...aiResult, category: catId, categoryLabel: catLabel });
      }
    }
  };

  const resetForm = () => {
    setImageUri(null);
    setAiResult(null);
    setIsSaved(false);
    setShowCategoryPicker(false);
  };

  const getCategoryIcon = (catId: string) => {
    const found = categories.find((c) => c.id === catId);
    return found ? found.icon : 'folder-outline';
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Add Screenshot</Text>
          <TouchableOpacity
            style={styles.keyBtn}
            onPress={() => setApiKeyModalVisible(true)}
          >
            <Ionicons name="key-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.keyBtnText}>API Key</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSub}>
          Select any screenshot. AI will automatically understand, categorize, and save it.
        </Text>
      </View>

      {!imageUri ? (
        /* Empty / Picker State */
        <Pressable style={styles.dropZone} onPress={pickImage}>
          <View style={styles.uploadIconCircle}>
            <Ionicons name="cloud-upload-outline" size={36} color={colors.primary} />
          </View>
          <Text style={styles.dropTitle}>Choose from Gallery</Text>
          <Text style={styles.dropSub}>PNG, JPG, or WEBP screenshots</Text>
          <View style={styles.selectBtn}>
            <Ionicons name="image-outline" size={16} color="#FFFFFF" />
            <Text style={styles.selectBtnText}>Select Screenshot</Text>
          </View>
        </Pressable>
      ) : (
        /* Image Preview & AI Status */
        <View style={styles.activeContent}>
          <View style={styles.previewCard}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />

            {/* Analyzing Overlay */}
            {analyzing && (
              <View style={styles.analyzingOverlay}>
                <View style={styles.analyzingBadge}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.analyzingText}>AI is understanding image...</Text>
                </View>
              </View>
            )}
          </View>

          {/* AI Result & Auto-Saved Confirmation */}
          {isSaved && aiResult && (
            <View style={styles.resultCard}>
              {!aiResult.isRealAi && (
                <TouchableOpacity
                  style={styles.keyWarningBanner}
                  onPress={() => setApiKeyModalVisible(true)}
                >
                  <Ionicons name="warning-outline" size={16} color={colors.warning} />
                  <Text style={styles.keyWarningText}>
                    Offline fallback used. Tap to connect Gemini API Key for accurate vision.
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.warning} />
                </TouchableOpacity>
              )}

              {/* Success Banner */}
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                <Text style={styles.successBannerText}>
                  {aiResult.isRealAi ? 'Gemini AI Categorized & Saved' : 'Automatically Categorized & Saved'}
                </Text>
              </View>

              {/* Categorization Pill */}
              <View style={styles.detectedCategoryRow}>
                <Text style={styles.sectionLabel}>DETECTED CATEGORY</Text>
                <View style={styles.categoryPill}>
                  <Ionicons
                    name={getCategoryIcon(currentCategory)}
                    size={16}
                    color={colors.primaryDark}
                  />
                  <Text style={styles.categoryPillText}>{aiResult.categoryLabel}</Text>
                </View>
              </View>

              {/* Detected Intent */}
              <View style={styles.infoSection}>
                <Text style={styles.sectionLabel}>DETECTED INTENT</Text>
                <Text style={styles.intentText}>{aiResult.intent}</Text>
              </View>

              {/* Summary */}
              {aiResult.summary ? (
                <View style={styles.infoSection}>
                  <Text style={styles.sectionLabel}>CONTENT SUMMARY</Text>
                  <Text style={styles.summaryText}>{aiResult.summary}</Text>
                </View>
              ) : null}

              {/* Tags */}
              {aiResult.tags.length > 0 && (
                <View style={styles.infoSection}>
                  <Text style={styles.sectionLabel}>EXTRACTED TAGS</Text>
                  <View style={styles.tagsContainer}>
                    {aiResult.tags.map((tag, idx) => (
                      <View key={idx} style={styles.tagBadge}>
                        <Text style={styles.tagBadgeText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Optional Category Override Toggle */}
              <TouchableOpacity
                style={styles.changeCategoryToggle}
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
              >
                <Ionicons
                  name={showCategoryPicker ? 'chevron-up' : 'options-outline'}
                  size={15}
                  color={colors.textSecondary}
                />
                <Text style={styles.changeCategoryToggleText}>
                  {showCategoryPicker ? 'Hide category options' : 'Change category (optional)'}
                </Text>
              </TouchableOpacity>

              {showCategoryPicker && (
                <View style={styles.categoryList}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.catOption,
                        currentCategory === cat.id && styles.catOptionActive,
                      ]}
                      onPress={() => handleManualCategoryChange(cat.id)}
                    >
                      <Ionicons
                        name={cat.icon}
                        size={16}
                        color={currentCategory === cat.id ? colors.primaryDark : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.catOptionText,
                          currentCategory === cat.id && styles.catOptionTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                      {currentCategory === cat.id && (
                        <Ionicons name="checkmark" size={16} color={colors.primaryDark} style={styles.checkIcon} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Navigation Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={() => router.replace('/')}
                >
                  <Ionicons name="home-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryActionBtnText}>Go to Vault</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryActionBtn}
                  onPress={resetForm}
                >
                  <Ionicons name="add" size={18} color={colors.primaryDark} />
                  <Text style={styles.secondaryActionBtnText}>Add Another</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Change Image Button while analyzing or before finish */}
          {!isSaved && (
            <TouchableOpacity style={styles.repickBtn} onPress={pickImage} disabled={analyzing}>
              <Text style={styles.repickBtnText}>Select a different image</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ApiKeyModal
        visible={apiKeyModalVisible}
        onClose={() => setApiKeyModalVisible(false)}
        onKeySaved={() => {
          if (imageUri) processImageWithAI(imageUri);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 40,
  },

  /* Header */
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  keyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.limeLight,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.limeBorder,
  },
  keyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  headerSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  keyWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warningBg,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  keyWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
    fontWeight: '500',
  },

  /* Drop Zone */
  dropZone: {
    borderWidth: 2,
    borderColor: colors.limeBorder,
    borderStyle: 'dashed',
    borderRadius: 20,
    backgroundColor: colors.surface,
    paddingVertical: 44,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  uploadIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.limeLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.limeBorder,
  },
  dropTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  dropSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 20,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  selectBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },

  /* Active Content */
  activeContent: {
    gap: 16,
  },
  previewCard: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  previewImage: {
    width: '100%',
    height: 240,
  },
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.limeBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  analyzingText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryDark,
  },

  /* Result Card */
  resultCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 14,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.limeLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.limeBorder,
  },
  successBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.limeDark,
  },

  detectedCategoryRow: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.limeLight,
    borderWidth: 1,
    borderColor: colors.limeBorder,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.limeDark,
  },

  infoSection: {
    gap: 4,
  },
  intentText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
  },
  summaryText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  tagBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagBadgeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  /* Category Override */
  changeCategoryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  changeCategoryToggleText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  categoryList: {
    gap: 6,
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 12,
  },
  catOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  catOptionActive: {
    backgroundColor: colors.limeLight,
  },
  catOptionText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  catOptionTextActive: {
    color: colors.limeDark,
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: 'auto',
  },

  /* Action Buttons */
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.limeBorder,
    paddingVertical: 12,
    borderRadius: 12,
  },
  secondaryActionBtnText: {
    color: colors.primaryDark,
    fontWeight: '600',
    fontSize: 13,
  },

  repickBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  repickBtnText: {
    fontSize: 13,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});