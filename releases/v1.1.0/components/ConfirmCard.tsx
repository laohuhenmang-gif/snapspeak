import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../services/theme-context';
import PixelCard from './PixelCard';
import PixelButton from './PixelButton';
import type { AIAction } from '../services/ai-types';

interface Props {
  actions: AIAction[];
  onConfirm: () => void;
  onCancel: () => void;
  onModify?: (index: number, updatedAction: AIAction) => void;
  executing?: boolean;
}

function describeAction(action: AIAction): { emoji: string; summary: string } {
  switch (action.action) {
    case 'create':
      return { emoji: '📝', summary: `创建任务：${action.title}${action.datetime ? ' · ' + new Date(action.datetime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}${action.priority ? ' · [' + action.priority + ']' : ''}` };
    case 'edit':
      return { emoji: '✏️', summary: `修改任务：${action.summary}` };
    case 'delete':
      return { emoji: '🗑️', summary: `删除任务：${action.summary}` };
    case 'complete':
      return { emoji: '✅', summary: `完成任务：${action.summary}` };
    case 'snooze':
      return { emoji: '⏰', summary: `延后提醒：${action.message}` };
    case 'reschedule':
      return { emoji: '📅', summary: `改期：${action.message}` };
    case 'record_blocker':
      return { emoji: '🚧', summary: `记录原因：${action.blocker_reason}` };
    case 'create_reminder':
      return { emoji: '🔔', summary: `创建提醒：${action.message}` };
    case 'create_memory':
      return { emoji: '🧠', summary: `记住：${action.content.slice(0, 50)}` };
    case 'create_plan':
      return { emoji: '📋', summary: `生成新计划：${action.summary}（${action.tasks.length}项）` };
    case 'generate_review':
      return { emoji: '📊', summary: `生成复盘：${action.ai_summary.slice(0, 60)}` };
    case 'batch':
      return { emoji: '📦', summary: `批量操作：${action.summary}（${action.operations.length}项）` };
    default:
      return { emoji: '💬', summary: action.action };
  }
}

function EditPanel({ action, index, onSave, onCancel }: { action: AIAction; index: number; onSave: (i: number, a: AIAction) => void; onCancel: () => void }) {
  const { theme } = useTheme();
  const [title, setTitle] = useState(action.action === 'create' ? action.title : '');
  const [datetime, setDatetime] = useState(action.action === 'create' ? (action.datetime || '').slice(0, 16) : '');
  const [priority, setPriority] = useState(action.action === 'create' ? (action.priority || '中') : '中');

  if (action.action !== 'create') {
    return (
      <View style={{ marginTop: 8, padding: 8, borderWidth: 1, borderColor: theme.textMuted }}>
        <Text style={{ color: theme.textMuted, fontFamily: 'monospace', fontSize: 12 }}>暂不支持编辑此类型操作</Text>
        <PixelButton title="[返回]" onPress={onCancel} variant="secondary" style={{ marginTop: 6 }} />
      </View>
    );
  }

  return (
    <View style={{ marginTop: 8, padding: 8, borderWidth: 1, borderColor: theme.primary }}>
      <Text style={[styles.editLabel, { color: theme.text }]}>标题</Text>
      <TextInput
        style={[styles.editInput, { backgroundColor: theme.surfaceAlt, borderColor: theme.pixelBorder, color: theme.text }]}
        value={title}
        onChangeText={setTitle}
      />
      <Text style={[styles.editLabel, { color: theme.text }]}>时间</Text>
      <TextInput
        style={[styles.editInput, { backgroundColor: theme.surfaceAlt, borderColor: theme.pixelBorder, color: theme.text }]}
        value={datetime}
        onChangeText={setDatetime}
        placeholder="2026-06-14T15:00"
        placeholderTextColor={theme.textMuted}
      />
      <Text style={[styles.editLabel, { color: theme.text }]}>优先级</Text>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
        {(['高', '中', '低'] as const).map(p => (
          <TouchableOpacity
            key={p}
            onPress={() => setPriority(p)}
            style={[styles.option, { borderColor: theme.pixelBorder, backgroundColor: priority === p ? theme.primary : theme.surface }]}
          >
            <Text style={{ color: priority === p ? '#fff' : theme.text, fontFamily: 'monospace', fontSize: 12 }}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <PixelButton title="[保存修改]" onPress={() => {
          onSave(index, { ...action, title, datetime: datetime ? new Date(datetime).toISOString() : undefined, priority: priority as any });
        }} style={{ flex: 1 }} />
        <PixelButton title="[取消]" onPress={onCancel} variant="danger" style={{ flex: 1 }} />
      </View>
    </View>
  );
}

export default function ConfirmCard({ actions, onConfirm, onModify, onCancel, executing }: Props) {
  const { theme } = useTheme();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [localActions, setLocalActions] = useState<AIAction[]>(actions);

  if (localActions.length === 0) return null;

  const handleSaveEdit = (index: number, updated: AIAction) => {
    const next = [...localActions];
    next[index] = updated;
    setLocalActions(next);
    setEditingIndex(null);
    onModify?.(index, updated);
  };

  return (
    <PixelCard style={{ marginBottom: 8, borderColor: theme.primary }}>
      <Text style={[styles.heading, { color: theme.primary }]}>我理解为以下操作：</Text>
      {localActions.map((action, i) => (
        <View key={i}>
          <View style={styles.actionRow}>
            <View style={{ flex: 1 }}>
              {editingIndex === i ? (
                <EditPanel action={action} index={i} onSave={handleSaveEdit} onCancel={() => setEditingIndex(null)} />
              ) : (
                <TouchableOpacity onPress={() => setEditingIndex(i)}>
                  <Text style={[styles.actionText, { color: theme.text }]}>
                    {describeAction(action).emoji} {describeAction(action).summary}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      ))}
      <View style={styles.buttons}>
        <PixelButton title={executing ? '执行中…' : '[确认]'} onPress={onConfirm} disabled={executing} style={{ flex: 1 }} />
        <PixelButton title="[取消]" onPress={onCancel} disabled={executing} variant="danger" style={{ flex: 1 }} />
      </View>
    </PixelCard>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: 'monospace', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  actionRow: { paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  actionText: { fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
  buttons: { flexDirection: 'row', gap: 6, marginTop: 8 },
  editLabel: { fontFamily: 'monospace', fontSize: 11, marginTop: 6, marginBottom: 2 },
  editInput: { borderWidth: 2, padding: 8, fontFamily: 'monospace', fontSize: 12, marginBottom: 6 },
  option: { borderWidth: 2, paddingHorizontal: 10, paddingVertical: 6 },
});
