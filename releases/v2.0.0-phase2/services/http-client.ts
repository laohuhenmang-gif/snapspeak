import { AIError } from './ai-types';

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_RETRIES = 2;

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } catch (e: any) {
    if (e.name === 'AbortError') {
      throw new AIError(`请求超时（${timeoutMs / 1000}秒），请检查网络后重试`, 'network');
    }
    throw new AIError(`网络连接失败: ${e?.message || '未知错误'}`, 'network');
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = DEFAULT_MAX_RETRIES,
  timeoutMs = DEFAULT_TIMEOUT,
): Promise<Response> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, options, timeoutMs);
      return res;
    } catch (e: any) {
      lastError = e;
      if (e instanceof AIError && e.errorType === 'network' && attempt < maxRetries) {
        // Wait before retry (exponential backoff: 1s, 2s, ...)
        await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
        continue;
      }
      throw e;
    }
  }

  throw lastError;
}
