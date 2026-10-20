import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'ss_entries';

export type Entry = {
  id: string;
  userId?: string;        // Scoped to authenticated user
  imageUri: string;
  category: string;       // 'buy' | 'places' | 'travel' | 'watch' | 'study' | 'ideas'
  categoryLabel: string;  // human-readable label
  intent: string;
  summary: string;
  tags: string[];
  createdAt: number;
  confirmedByUser: boolean;
};

export async function getAllEntries(userId?: string): Promise<Entry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as Entry[];
    if (!userId) {
      return all;
    }
    // Return entries created by this user OR generic sample entries
    return all.filter((e) => !e.userId || e.userId === userId || e.id.startsWith('sample-'));
  } catch {
    return [];
  }
}

export async function saveEntry(entry: Entry): Promise<void> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const entries: Entry[] = raw ? JSON.parse(raw) : [];
  // Filter out duplicate ID if re-saving
  const updated = [entry, ...entries.filter((e) => e.id !== entry.id)];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function deleteEntry(id: string): Promise<void> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  const entries: Entry[] = JSON.parse(raw);
  const updated = entries.filter((e) => e.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function updateEntry(id: string, patch: Partial<Entry>): Promise<void> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  const entries: Entry[] = JSON.parse(raw);
  const updated = entries.map((e) => (e.id === id ? { ...e, ...patch } : e));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function getEntriesByCategory(categoryId: string, userId?: string): Promise<Entry[]> {
  const entries = await getAllEntries(userId);
  return entries.filter((e) => e.category === categoryId);
}

export async function searchEntries(query: string, userId?: string): Promise<Entry[]> {
  const entries = await getAllEntries(userId);
  if (!query.trim()) return entries;
  const q = query.toLowerCase();
  return entries.filter(
    (e) =>
      e.intent.toLowerCase().includes(q) ||
      e.summary.toLowerCase().includes(q) ||
      e.categoryLabel.toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q))
  );
}

export async function seedSampleData(userId?: string): Promise<Entry[]> {
  const samples: Entry[] = [
    {
      id: 'sample-1',
      userId,
      imageUri: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80',
      category: 'places',
      categoryLabel: 'Places to Try',
      intent: 'Visit this minimalist café for weekend brunch',
      summary: 'Artisan coffee bar with wooden interior, natural light, and quiet work spaces.',
      tags: ['cafe', 'brunch', 'aesthetic', 'coffee'],
      createdAt: Date.now() - 3600000 * 4,
      confirmedByUser: true,
    },
    {
      id: 'sample-2',
      userId,
      imageUri: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
      category: 'buy',
      categoryLabel: 'Things to Buy',
      intent: 'Compare noise-canceling headphone deals',
      summary: 'Wireless over-ear headphones with 30-hour battery life and spatial audio feature.',
      tags: ['audio', 'tech', 'wishlist', 'deals'],
      createdAt: Date.now() - 3600000 * 24,
      confirmedByUser: true,
    },
    {
      id: 'sample-3',
      userId,
      imageUri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
      category: 'travel',
      categoryLabel: 'Travel',
      intent: 'Bookmark coastal getaway for summer vacation',
      summary: 'Tropical beach cove with crystal clear water and beachside villas.',
      tags: ['vacation', 'beach', 'summer', 'hotel'],
      createdAt: Date.now() - 3600000 * 48,
      confirmedByUser: true,
    },
  ];

  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const existing: Entry[] = raw ? JSON.parse(raw) : [];
  const nonSamples = existing.filter((e) => !e.id.startsWith('sample-'));
  const combined = [...samples, ...nonSamples];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
  return samples;
}

export async function clearAllEntries(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function clearUserEntries(userId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  const entries: Entry[] = JSON.parse(raw);
  const remaining = entries.filter((e) => e.userId !== userId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
}
