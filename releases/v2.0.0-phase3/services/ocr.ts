import { getApiKey, getModel, getBaseUrl } from './ai-config';
import { fetchWithTimeout } from './http-client';
import { AIError } from './ai-types';

export interface OCRResult {
  text: string;
  confidence: number;
}

function detectMimeFromBase64(base64: string): string {
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBOR')) return 'image/png';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
}

async function visionOCR(imageBase64: string): Promise<OCRResult> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return { text: '请先在设置中配置 API Key', confidence: 0 };
  }

  const model = await getModel();
  const baseUrl = await getBaseUrl();
  if (!baseUrl) {
    return { text: '请先在设置中配置 API 地址', confidence: 0 };
  }

  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
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
      const errText = await res.text().catch(() => '');
      if (res.status === 401 || res.status === 403) {
        return { text: 'API Key 无效或未授权', confidence: 0 };
      }
      return { text: `OCR 识别失败 (${res.status}): ${errText.slice(0, 100)}`, confidence: 0 };
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';
    if (!text) return { text: 'OCR 未能识别到文字', confidence: 0 };
    return { text, confidence: 0.9 };
  } catch (e: any) {
    return { text: `OCR 请求失败: ${e.message}`, confidence: 0 };
  }
}

let currentOCR = visionOCR;

export function setOCRProvider(provider: typeof visionOCR) {
  currentOCR = provider;
}

export async function recognizeText(imageBase64: string): Promise<OCRResult> {
  return currentOCR(imageBase64);
}
