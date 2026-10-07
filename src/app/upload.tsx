import { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { colors } from './theme';

export default function Upload() {
    const router = useRouter();
    const [imageUri, setImageUri] = useState(null);
    const [loading, setLoading] = useState(false);
    const [suggestedCategory, setSuggestedCategory] = useState(null);

    const pickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            alert('Gallery access is needed to pick a screenshot.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 1,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
            setSuggestedCategory(null);
            simulateAnalysis(); // placeholder until OCR is wired in (next step)
        }
    };

    const simulateAnalysis = () => {
        setLoading(true);
        setTimeout(() => {
            setSuggestedCategory('Places to Try'); // placeholder result
            setLoading(false);
        }, 1200);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Add a Screenshot</Text>

            {!imageUri && (
                <Pressable style={styles.pickButton} onPress={pickImage}>
                    <Text style={styles.pickButtonText}>📁 Choose from Gallery</Text>
                </Pressable>
            )}

            {imageUri && (
                <>
                    <Image source={{ uri: imageUri }} style={styles.preview} />

                    {loading ? (
                        <View style={styles.statusRow}>
                            <ActivityIndicator color={colors.primary} />
                            <Text style={styles.statusText}>Analyzing screenshot...</Text>
                        </View>
                    ) : (
                        suggestedCategory && (
                            <View style={styles.resultBox}>
                                <Text style={styles.resultLabel}>Suggested category</Text>
                                <Text style={styles.resultValue}>{suggestedCategory}</Text>
                            </View>
                        )
                    )}

                    <Pressable style={styles.pickButton} onPress={pickImage}>
                        <Text style={styles.pickButtonText}>Choose a different image</Text>
                    </Pressable>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 60, alignItems: 'center' },
    header: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 20 },
    pickButton: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 14,
        marginTop: 16,
    },
    pickButtonText: { color: colors.text, fontWeight: '500' },
    preview: { width: 260, height: 260, borderRadius: 14, marginTop: 10 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
    statusText: { color: colors.subtext },
    resultBox: {
        marginTop: 16,
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 14,
        width: '100%',
        borderWidth: 1,
        borderColor: colors.border,
    },
    resultLabel: { color: colors.subtext, fontSize: 12 },
    resultValue: { color: colors.primary, fontSize: 18, fontWeight: '700', marginTop: 4 },
});