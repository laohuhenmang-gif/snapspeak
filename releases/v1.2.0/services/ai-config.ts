import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export type AIProvider = 'deepseek' | 'openai' | 'custom' | 'agnes';

const API_KEY_KEY = '@snapspeak_ai_key';
const MODEL_KEY = '@snapspeak_ai_model';
const PROVIDER_KEY = '@snapspeak_ai_provider';
const CUSTOM_BASE_URL_KEY = '@snapspeak_ai_custom_url';
const MIGRATED_FLAG_KEY = '@snapspeak_key_migrated';
const PERSONA_KEY = '@snapspeak_persona';

const PROVIDER_BASE_URLS: Record<string, string> = {
  deepseek: 'https://api.deepseek.com',
  openai: 'https://api.openai.com/v1',
  agnes: 'https://api.agnes-ai.com/api',
  custom: '',
};

const VALID_PROVIDERS = new Set(['deepseek', 'openai', 'custom', 'agnes']);

export async function getApiKey(): Promise<string | null> {
  try {
    const secure = await SecureStore.getItemAsync(API_KEY_KEY).catch(() => null);
    if (secure) return secure;

    const migrated = await AsyncStorage.getItem(MIGRATED_FLAG_KEY);
    if (migrated) return null;

    const legacy = await AsyncStorage.getItem(API_KEY_KEY);
    if (legacy) {
      await SecureStore.setItemAsync(API_KEY_KEY, legacy);
      await AsyncStorage.setItem(MIGRATED_FLAG_KEY, 'true');
      await AsyncStorage.removeItem(API_KEY_KEY);
    }
    return legacy;
  } catch {
    return null;
  }
}

export async function setApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(API_KEY_KEY, key);
  await AsyncStorage.removeItem(API_KEY_KEY);
  await AsyncStorage.setItem(MIGRATED_FLAG_KEY, 'true');
}

export async function clearApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(API_KEY_KEY).catch(() => {});
  await AsyncStorage.removeItem(API_KEY_KEY);
}

export async function getModel(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(MODEL_KEY)) || 'deepseek-chat';
  } catch {
    return 'deepseek-chat';
  }
}

export async function setModel(model: string): Promise<void> {
  await AsyncStorage.setItem(MODEL_KEY, model);
}

export async function getProvider(): Promise<AIProvider> {
  try {
    const val = await AsyncStorage.getItem(PROVIDER_KEY);
    if (val && VALID_PROVIDERS.has(val as AIProvider)) {
      return val as AIProvider;
    }
    return 'deepseek';
  } catch {
    return 'deepseek';
  }
}

export async function setProvider(provider: AIProvider): Promise<void> {
  await AsyncStorage.setItem(PROVIDER_KEY, provider);
}

export async function getBaseUrl(): Promise<string> {
  const provider = await getProvider();
  if (provider === 'custom') {
    return (await AsyncStorage.getItem(CUSTOM_BASE_URL_KEY)) || '';
  }
  return PROVIDER_BASE_URLS[provider] || '';
}

export async function setCustomBaseUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(CUSTOM_BASE_URL_KEY, url);
}

export async function getPersona(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(PERSONA_KEY)) || 'assistant';
  } catch {
    return 'assistant';
  }
}

export async function setPersona(persona: string): Promise<void> {
  await AsyncStorage.setItem(PERSONA_KEY, persona);
}

export async function getProviderModels(): Promise<readonly { id: string; label: string }[]> {
  const provider = await getProvider();
  switch (provider) {
    case 'deepseek':
      return [
        { id: 'deepseek-chat', label: 'DeepSeek Chat' },
        { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
        { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
        { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
      ];
    case 'openai':
      return [
        { id: 'gpt-4o', label: 'GPT-4o' },
        { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
        { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
      ];
    case 'agnes':
      return [
        { id: 'deepseek-chat', label: 'DeepSeek Chat' },
        { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
        { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
        { id: 'gpt-4o', label: 'GPT-4o' },
        { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
        { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
        { id: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash (vision)' },
      ];
    case 'custom':
      return [
        { id: 'custom-model', label: '自定义模型（输入模型名）' },
      ];
  }
}
