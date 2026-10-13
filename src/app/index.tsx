import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  Image,
  RefreshControl,
  AppState,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, categories, Category } from '../theme';
import { getAllEntries, seedSampleData, Entry } from '../storage';
import { ApiKeyModal } from '../components/ApiKeyModal';

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [apiKeyModalVisible, setApiKeyModalVisible] = useState(false);

  const load = async () => {
    const all = await getAllEntries();
    setEntries(all);
  };

  useEffect(() => {
    load();
  }, [pathname]);

  useEffect(() => {
    load();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });
    return () => sub.remove();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleSeedSamples = async () => {
    setRefreshing(true);
    const seeded = await seedSampleData();
    setEntries(seeded);
    setRefreshing(false);
  };

  const filtered = activeCategory
    ? entries.filter((e) => e.category === activeCategory)
    : entries;

  const countFor = (catId: string) => entries.filter((e) => e.category === catId).length;

  const allCategories: Array<{ id: string | null; label: string; icon: any }> = [
    { id: null, label: 'All', icon: 'apps-outline' },
    ...categories,
  ];

  const getCategoryIcon = (catId: string) => {
    const found = categories.find((c) => c.id === catId);
    return found ? found.icon : 'folder-outline';
  };

  const formatDate = (timestamp: number) => {
    const diffHours = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandIconWrap}>
            <Ionicons name="sparkles" size={18} color={colors.primary} />
          </View>
          <View>
            <View style={styles.titleWrap}>
              <Text style={styles.headerTitle}>SSgraveYard</Text>
              <View style={styles.badgeLive}>
                <Text style={styles.badgeLiveText}>AI Vault</Text>
              </View>
            </View>
            <Text style={styles.headerSub}>
              {entries.length} screenshot{entries.length !== 1 ? 's' : ''} organized
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={styles.keyHeaderBtn}
            onPress={() => setApiKeyModalVisible(true)}
          >
            <Ionicons name="key-outline" size={17} color={colors.primaryDark} />
          </TouchableOpacity>
          <Pressable
            style={styles.addBtn}
            onPress={() => router.push('/upload')}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>
      </View>

      {/* Quick Stats / Overview Card */}
      {entries.length > 0 && (
        <View style={styles.heroCard}>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{entries.length}</Text>
              <Text style={styles.heroStatLabel}>Total Saved</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>
                {new Set(entries.map((e) => e.category)).size}
              </Text>
              <Text style={styles.heroStatLabel}>Categories</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>Auto</Text>
              <Text style={styles.heroStatLabel}>AI Sorted</Text>
            </View>
          </View>
        </View>
      )}

      {/* Category Filter Chips */}
      <View style={styles.chipsSection}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={allCategories}
          keyExtractor={(item) => String(item.id ?? 'all')}
          contentContainerStyle={styles.chips}
          renderItem={({ item }) => {
            const isActive = activeCategory === item.id;
            return (
              <TouchableOpacity
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setActiveCategory(item.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.icon}
                  size={15}
                  color={isActive ? colors.primaryDark : colors.textSecondary}
                />
                <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                  {item.label}
                </Text>
                {item.id !== null && countFor(item.id) > 0 && (
                  <View style={[styles.chipBadge, isActive && styles.chipBadgeActive]}>
                    <Text
                      style={[
                        styles.chipBadgeText,
                        isActive && styles.chipBadgeTextActive,
                      ]}
                    >
                      {countFor(item.id)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Main Content Feed */}
      {filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="images-outline" size={40} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>
            {activeCategory ? 'No items in this category' : 'No screenshots saved yet'}
          </Text>
          <Text style={styles.emptySub}>
            {activeCategory
              ? 'Select another category or upload a screenshot to organize.'
              : 'Pick a screenshot to have AI automatically categorize, summarize, and tag it.'}
          </Text>

          <View style={styles.emptyActions}>
            <TouchableOpacity
              style={styles.emptyPrimaryBtn}
              onPress={() => router.push('/upload')}
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
              <Text style={styles.emptyPrimaryBtnText}>Upload Screenshot</Text>
            </TouchableOpacity>

            {!activeCategory && (
              <TouchableOpacity
                style={styles.emptySecondaryBtn}
                onPress={handleSeedSamples}
              >
                <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
                <Text style={styles.emptySecondaryBtnText}>Load Sample Data</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: '/detail', params: { id: item.id } })}
            >
              <Image source={{ uri: item.imageUri }} style={styles.thumbnail} resizeMode="cover" />

              <View style={styles.cardContent}>
                <View style={styles.cardTopRow}>
                  <View style={styles.categoryPill}>
                    <Ionicons
                      name={getCategoryIcon(item.category)}
                      size={13}
                      color={colors.primaryDark}
                    />
                    <Text style={styles.categoryPillText}>{item.categoryLabel}</Text>
                  </View>
                  <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                </View>

                <Text style={styles.intentTitle} numberOfLines={2}>
                  {item.intent}
                </Text>

                {item.summary ? (
                  <Text style={styles.summaryText} numberOfLines={2}>
                    {item.summary}
                  </Text>
                ) : null}

                {item.tags.length > 0 && (
                  <View style={styles.tagsRow}>
                    {item.tags.slice(0, 3).map((tag, idx) => (
                      <View key={idx} style={styles.tagPill}>
                        <Text style={styles.tagText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.cardChevron}>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
      <ApiKeyModal
        visible={apiKeyModalVisible}
        onClose={() => setApiKeyModalVisible(false)}
        onKeySaved={load}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyHeaderBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.limeLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.limeBorder,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 14,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.limeLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.limeBorder,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  badgeLive: {
    backgroundColor: colors.limeLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.limeBorder,
  },
  badgeLiveText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.limeDark,
    textTransform: 'uppercase',
  },
  headerSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },

  /* Hero Overview */
  heroCard: {
    marginHorizontal: 18,
    marginTop: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  heroStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  heroStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  heroStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },

  /* Category Filter Chips */
  chipsSection: {
    paddingVertical: 10,
  },
  chips: {
    paddingHorizontal: 18,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.limeLight,
  },
  chipLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  chipLabelActive: {
    color: colors.limeDark,
    fontWeight: '700',
  },
  chipBadge: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  chipBadgeActive: {
    backgroundColor: colors.primary,
  },
  chipBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  chipBadgeTextActive: {
    color: '#FFFFFF',
  },

  /* Empty State */
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.limeLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.limeBorder,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyActions: {
    width: '100%',
    gap: 10,
    alignItems: 'center',
  },
  emptyPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    width: '100%',
    paddingVertical: 13,
    borderRadius: 12,
  },
  emptyPrimaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptySecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.limeBorder,
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptySecondaryBtnText: {
    color: colors.primaryDark,
    fontWeight: '600',
    fontSize: 13,
  },

  /* Feed List */
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  thumbnail: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.limeLight,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.limeDark,
  },
  dateText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  intentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 18,
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tagPill: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  cardChevron: {
    paddingLeft: 4,
  },
});