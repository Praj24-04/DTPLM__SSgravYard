import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure your Gemini API key in-app via the API Key button or set EXPO_PUBLIC_GEMINI_API_KEY
export const DEFAULT_GEMINI_API_KEY =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

export const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent';

export const FALLBACK_GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent';

const API_KEY_STORAGE = 'custom_gemini_api_key';

export async function getActiveApiKey(): Promise<string> {
  try {
    const customKey = await AsyncStorage.getItem(API_KEY_STORAGE);
    if (
      customKey &&
      customKey.trim().length > 10 &&
      !customKey.includes('AIzaSyAQ_Ab8')
    ) {
      return customKey.trim();
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_GEMINI_API_KEY;
}

export async function saveCustomApiKey(key: string): Promise<void> {
  await AsyncStorage.setItem(API_KEY_STORAGE, key.trim());
}

export async function verifyApiKey(key: string): Promise<{ success: boolean; message: string }> {
  try {
    const trimmed = key.trim();
    if (!trimmed) {
      return { success: false, message: 'API key is empty.' };
    }
    const res = await fetch(`${GEMINI_API_URL}?key=${trimmed}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hello' }] }],
      }),
    });
    const data = await res.json();
    if (res.ok) {
      return { success: true, message: 'Valid API Key! Gemini Vision is connected.' };
    } else {
      const errMsg = data?.error?.message ?? 'API key rejected by Google.';
      return { success: false, message: errMsg };
    }
  } catch (err: any) {
    return { success: false, message: err?.message ?? 'Network error connecting to Gemini.' };
  }
}
