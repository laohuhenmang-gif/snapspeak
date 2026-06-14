import { useState, useEffect, ReactNode } from 'react';
import { View, ActivityIndicator } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  delay?: number;
}

export default function LazyLoad({ children, fallback, delay = 0 }: Props) {
  const [loaded, setLoaded] = useState(delay === 0);

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setLoaded(true), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  if (!loaded) {
    return fallback || (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <ActivityIndicator size="small" color="#4a90d9" />
      </View>
    );
  }

  return <>{children}</>;
}
