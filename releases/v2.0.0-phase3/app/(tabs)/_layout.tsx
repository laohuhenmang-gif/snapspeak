import { Tabs } from 'expo-router';
import { useTheme } from '../../services/theme-context';
import { Text } from 'react-native';

export default function TabsLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.pixelBorder,
          borderTopWidth: 2,
          height: 56,
          paddingBottom: 6,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: { fontFamily: 'monospace', fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '今天',
          tabBarIcon: ({ color }) => <Text style={{ fontFamily: 'monospace', fontSize: 18, color }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="all"
        options={{
          title: '全部',
          tabBarIcon: ({ color }) => <Text style={{ fontFamily: 'monospace', fontSize: 18, color }}>📁</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '设置',
          tabBarIcon: ({ color }) => <Text style={{ fontFamily: 'monospace', fontSize: 18, color }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
