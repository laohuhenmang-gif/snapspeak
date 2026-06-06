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
          borderTopColor: theme.border,
          borderRadius: 20,
          marginHorizontal: 12,
          marginBottom: 12,
          paddingTop: 6,
          paddingBottom: 6,
          height: 60,
          elevation: 4,
          shadowColor: '#7C5CFC',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
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
