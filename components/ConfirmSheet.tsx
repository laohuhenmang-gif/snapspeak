import {
  View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView, Platform,
} from 'react-native';
import { useState } from 'react';
import { COLORS, CATEGORY_COLORS, PRIORITY_LABELS, CATEGORY_LABELS, RECURRING_LABELS } from '../constants';
import { AIParseResult, Priority, Category, RecurringRule } from '../types';

interface ConfirmSheetProps {
  visible: boolean;
  result: AIParseResult | null;
  onConfirm: (edited: AIParseResult) => void;
  onCancel: () => void;
  onReparse: (text: string) => void;
}

export default function ConfirmSheet({ visible, result, onConfirm, onCancel, onReparse }: ConfirmSheetProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDatetime, setEditDatetime] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('中');
  const [editCategory, setEditCategory] = useState<Category>('其他');
  const [editRecurring, setEditRecurring] = useState<RecurringRule>('none');
  const [editNotes, setEditNotes] = useState('');

  const openEdit = () => {
    if (!result) return;
    setEditTitle(result.title);
    setEditDatetime(result.datetime?.slice(0, 16) || '');
    setEditPriority(result.priority);
    setEditCategory(result.category);
    setEditRecurring(result.recurring);
    setEditNotes(result.notes);
    setEditing(true);
  };

  const handleConfirm = () => {
    if (!result) return;
    if (editing) {
      const edited: AIParseResult = {
        title: editTitle,
        datetime: editDatetime ? new Date(editDatetime).toISOString() : null,
        priority: editPriority,
        category: editCategory,
        recurring: editRecurring,
        notes: editNotes,
      };
      onConfirm(edited);
    } else {
      onConfirm(result);
    }
  };

  if (!result) return null;

  const formatDate = (iso: string | null) => {
    if (!iso) return '无指定时间';
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric',
      weekday: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {!editing ? (
            <>
              <Text style={styles.header}>AI 理解结果</Text>

              <View style={styles.preview}>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>📋</Text>
                  <Text style={styles.fieldValue}>{result.title}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>⏰</Text>
                  <Text style={styles.fieldValue}>{formatDate(result.datetime)}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>🔥</Text>
                  <Text style={[styles.fieldValue, { color: result.priority === '高' ? COLORS.priorityHigh : result.priority === '低' ? COLORS.priorityLow : COLORS.warning }]}>
                    {result.priority}
                  </Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>🔁</Text>
                  <Text style={styles.fieldValue}>{RECURRING_LABELS[result.recurring] || '不重复'}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>📁</Text>
                  <View style={[styles.categoryTag, { backgroundColor: CATEGORY_COLORS[result.category] + '20' }]}>
                    <Text style={[styles.categoryText, { color: CATEGORY_COLORS[result.category] }]}>
                      {result.category}
                    </Text>
                  </View>
                </View>
                {result.notes ? (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>📝</Text>
                    <Text style={styles.fieldValue}>{result.notes}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.editBtn} onPress={openEdit}>
                  <Text style={styles.editText}>修改</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                  <Text style={styles.confirmText}>✓ 确认创建</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.header}>修改任务</Text>
              <ScrollView style={styles.editForm}>
                <Text style={styles.inputLabel}>标题</Text>
                <TextInput style={styles.input} value={editTitle} onChangeText={setEditTitle} />

                <Text style={styles.inputLabel}>时间 (YYYY-MM-DD HH:MM)</Text>
                <TextInput style={styles.input} value={editDatetime} onChangeText={setEditDatetime} placeholder="例如 2026-06-09 15:00" />

                <Text style={styles.inputLabel}>优先级</Text>
                <View style={styles.optionRow}>
                  {PRIORITY_LABELS.map(p => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.optionBtn, editPriority === p && { backgroundColor: p === '高' ? COLORS.priorityHigh : p === '中' ? COLORS.warning : COLORS.success }]}
                      onPress={() => setEditPriority(p)}
                    >
                      <Text style={[styles.optionText, editPriority === p && { color: '#fff' }]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>分类</Text>
                <View style={styles.optionRow}>
                  {CATEGORY_LABELS.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.optionBtn, editCategory === c && { backgroundColor: CATEGORY_COLORS[c] }]}
                      onPress={() => setEditCategory(c)}
                    >
                      <Text style={[styles.optionText, editCategory === c && { color: '#fff' }]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>重复</Text>
                <View style={styles.optionRow}>
                  {Object.entries(RECURRING_LABELS).map(([k, v]) => (
                    <TouchableOpacity
                      key={k}
                      style={[styles.optionBtn, editRecurring === k && { backgroundColor: COLORS.primary }]}
                      onPress={() => setEditRecurring(k as RecurringRule)}
                    >
                      <Text style={[styles.optionText, editRecurring === k && { color: '#fff' }]}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>备注</Text>
                <TextInput style={[styles.input, styles.textArea]} value={editNotes} onChangeText={setEditNotes} multiline />
              </ScrollView>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(false)}>
                  <Text style={styles.editText}>返回</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                  <Text style={styles.confirmText}>✓ 保存</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '85%',
  },
  handle: {
    width: 36, height: 4, backgroundColor: COLORS.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  header: {
    fontSize: 18, fontWeight: '700', color: COLORS.text,
    textAlign: 'center', marginBottom: 16,
  },
  preview: {
    backgroundColor: COLORS.bg, borderRadius: 12, padding: 16, marginBottom: 16,
  },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, gap: 8,
  },
  fieldLabel: { fontSize: 16 },
  fieldValue: { fontSize: 15, color: COLORS.text, flex: 1 },
  categoryTag: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10 },
  categoryText: { fontSize: 13, fontWeight: '600' },
  actions: {
    flexDirection: 'row', gap: 12, marginBottom: 12,
  },
  editBtn: {
    flex: 1, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  editText: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  confirmBtn: {
    flex: 2, padding: 14, borderRadius: 12,
    backgroundColor: COLORS.primary, alignItems: 'center',
  },
  confirmText: { fontSize: 15, color: '#fff', fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { fontSize: 14, color: COLORS.textLight },
  editForm: { maxHeight: 400, marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textLight, marginBottom: 4, marginTop: 12 },
  input: {
    backgroundColor: COLORS.bg, borderRadius: 10, padding: 12,
    fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  optionBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
  },
  optionText: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
});
