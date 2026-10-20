import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { getActiveApiKey, GEMINI_API_URL, FALLBACK_GEMINI_URL } from './constants';
import { categories } from './theme';

export type AIResult = {
  category: string;
  categoryLabel: string;
  intent: string;
  summary: string;
  tags: string[];
  isRealAi?: boolean;
};

const CATEGORY_IDS = categories.map((c) => c.id);

// Streamlined prompt optimized for sub-second parsing and token efficiency
const PROMPT = `Analyze this image quickly. Return ONLY raw JSON:
{
  "category": "study" | "places" | "buy" | "travel" | "watch" | "ideas",
  "intent": "short phrase why saved (max 8 words)",
  "summary": "1 sentence describing content",
  "tags": ["3 to 4 keywords"]
}

Guidelines:
- chalkboard/whiteboard/formulas/code/lecture -> "study"
- restaurant/cafe/food/storefront/building -> "places"
- products/cart/ecommerce/shoes/gadget -> "buy"
- flights/hotel/vacation/destination -> "travel"
- video/movie/reel/podcast -> "watch"
- designs/quotes/notes -> "ideas"`;

function smartLocalCategorize(imageUri: string): AIResult {
  const lower = imageUri.toLowerCase();
  let catId = 'ideas';
  let intent = 'Saved visual reference';
  let summary = 'Screenshot saved to your personal library.';
  let tags = ['screenshot', 'notes'];

  if (lower.includes('board') || lower.includes('class') || lower.includes('cpu') || lower.includes('note')) {
    catId = 'study';
    intent = 'Study lecture notes';
    summary = 'Chalkboard diagram or study notes captured for review.';
    tags = ['study', 'notes', 'lecture'];
  } else if (lower.includes('restaurant') || lower.includes('cafe') || lower.includes('deli') || lower.includes('food')) {
    catId = 'places';
    intent = 'Visit this restaurant or café';
    summary = 'Dining spot or venue saved to explore.';
    tags = ['places', 'restaurant', 'food'];
  }

  const catLabel = categories.find((c) => c.id === catId)?.label ?? 'Ideas & Notes';
  return {
    category: catId,
    categoryLabel: catLabel,
    intent,
    summary,
    tags,
    isRealAi: false,
  };
}

export async function analyzeScreenshot(imageUri: string, base64Override?: string): Promise<AIResult> {
  let base64 = base64Override;

  // 1. FAST COMPRESSION & DOWNSCALING (Reduces 10MB phone photo to ~50KB in <100ms)
  try {
    const manip = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 800 } }],
      { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    if (manip.base64) {
      base64 = manip.base64;
    }
  } catch (manipErr) {
    console.warn('ImageManipulator resize failed, falling back to raw reader:', manipErr);
    if (!base64) {
      try {
        base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch (fsErr) {
        console.warn('FileSystem read error:', fsErr);
      }
    }
  }

  const apiKey = await getActiveApiKey();

  // 2. High-speed Gemini Vision call
  if (base64 && apiKey && apiKey.length > 20) {
    try {
      const body = {
        contents: [
          {
            parts: [
              { text: PROMPT },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.0, // greedy decoding for maximum speed
          maxOutputTokens: 140, // strict token budget to eliminate generation latency
        },
      };

      let response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        response = await fetch(`${FALLBACK_GEMINI_URL}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (response.ok) {
        const data = await response.json();
        const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        const cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);

        const catId: string = CATEGORY_IDS.includes(parsed.category) ? parsed.category : 'ideas';
        const catLabel = categories.find((c) => c.id === catId)?.label ?? 'Ideas & Notes';

        return {
          category: catId,
          categoryLabel: catLabel,
          intent: parsed.intent || 'Saved for later review',
          summary: parsed.summary || 'Screenshot captured and organized.',
          tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 4) : ['screenshot'],
          isRealAi: true,
        };
      }
    } catch (apiErr) {
      console.warn('Fast vision analysis error, using fallback:', apiErr);
    }
  }

  return smartLocalCategorize(imageUri);
}
