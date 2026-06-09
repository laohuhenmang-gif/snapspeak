import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[SnapSpeak] 未捕获错误:', error, errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>出现了一些问题</Text>
          <Text style={styles.message}>{this.state.error?.message || '未知错误'}</Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>重试</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f5f6fa' },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8, fontFamily: 'monospace' },
  message: { fontSize: 14, color: '#7f8c8d', textAlign: 'center', marginBottom: 24, fontFamily: 'monospace' },
  button: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#3498db' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'monospace' },
});
