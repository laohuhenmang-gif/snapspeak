import { getApiKey, getModel } from './ai-config';

export interface OCRResult {
  text: string;
  confidence: number;
}

const DEEPSEEK_API = 'https://api.deepseek.com/chat/completions';

async function deepseekVisionOCR(imageBase64: string): Promise<OCRResult> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return { text: '请先在设置中配置 DeepSeek API Key', confidence: 0 };
  }
  const model = await getModel();

  try {
    const res = await fetch(DEEPSEEK_API, {
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
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 2048,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
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
