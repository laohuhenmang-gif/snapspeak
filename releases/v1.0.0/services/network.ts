import NetInfo from '@react-native-community/netinfo';

type NetworkCallback = (isConnected: boolean) => void;

let unsubscribe: (() => void) | null = null;

export function startNetworkMonitor(onChange: NetworkCallback): void {
  stopNetworkMonitor();
  unsubscribe = NetInfo.addEventListener(state => {
    const connected = state.isConnected ?? true;
    onChange(connected);
  });
}

export function stopNetworkMonitor(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

export async function checkNetwork(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected ?? true;
}
