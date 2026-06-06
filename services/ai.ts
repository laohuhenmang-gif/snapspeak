import { Task, AIParseResult, ReminderAction } from '../types';
import { getApiKey, getModel } from './ai-config';
import { AGENT_SYSTEM_PROMPT, AIAction, AIChatMessage, AIChatResponse } from './ai-types';

const DEEPSEEK_BASE = 'https://api.deepseek.com';

async function callDeepSeek(
  messages: { role: string; content: string }[],
  jsonMode = true,
): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('请先在设置中配置 DeepSeek API Key');
  const model = await getModel();

  const body: any = {
    model,
    messages,
    temperature: 0.1,
    max_tokens: 2048,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepSeek API 错误 (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

function buildContext(extra?: string): string {
  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long' });
  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  let ctx = `当前时间：${dateStr} ${timeStr}\n时区：${timezone}`;
  if (extra) ctx += '\n' + extra;
  return ctx;
}

// --- 对话式 AI 助手（豆包风格）---
export async function chat(
  userMessage: string,
  history: AIChatMessage[],
  todayTasks: Task[],
  allTasks: Task[],
): Promise<AIChatResponse> {
  const context = buildContext();
  const todayStr = todayTasks.filter(t => !t.completed)
    .map(t => `  [${t.priority}] ${t.datetime?.slice(11,16) || ''} ${t.title}`)
    .join('\n');

  const systemMsg = `${AGENT_SYSTEM_PROMPT}

## 当前上下文
${context}
今日待办任务：
${todayStr || '  今天没有待办任务'}
任务总数：${allTasks.length}`;

  const chatHistory = history.slice(-20).map(m => ({
    role: m.role,
    content: m.content,
  }));

  const result = await callDeepSeek([
    { role: 'system', content: systemMsg },
    ...chatHistory,
    { role: 'user', content: userMessage },
  ], true);

  try {
    const parsed = JSON.parse(result);
    return {
      reply: parsed.reply || '好的，已处理',
      actions: Array.isArray(parsed.actions) ? parsed.actions : undefined,
    };
  } catch {
    return { reply: result || '好的，已处理' };
  }
}

// --- 创建任务 ---
export async function parseTask(userText: string): Promise<{ parsed: AIParseResult; rawTitle: string }> {
  const context = buildContext();
  const result = await callDeepSeek([
    { role: 'system', content: AGENT_SYSTEM_PROMPT + `\n\n用户想要创建一个任务。请以 JSON 格式返回以下字段（action="create"）：title, datetime, priority, recurring, category, notes。只返回 JSON 对象。\n\n${context}` },
    { role: 'user', content: userText },
  ], true);

  let parsed: any;
  try { parsed = JSON.parse(result); } catch { throw new Error('AI 解析失败，请重试'); }

  return {
    parsed: {
      title: parsed.title || userText,
      datetime: parsed.datetime || null,
      priority: ['高', '中', '低'].includes(parsed.priority) ? parsed.priority : '中',
      recurring: ['none', '每天', '每周', '每月', '工作日', '每两周'].includes(parsed.recurring) ? parsed.recurring : 'none',
      category: ['工作', '学习', '健康', '生活', '其他'].includes(parsed.category) ? parsed.category : '其他',
      notes: parsed.notes || '',
    },
    rawTitle: userText,
  };
}

// --- 修改任务 ---
export async function editTask(task: Task, editCommand: string): Promise<{ changes: Partial<Task>; summary: string }> {
  const context = buildContext(`当前任务：${JSON.stringify(task)}`);
  const result = await callDeepSeek([
    { role: 'system', content: AGENT_SYSTEM_PROMPT + `\n\n用户想修改一个已有任务。返回 JSON：{"action":"edit","changes":{...},"summary":"确认语"}\n只能返回 changes 中实际需要修改的字段。\n\n${context}` },
    { role: 'user', content: editCommand },
  ], true);

  let parsed: any;
  try { parsed = JSON.parse(result); } catch { throw new Error('AI 修改解析失败'); }

  const changes: Partial<Task> = {};
  if (parsed.changes?.title) changes.title = parsed.changes.title;
  if (parsed.changes?.datetime) changes.datetime = new Date(parsed.changes.datetime).toISOString();
  if (parsed.changes?.priority && ['高', '中', '低'].includes(parsed.changes.priority)) changes.priority = parsed.changes.priority;
  if (parsed.changes?.recurring && ['none', '每天', '每周', '每月', '工作日', '每两周'].includes(parsed.changes.recurring)) changes.recurring = parsed.changes.recurring;
  if (parsed.changes?.category && ['工作', '学习', '健康', '生活', '其他'].includes(parsed.changes.category)) changes.category = parsed.changes.category;
  if (parsed.changes?.description !== undefined) changes.description = parsed.changes.description;

  return { changes, summary: parsed.summary || '已修改' };
}

// --- 提醒响应 ---
export async function handleReminderResponse(taskTitle: string, userResponse: string): Promise<ReminderAction> {
  const now = new Date().toISOString();
  const result = await callDeepSeek([
    { role: 'system', content: AGENT_SYSTEM_PROMPT + `\n\n用户收到任务提醒后做出回应。当前时间：${now}\n返回 JSON：{"action":"snooze|complete|reschedule|dismiss","snoozeMinutes":number|null,"newDatetime":"ISO|null","message":"确认语"}` },
    { role: 'user', content: `任务：${taskTitle}\n用户回应：${userResponse}` },
  ], true);

  try { return JSON.parse(result); }
  catch { return { action: 'dismiss' as const, snoozeMinutes: null, newDatetime: null, message: '没理解您的意思，已忽略' }; }
}

// --- 每日简报 ---
export async function generateBriefing(tasks: Task[]): Promise<string> {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';

  if (tasks.length === 0) return `${greeting}！今天没有待办任务，放松一下吧 🎉`;

  const taskSummary = tasks.filter(t => !t.completed).map(t => {
    const time = t.datetime ? ` ${t.datetime.slice(11, 16)}` : '';
    return `- [${t.priority}]${time} ${t.title}`;
  }).join('\n');

  try {
    const result = await callDeepSeek([
      { role: 'system', content: `你是一个贴心的每日简报助手。以"${greeting}"开头，生成 1-3 句中文问候，简洁温暖，指出最重要的任务。不要 JSON。` },
      { role: 'user', content: `今天的待办任务：\n${taskSummary}` },
    ], false);
    return result || `${greeting}！今天有 ${tasks.filter(t => !t.completed).length} 个待办任务。`;
  } catch {
    return `${greeting}！今天有 ${tasks.filter(t => !t.completed).length} 个待办任务。`;
  }
}

// --- OCR 增强 ---
export async function ocrEnhance(rawText: string): Promise<{ cleaned: string; tasks: AIParseResult[] }> {
  const result = await callDeepSeek([
    { role: 'system', content: `你是 OCR 文本清洗和任务提取助手。
清洗OCR文本，修正错别字，提取所有待办事项。
返回 JSON：{"cleaned":"清洗后文本","tasks":[{"title":"...","datetime":"...或null","priority":"高/中/低","category":"..."}]}` },
    { role: 'user', content: rawText },
  ], true);

  let parsed: any;
  try { parsed = JSON.parse(result); } catch { return { cleaned: rawText, tasks: [] }; }

  return {
    cleaned: parsed.cleaned || rawText,
    tasks: (parsed.tasks || []).map((t: any) => ({
      title: t.title || '',
      datetime: t.datetime || null,
      priority: (['高', '中', '低'].includes(t.priority) ? t.priority : '中') as '高'|'中'|'低',
      recurring: 'none' as const,
      category: (['工作', '学习', '健康', '生活', '其他'].includes(t.category) ? t.category : '其他') as any,
      notes: t.notes || '',
    })),
  };
}

// --- 智能建议 ---
export async function suggestTasks(taskHistory: Task[]): Promise<string> {
  if (taskHistory.length < 3) return '';
  try {
    return await callDeepSeek([
      { role: 'system', content: `分析用户的任务历史，给出 1 条智能建议。如果发现规律性任务（如每周周报），建议自动创建。1-2 句话，不要 JSON。` },
      { role: 'user', content: `近期任务：${JSON.stringify(taskHistory.slice(-20))}` },
    ], false);
  } catch { return ''; }
}

// --- 多意图处理 ---
export async function multiIntent(text: string): Promise<AIAction[]> {
  const context = buildContext();
  const result = await callDeepSeek([
    { role: 'system', content: AGENT_SYSTEM_PROMPT + `\n\n用户的一句话可能包含多个操作。解析为 actions 数组。返回 JSON：{"actions":[...]}\n\n${context}` },
    { role: 'user', content: text },
  ], true);

  try { const parsed = JSON.parse(result); return Array.isArray(parsed.actions) ? parsed.actions : [parsed]; }
  catch { return [{ action: 'unknown', message: '没理解您的意思' } as AIAction]; }
}
