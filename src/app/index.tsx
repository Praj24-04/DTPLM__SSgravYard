import { View, Text, StyleSheet, FlatList, TouchableOpacity, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, categories } from './theme';

export default function Home() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.header}>📸 SSgraveYard</Text>
      <Text style={styles.subheader}>Your screenshots, organized by intent</Text>

      <FlatList
        data={categories}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.7}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.cardLabel}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />

      <Pressable style={styles.fab} onPress={() => router.push('/upload')}>
        <Text style={styles.fabText}>+ Add Screenshot</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 60 },
  header: { fontSize: 26, fontWeight: '700', color: colors.text },
  subheader: { fontSize: 14, color: colors.subtext, marginTop: 4 },
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    margin: 6,
    paddingVertical: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emoji: { fontSize: 30, marginBottom: 8 },
  cardLabel: { color: colors.text, fontSize: 14, fontWeight: '500' },
  fab: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
  },
  fabText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});