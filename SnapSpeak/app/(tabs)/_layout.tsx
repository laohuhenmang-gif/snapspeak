import { Tabs } from 'expo-router';
import { useTheme } from '../../services/theme-context';
import { Feather } from '@expo/vector-icons';

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.headerBg },
        headerTintColor: theme.headerText,
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopWidth: 2, borderTopColor: theme.border,
          borderLeftWidth: 2, borderLeftColor: theme.border,
          borderRightWidth: 2, borderRightColor: theme.border,
          borderBottomWidth: 2, borderBottomColor: theme.border,
          marginHorizontal: 12, marginBottom: 8,
          paddingTop: 4, paddingBottom: 4, height: 56,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', fontFamily: 'monospace' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '今日任务',
          tabBarIcon: ({ color }) => <Feather name="check-circle" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: '全部任务',
          tabBarIcon: ({ color }) => <Feather name="list" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '设置',
          tabBarIcon: ({ color }) => <Feather name="settings" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
