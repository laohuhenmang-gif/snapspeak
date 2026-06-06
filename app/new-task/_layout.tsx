import { Stack } from 'expo-router';

export default function NewTaskLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="voice" />
      <Stack.Screen name="camera" />
      <Stack.Screen name="confirm" />
    </Stack>
  );
}
