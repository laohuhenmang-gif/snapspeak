import { Tabs } from 'expo-router';
import { useTheme } from '../../services/theme-context';

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.headerBg },
        headerTintColor: theme.headerText,
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '今日任务', tabBarIcon: () => null }} />
      <Tabs.Screen name="tasks" options={{ title: '全部任务', tabBarIcon: () => null }} />
      <Tabs.Screen name="settings" options={{ title: '设置', tabBarIcon: () => null }} />
    </Tabs>
  );
}
