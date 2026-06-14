import { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, PanResponder } from 'react-native';
import { useTheme } from '../services/theme-context';
import PriorityBadge from './PriorityBadge';
import type { Task } from '../types';

interface Props {
  task: Task;
  onPress: () => void;
  onComplete: () => void;
  onDelete: () => void;
}

export default function SwipeableTask({ task, onPress, onComplete, onDelete }: Props) {
  const { theme } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(Math.max(g.dx, -120));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -80) {
          Animated.spring(translateX, { toValue: -120, useNativeDriver: true }).start();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.actions, { backgroundColor: theme.surface }]}>
        <Text
          style={[styles.actionText, { color: theme.success }]}
          onPress={() => { translateX.setValue(0); onComplete(); }}
        >
          {task.completed ? '↩ 撤销' : '✅ 完成'}
        </Text>
        <Text
          style={[styles.actionText, { color: theme.error }]}
          onPress={() => { translateX.setValue(0); onDelete(); }}
        >
          🗑 删除
        </Text>
      </View>
      <Animated.View
        style={[styles.taskRow, { borderColor: theme.pixelBorder, backgroundColor: theme.surface, transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity style={styles.checkBtn} onPress={onPress}>
          <Text style={{ fontFamily: 'monospace', fontSize: 16 }}>
            {task.completed ? '✅' : '⬜'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} onPress={onPress}>
          <Text
            style={[styles.taskTitle, { color: theme.text, textDecorationLine: task.completed ? 'line-through' : 'none' }]}
            numberOfLines={1}
          >
            {task.title}
          </Text>
          <Text style={{ color: theme.textMuted, fontFamily: 'monospace', fontSize: 11 }}>
            {task.datetime?.slice(0, 16).replace('T', ' ') || '未设时间'} · {task.category}
          </Text>
        </TouchableOpacity>
        <PriorityBadge priority={task.priority} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 6 },
  actions: { position: 'absolute', right: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, borderWidth: 2, borderColor: '#000' },
  actionText: { fontFamily: 'monospace', fontSize: 12, fontWeight: '700' },
  taskRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, padding: 10 },
  checkBtn: { marginRight: 8, padding: 2 },
  taskTitle: { fontFamily: 'monospace', fontSize: 13, fontWeight: '600' },
});
