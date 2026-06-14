import { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import PixelButton from './PixelButton';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: '' };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.setState({ errorInfo: errorInfo?.componentStack || '' });
    const log = `[${new Date().toISOString()}] ${error.message}\n${errorInfo?.componentStack || ''}\n`;
    this.appendLog(log);
  }

  private appendLog(entry: string) {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const LOG_KEY = '@snapspeak_crash_log';
      AsyncStorage.getItem(LOG_KEY).then((prev: string) => {
        AsyncStorage.setItem(LOG_KEY, (prev || '') + entry);
      });
    } catch {}
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: '' });
  };

  handleCopyLog = () => {
    const { error, errorInfo } = this.state;
    const log = `SnapSpeak Crash Log\n${new Date().toISOString()}\n\n${error?.message}\n\n${errorInfo}`;
    try {
      const Clipboard = require('expo-clipboard');
      Clipboard.setStringAsync(log);
    } catch {}
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View style={styles.container}>
          <Text style={styles.icon}>💥</Text>
          <Text style={styles.title}>应用遇到了问题</Text>
          <Text style={styles.message}>{this.state.error?.message || '未知错误'}</Text>
          <ScrollView style={styles.logBox}>
            <Text style={styles.logText}>{this.state.errorInfo}</Text>
          </ScrollView>
          <View style={styles.buttons}>
            <PixelButton title="[重新启动]" onPress={this.handleReset} style={{ flex: 1 }} />
            <PixelButton title="[复制日志]" onPress={this.handleCopyLog} variant="secondary" style={{ flex: 1 }} />
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f5f0e8' },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontFamily: 'monospace', fontSize: 18, fontWeight: '700', color: '#2d2d2d', marginBottom: 8 },
  message: { fontFamily: 'monospace', fontSize: 13, color: '#f44336', textAlign: 'center', marginBottom: 16 },
  logBox: { maxHeight: 200, borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 16, width: '100%' },
  logText: { fontFamily: 'monospace', fontSize: 10, color: '#666' },
  buttons: { flexDirection: 'row', gap: 8, width: '100%' },
});
