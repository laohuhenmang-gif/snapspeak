import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY_KEY = '@snapspeak_ai_key';
const MODEL_KEY = '@snapspeak_ai_model';

export async function getApiKey(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(API_KEY_KEY);
  } catch {
    return null;
  }
}

export async function setApiKey(key: string): Promise<void> {
  await AsyncStorage.setItem(API_KEY_KEY, key);
}

export async function clearApiKey(): Promise<void> {
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
