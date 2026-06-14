import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useTheme } from '../services/theme-context';

interface Props {
  visible: boolean;
  content: string;
  onClose: () => void;
  onCopy: () => void;
  onForward: () => void;
}

export default function MessageContextMenu({ visible, content, onClose, onCopy, onForward }: Props) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.menu, { backgroundColor: theme.surface, borderColor: theme.pixelBorder }]}>
          <Text style={[styles.preview, { color: theme.textMuted }]} numberOfLines={3}>
            {content}
          </Text>
          <View style={[styles.divider, { backgroundColor: theme.pixelBorder }]} />
          <TouchableOpacity style={styles.item} onPress={() => { onCopy(); onClose(); }}>
            <Text style={[styles.itemText, { color: theme.text }]}>📋 复制文字</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item} onPress={() => { onForward(); onClose(); }}>
            <Text style={[styles.itemText, { color: theme.text }]}>📝 转为新任务</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item} onPress={onClose}>
            <Text style={[styles.itemText, { color: theme.textMuted }]}>取消</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  menu: { width: 220, borderWidth: 2, padding: 4 },
  preview: { fontFamily: 'monospace', fontSize: 11, padding: 10, lineHeight: 16 },
  divider: { height: 1, marginHorizontal: 8 },
  item: { paddingVertical: 10, paddingHorizontal: 12 },
  itemText: { fontFamily: 'monospace', fontSize: 13, fontWeight: '600' },
});
