import { useEffect, ReactNode } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

interface Props {
  children: ReactNode;
  delay?: number;
}

export default function AnimatedMessage({ children, delay = 0 }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    const timer = setTimeout(() => {
      opacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
      translateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
