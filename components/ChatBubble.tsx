import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

// Unified message type for the chat stream
export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageKind = 'text' | 'image' | 'card' | 'action' | 'error';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  kind: MessageKind;
  content: string;              // text content or caption
  imageUri?: string;            // for image messages
  cardData?: ConfirmCardData;   // for card/action messages
  timestamp: number;
  errorRetryable?: boolean;
}

// Confirmation card data
export interface ConfirmCardData {
  title: string;
  items?: { label: string; value: string }[];
  actions: ConfirmCardAction[];
  context?: string; // raw AI action payload for execution
}

export interface ConfirmCardAction {
  label: string;
  key: string;  // 'confirm' | 'edit' | 'cancel' | 'retry' | 'custom'
  style?: 'primary' | 'secondary' | 'danger';
}

interface ChatBubbleProps {
  message: ChatMessage;
  onCardAction?: (actionKey: string, message: ChatMessage) => void;
  onRetry?: (message: ChatMessage) => void;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function ChatBubble({ message, onCardAction, onRetry }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const isError = message.kind === 'error';

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      {/* Avatar for non-user messages */}
      {!isUser && (
        <View style={styles.avatarSmall}>
          <Text style={styles.avatarText}>🤖</Text>
        </View>
      )}

      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI, isError && styles.bubbleError]}>
        {/* Text content */}
        {(message.kind === 'text' || message.kind === 'error') && (
          <Text style={[styles.text, isUser ? styles.textUser : styles.textAI]}>
            {message.content}
          </Text>
        )}

        {/* Image message */}
        {message.kind === 'image' && message.imageUri && (
          <View>
            <Image source={{ uri: message.imageUri }} style={styles.image} resizeMode="cover" />
            {message.content ? (
              <Text style={[styles.imageCaption, styles.textAI]}>{message.content}</Text>
            ) : null}
          </View>
        )}

        {/* Card / Action message */}
        {(message.kind === 'card' || message.kind === 'action') && message.cardData && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{message.cardData.title}</Text>
            {message.content ? (
              <Text style={[styles.text, styles.textAI, { marginBottom: 8 }]}>
                {message.content}
              </Text>
            ) : null}
            {message.cardData.items && message.cardData.items.length > 0 && (
              <View style={styles.itemList}>
                {message.cardData.items.map((item, i) => (
                  <View key={i} style={styles.itemRow}>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    <Text style={styles.itemValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.actionRow}>
              {message.cardData.actions.map((action) => (
                <TouchableOpacity
                  key={action.key}
                  style={[
                    styles.actionBtn,
                    action.style === 'primary' && styles.actionBtnPrimary,
                    action.style === 'danger' && styles.actionBtnDanger,
                    action.style === 'secondary' && styles.actionBtnSecondary,
                  ]}
                  onPress={() => onCardAction?.(action.key, message)}
                >
                  <Text
                    style={[
                      styles.actionText,
                      action.style === 'primary' && styles.actionTextPrimary,
                      action.style === 'danger' && styles.actionTextDanger,
                    ]}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Error retry */}
        {isError && message.errorRetryable && onRetry && (
          <TouchableOpacity style={styles.retryBtn} onPress={() => onRetry(message)}>
            <Text style={styles.retryText}>重试</Text>
          </TouchableOpacity>
        )}

        {/* Timestamp */}
        <Text style={[styles.timestamp, isUser ? styles.timestampUser : styles.timestampAI]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </View>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

/*
  用法示例 —— 未来在主界面 chat.tsx 中使用：

  1. 用户文字消息:
  { id: '1', role: 'user', kind: 'text', content: '明天下午三点开会', timestamp: Date.now() }

  2. AI 确认卡:
  {
    id: '2', role: 'assistant', kind: 'card',
    content: '我理解为一条提醒',
    cardData: {
      title: '创建任务',
      items: [
        { label: '事项', value: '开会' },
        { label: '时间', value: '明天下午 3:00' },
        { label: '建议', value: '提前 30 分钟提醒准备资料' },
      ],
      actions: [
        { label: '确认创建', key: 'confirm', style: 'primary' },
        { label: '改时间', key: 'edit', style: 'secondary' },
        { label: '取消', key: 'cancel', style: 'danger' },
      ],
    },
    timestamp: Date.now(),
  }

  3. OCR 候选卡:
  message.cardData = {
    title: '从图片识别到 3 个可能事项',
    items: [
      { label: '1.', value: '周三前整理汇报资料' },
      { label: '2.', value: '联系客户确认方案' },
      { label: '3.', value: '准备会议附件' },
    ],
    actions: [
      { label: '全部创建', key: 'confirm', style: 'primary' },
      { label: '逐条确认', key: 'edit', style: 'secondary' },
      { label: '只保存为备忘', key: 'cancel', style: 'danger' },
    ],
  };
*/

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 14,
    gap: 8,
  },
  rowUser: { justifyContent: 'flex-end' },
  rowAssistant: { justifyContent: 'flex-start' },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 14 },
  bubble: {
    maxWidth: '78%',
    padding: 14,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: COLORS.chatBubbleUser,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: COLORS.chatBubbleAI,
    borderBottomLeftRadius: 4,
  },
  bubbleError: {
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FFCCCC',
  },
  text: { fontSize: 15, lineHeight: 22 },
  textUser: { color: COLORS.chatBubbleUserText },
  textAI: { color: COLORS.chatBubbleAIText },
  image: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 6,
  },
  imageCaption: { fontSize: 13, marginTop: 4 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  itemList: { marginBottom: 8 },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  itemLabel: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: COLORS.textMuted,
    width: 50,
  },
  itemValue: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: COLORS.text,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: COLORS.inputBg,
  },
  actionBtnPrimary: { backgroundColor: COLORS.primary },
  actionBtnSecondary: { backgroundColor: COLORS.primaryLight },
  actionBtnDanger: { backgroundColor: '#FFEEEE' },
  actionText: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: COLORS.text,
  },
  actionTextPrimary: { color: '#FFFFFF', fontWeight: '600' },
  actionTextDanger: { color: '#CC3333' },
  retryBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#FFCCCC',
  },
  retryText: { fontSize: 12, color: '#CC3333', fontFamily: 'monospace' },
  timestamp: { fontSize: 10, marginTop: 4 },
  timestampUser: { color: COLORS.chatBubbleUserText + '88', textAlign: 'right' },
  timestampAI: { color: COLORS.chatBubbleAIText + '88' },
});