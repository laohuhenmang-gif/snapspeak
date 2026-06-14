import AsyncStorage from '@react-native-async-storage/async-storage';

const STATE_KEY = '@snapspeak_app_state';
const PENDING_ACTIONS_KEY = '@snapspeak_pending_actions';

export interface AppState {
  lastScreen: string;
  lastMessageId: string | null;
  pendingInput: string;
  timestamp: number;
}

export async function saveAppState(state: Partial<AppState>): Promise<void> {
  try {
    const existing = await loadAppState();
    const merged = { ...existing, ...state, timestamp: Date.now() };
    await AsyncStorage.setItem(STATE_KEY, JSON.stringify(merged));
  } catch {}
}

export async function loadAppState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { lastScreen: 'index', lastMessageId: null, pendingInput: '', timestamp: 0 };
}

export async function clearAppState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STATE_KEY);
  } catch {}
}

export async function savePendingActions(actions: any[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(actions));
  } catch {}
}

export async function loadPendingActions(): Promise<any[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_ACTIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export async function clearPendingActions(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_ACTIONS_KEY);
  } catch {}
}

export async function hasUnsavedState(): Promise<boolean> {
  try {
    const state = await loadAppState();
    const actions = await loadPendingActions();
    return (state.pendingInput.length > 0 || actions.length > 0) &&
           (Date.now() - state.timestamp < 24 * 60 * 60 * 1000);
  } catch {
    return false;
  }
}
