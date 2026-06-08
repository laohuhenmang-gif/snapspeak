import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { loadAllMemories, updateMemory, deleteMemory } from '../services/storage';
import { useTheme } from '../services/theme-context';
import Toast, { toast } from '../components/Toast';
import PixelAvatar from '../components/PixelAvatar';

const MEMORY_TYPE_LABELS: Record<string, string> = {
  preference: '偏好',
  blocker: '卡点',
  rule: '规则',
  habit: '习惯',
  project: '项目',
};

export default function KnowledgeScreen() {
  const { theme } = useTheme();
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const all = await loadAllMemories();
      setMemories(all);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggle = async (m: any) => {
    await updateMemory(m.id, { enabled: !m.enabled });
    toast(m.enabled ? '已禁用' : '已启用', 'info');
    loadData();
  };

  const handleDelete = (m: any) => {
    Alert.alert('确认删除', `删除这条记忆？\n"${m.content}"`, [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
        await deleteMemory(m.id);
        toast('已删除', 'success');
        loadData();
      }},
    ]);
  };

  const handleEdit = (m: any) => {
    setEditingId(m.id);
    setEditText(m.content);
  };

  const handleSaveEdit = async () => {
    if (editingId && editText.trim()) {
      await updateMemory(editingId, { content: editText.trim() });
      toast('已更新', 'success');
      setEditingId(null);
      setEditText('');
      loadData();
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case 'preference': return '#4A90D9';
      case 'blocker': return theme.danger;
      case 'rule': return '#2ECC71';
      case 'habit': return '#F39C12';
      default: return theme.textLight;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backBtn, { color: theme.primary }]}>← 返回</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <PixelAvatar size={20} />
          <Text style={[styles.title, { color: theme.text }]}>知识库</Text>
        </View>
        <View style={{ width: 50 }} />
      </View>

      {loading ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: theme.textLight }]}>加载中…</Text>
        </View>
      ) : memories.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: theme.textLight }]}>暂无记忆</Text>
          <Text style={[styles.emptySubtext, { color: theme.textLight }]}>AI 会在对话中自动学习和记录您的偏好和习惯</Text>
        </View>
      ) : (
        <ScrollView style={styles.list}>
          {memories.map((m) => (
            <View key={m.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, opacity: m.enabled ? 1 : 0.4 }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.typeTag, { backgroundColor: typeColor(m.memory_type) }]}>
                  <Text style={styles.typeText}>{MEMORY_TYPE_LABELS[m.memory_type] || m.memory_type}</Text>
                </View>
                <Text style={[styles.dateText, { color: theme.textLight }]}>
                  {m.created_at?.slice(0, 10)}
                </Text>
                {m.user_confirmed ? (
                  <Text style={[styles.confirmedText, { color: theme.success }]}>已确认</Text>
                ) : null}
              </View>

              {editingId === m.id ? (
                <View>
                  <TextInput
                    style={[styles.editInput, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]}
                    value={editText}
                    onChangeText={setEditText}
                    multiline
                    autoFocus
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity style={[styles.btnSmall, { backgroundColor: theme.primary }]} onPress={handleSaveEdit}>
                      <Text style={styles.btnSmallText}>保存</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btnSmall, { borderColor: theme.border, borderWidth: 1 }]} onPress={() => setEditingId(null)}>
                      <Text style={[styles.btnSmallText, { color: theme.text }]}>取消</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Text style={[styles.content, { color: theme.text }]}>{m.content}</Text>
              )}

              {editingId !== m.id && (
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => handleToggle(m)}>
                    <Text style={[styles.actionText, { color: m.enabled ? theme.warning : theme.success }]}>
                      {m.enabled ? '禁用' : '启用'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleEdit(m)}>
                    <Text style={[styles.actionText, { color: theme.primary }]}>编辑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(m)}>
                    <Text style={[styles.actionText, { color: theme.danger }]}>删除</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#F8F8F8',
  },
  backBtn: { fontSize: 16, fontFamily: 'monospace', fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '800', fontFamily: 'monospace' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 16, fontFamily: 'monospace', marginBottom: 8 },
  emptySubtext: { fontSize: 13, fontFamily: 'monospace', textAlign: 'center', lineHeight: 20 },
  list: { flex: 1, padding: 16 },
  card: { padding: 12, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, backgroundColor: '#FFF' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  typeTag: { paddingHorizontal: 8, paddingVertical: 2 },
  typeText: { color: '#fff', fontSize: 11, fontWeight: '700', fontFamily: 'monospace' },
  dateText: { fontSize: 11, fontFamily: 'monospace' },
  confirmedText: { fontSize: 11, fontFamily: 'monospace', fontWeight: '600' },
  content: { fontSize: 14, fontFamily: 'monospace', lineHeight: 20, marginBottom: 8 },
  cardActions: { flexDirection: 'row', gap: 16, justifyContent: 'flex-end' },
  actionText: { fontSize: 13, fontFamily: 'monospace', fontWeight: '600' },
  editInput: { backgroundColor: '#F5F5F5', padding: 10, fontSize: 14, fontFamily: 'monospace', marginBottom: 8, minHeight: 60 },
  editActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginBottom: 4 },
  btnSmall: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#E0E0E0' },
  btnSmallText: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: 'monospace' },
});
