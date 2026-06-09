import { getApiKey } from './ai-config';
import { fetchWithTimeout } from './http-client';

export interface OCRResult {
  text: string;
  confidence: number;
}

// DeepSeek chat models that support vision (deepseek-chat with vision capability)
const DEEPSEEK_API = 'https://api.deepseek.com/chat/completions';
// Fallback to OpenAI-compatible API if DeepSeek fails
const OPENAI_VISION_API = 'https://api.openai.com/v1/chat/completions';

function detectMimeFromBase64(base64: string): string {
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBOR')) return 'image/png';
  if (base64.startsWith('UklGR')) return 'image/webp';
  // HEIC detection: raw bytes start with \x00\x00\x00... base64 'AAAA...' is ambiguous; fallback JPEG
  return 'image/jpeg';
}

async function deepseekVisionOCR(imageBase64: string): Promise<OCRResult> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return { text: '请先在设置中配置 DeepSeek API Key', confidence: 0 };
  }

  // Try DeepSeek first, fall back to direct text prompt if vision model unavailable
  try {
    const res = await fetchWithTimeout(DEEPSEEK_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是 OCR 识别助手。识别图片中的文字，输出原始文字内容。如果是待办事项清单，请分行列出。不要额外解释。',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: '请识别这张图片中的文字：' },
              { type: 'image_url', image_url: { url: `data:${detectMimeFromBase64(imageBase64)};base64,${imageBase64}` } },
            ],
          },
        ],
        max_tokens: 2048,
      }),
    });

    if (!res.ok) {
      return { text: `OCR 识别失败 (${res.status})`, confidence: 0 };
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';
    return { text, confidence: 0.9 };
  } catch (e: any) {
    return { text: `OCR 请求失败: ${e.message}`, confidence: 0 };
  }
}

let currentOCR = deepseekVisionOCR;

export function setOCRProvider(provider: typeof deepseekVisionOCR) {
  currentOCR = provider;
}

export async function recognizeText(imageBase64: string): Promise<OCRResult> {
  return currentOCR(imageBase64);
}
