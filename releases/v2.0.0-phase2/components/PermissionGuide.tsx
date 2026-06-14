import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../services/theme-context';
import PixelCard from './PixelCard';
import PixelButton from './PixelButton';
import {
  getPermissionsStatus,
  openNotificationSettings,
  requestIgnoreBatteryOptimization,
  openExactAlarmSettings,
} from '../services/native-reminder';

interface Props {
  onStatusChange?: () => void;
}

export default function PermissionGuide({ onStatusChange }: Props) {
  const { theme } = useTheme();
  const [status, setStatus] = useState({ notification: true, battery_optimization: true, exact_alarm: true });

  const refresh = async () => {
    const s = await getPermissionsStatus();
    setStatus(s);
    onStatusChange?.();
  };

  useEffect(() => { refresh(); }, []);

  const allGranted = status.notification && status.battery_optimization && status.exact_alarm;

  if (allGranted) return null;

  return (
    <PixelCard style={{ marginBottom: 12, borderColor: theme.warning }}>
      <Text style={[styles.title, { color: theme.warning }]}>⚠️ 权限设置</Text>
      <Text style={[styles.desc, { color: theme.textMuted }]}>
        为确保提醒可靠触发，请完成以下设置：
      </Text>

      {!status.notification && (
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.text }]}>通知权限</Text>
          <PixelButton title="[开启]" onPress={() => { openNotificationSettings(); setTimeout(refresh, 2000); }} variant="secondary" />
        </View>
      )}

      {!status.battery_optimization && (
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.text }]}>电池优化</Text>
          <PixelButton title="[关闭优化]" onPress={() => { requestIgnoreBatteryOptimization(); setTimeout(refresh, 2000); }} variant="secondary" />
        </View>
      )}

      {!status.exact_alarm && (
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.text }]}>精确闹钟</Text>
          <PixelButton title="[允许]" onPress={() => { openExactAlarmSettings(); setTimeout(refresh, 2000); }} variant="secondary" />
        </View>
      )}

      <PixelButton title="[刷新状态]" onPress={refresh} variant="secondary" style={{ marginTop: 8 }} />
    </PixelCard>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: 'monospace', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  desc: { fontFamily: 'monospace', fontSize: 11, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  label: { fontFamily: 'monospace', fontSize: 12, flex: 1 },
});
