import { Task, AIParseResult, ReminderAction } from '../types';
import { getApiKey, getModel, getBaseUrl } from './ai-config';
import { AGENT_SYSTEM_PROMPT, AIAction, AIChatMessage, AIChatResponse, AIError } from './ai-types';
import { 
  loadConfirmedMemories, 
  loadBlockersByTask, 
  loadReflectionByDate,
} from './storage';
import { fetchWithRetry } from './http-client';

async function callAI(
  messages: { role: string; content: string }[],
  jsonMode = true,
): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new AIError('请先在设置中配置 API Key', 'api_key_missing');
  const model = await getModel();
  const baseUrl = await getBaseUrl();
  if (!baseUrl) throw new AIError('请先在设置中配置 API 地址', 'api_key_missing');

  const body: any = {
    model,
    messages,
    temperature: 0.1,
    max_tokens: 2048,
  };

  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  let res: Response;
  try {
    res = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
  } catch (e: any) {
    if (e instanceof AIError) throw e;
    throw new AIError(`网络连接失败: ${e?.message || '未知错误'}`, 'network');
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    if (res.status === 401 || res.status === 403) {
      throw new AIError('API Key 无效或未授权，请检查设置', 'api_key_missing');
    }
    if (res.status === 429) {
      throw new AIError('API 请求过于频繁，请稍后重试', 'ai_service');
    }
    if (res.status >= 500) {
      throw new AIError('AI 服务暂时不可用，请稍后重试', 'ai_service');
    }
    throw new AIError(`AI API 错误 (${res.status}): ${errText}`, 'ai_service');
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

/**
 * 加载知识库上下文，供 AI chat 使用
 */
async function buildKnowledgeContext(todayTasks: Task[]): Promise<string> {
  const parts: string[] = [];

  try {
    // 1. 用户已确认的偏好和规则
    const confirmed = await loadConfirmedMemories();
    const preferences = confirmed.filter((m: any) => m.memory_type === 'preference' || m.memory_type === 'rule');
    if (preferences.length > 0) {
      parts.push('## 我已记住的用户偏好和规则');
      preferences.forEach((m: any) => {
        parts.push(`  - ${m.content}`);
      });
    }

    // 2. 今日待办中未解决的卡点
    const unresolvedBlockers: string[] = [];
    for (const task of todayTasks.filter(t => !t.completed)) {
      const blockers = await loadBlockersByTask(task.id);
      const active = blockers.filter((b: any) => !b.resolved);
      if (active.length > 0) {
        unresolvedBlockers.push(`  任务「${task.title}」：${active.map((b: any) => b.blocker_text).join('；')}`);
      }
    }
    if (unresolvedBlockers.length > 0) {
      parts.push('## 今日待办中的未解决卡点');
      parts.push(unresolvedBlockers.join('\n'));
    }

    // 3. 昨日复盘总结（如果有）
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const yesterdayReflection = await loadReflectionByDate(yesterday);
    if (yesterdayReflection) {
      parts.push('## 昨日复盘');
      if (yesterdayReflection.ai_summary) parts.push(`  ${yesterdayReflection.ai_summary}`);
      if (yesterdayReflection.ai_suggestion) parts.push(`  AI 建议：${yesterdayReflection.ai_suggestion}`);
      if (yesterdayReflection.main_blockers_json) {
        try {
          const blockers = JSON.parse(yesterdayReflection.main_blockers_json);
          if (Array.isArray(blockers) && blockers.length > 0) {
            parts.push(`  主要卡点：${blockers.join('、')}`);
          }
        } catch {}
      }
    }
  } catch (e) {
    // 知识库加载失败不阻塞主流程
  }

  return parts.length > 0 ? parts.join('\n\n') : '';
}

// --- 对话式 AI 助手 ---
export async function chat(
  userMessage: string,
  history: AIChatMessage[],
  todayTasks: Task[],
  allTasks: Task[],
): Promise<AIChatResponse> {
  const context = buildContext();
  const todayStr = todayTasks.filter(t => !t.completed)
    .map(t => `  [${t.priority}] ${t.datetime?.slice(11,16) || ''} ${t.title}${t.needs_precheck ? ' (需前置准备)' : ''}`)
    .join('\n');

  // 加载知识库
  const kbContext = await buildKnowledgeContext(todayTasks);

  let systemMsg = `${AGENT_SYSTEM_PROMPT}\n\n## 回复格式\n必须以纯 JSON 返回，不要用 \`\`\`json 包裹，字段：{"reply": "对用户说的话", "actions": [...]}。reply 字段必填。\n\n## 当前上下文
${context}
今日待办任务：
${todayStr || '  今天没有待办任务'}
任务总数：${allTasks.length}`;

  // 如果有知识库信息，追加到上下文中
  if (kbContext) {
    systemMsg += `\n\n## 知识库上下文\n${kbContext}`;
  }

  const chatHistory = history.slice(-20).map(m => ({
    role: m.role,
    content: m.content,
  }));

  const result = await callAI([
    { role: 'system', content: systemMsg },
    ...chatHistory,
    { role: 'user', content: userMessage },
  ], true);

  const cleaned = result.replace(/```(?:json)?\s*\n?/gi, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
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
  const result = await callAI([
    { role: 'system', content: AGENT_SYSTEM_PROMPT + `\n\n用户想要创建一个任务。请以 JSON 格式返回以下字段（action="create"）：title, datetime, priority, recurring, category, notes。只返回纯 JSON 对象，不要用 \`\`\`json 包裹，不要输出任何解释文字。\n\n${context}` },
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
  const result = await callAI([
    { role: 'system', content: AGENT_SYSTEM_PROMPT + `\n\n用户想修改一个已有任务。返回纯 JSON：{"action":"edit","changes":{...},"summary":"确认语"}\n只能返回 changes 中实际需要修改的字段。不要用 \`\`\`json 包裹。\n\n${context}` },
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
  const result = await callAI([
    { role: 'system', content: AGENT_SYSTEM_PROMPT + `\n\n用户收到任务提醒后做出回应。当前时间：${now}\n返回纯 JSON：{"action":"snooze|complete|reschedule|dismiss","snoozeMinutes":number|null,"newDatetime":"ISO|null","message":"确认语"}。不要用 \`\`\`json 包裹。` },
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
    const precheck = t.needs_precheck ? ' (需前置准备)' : '';
    return `- [${t.priority}]${time} ${t.title}${precheck}`;
  }).join('\n');

  try {
    // 加载昨日复盘信息
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let extraContext = '';
    try {
      const reflection = await loadReflectionByDate(yesterday);
      if (reflection?.ai_suggestion) {
        extraContext = `\n昨日 AI 建议：${reflection.ai_suggestion}`;
      }
    } catch {}

    const result = await callAI([
      { role: 'system', content: `你是一个贴心的每日简报助手。以"${greeting}"开头，生成 1-3 句中文问候，简洁温暖，指出最重要的任务。不要 JSON。${extraContext}` },
      { role: 'user', content: `今天的待办任务：\n${taskSummary}` },
    ], false);
    return result || `${greeting}！今天有 ${tasks.filter(t => !t.completed).length} 个待办任务。`;
  } catch {
    return `${greeting}！今天有 ${tasks.filter(t => !t.completed).length} 个待办任务。`;
  }
}

// --- OCR 增强 ---
export async function ocrEnhance(rawText: string): Promise<{ cleaned: string; tasks: AIParseResult[] }> {
  const result = await callAI([
    { role: 'system', content: `你是 OCR 文本清洗和任务提取助手。
清洗OCR文本，修正错别字，提取所有待办事项。
返回纯 JSON：{"cleaned":"清洗后文本","tasks":[{"title":"...","datetime":"...或null","priority":"高/中/低","category":"..."}]}。不要用 \`\`\`json 包裹。` },
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
    return await callAI([
      { role: 'system', content: `分析用户的任务历史，给出 1 条智能建议。如果发现规律性任务（如每周周报），建议自动创建。1-2 句话，不要 JSON。` },
      { role: 'user', content: `近期任务：${JSON.stringify(taskHistory.slice(-20))}` },
    ], false);
  } catch { return ''; }
}

// --- 多意图处理 ---
export async function multiIntent(text: string): Promise<AIAction[]> {
  const context = buildContext();
  const result = await callAI([
    { role: 'system', content: AGENT_SYSTEM_PROMPT + `\n\n用户的一句话可能包含多个操作。解析为 actions 数组。返回纯 JSON：{"actions":[...]}。不要用 \`\`\`json 包裹，不要输出任何解释文字。\n\n${context}` },
    { role: 'user', content: text },
  ], true);

  try { const parsed = JSON.parse(result); return Array.isArray(parsed.actions) ? parsed.actions : [parsed]; }
  catch { return [{ action: 'unknown', message: '没理解您的意思' } as AIAction]; }
}

// --- 每日复盘生成 ---
export async function generateDailyReview(
  tasks: Task[],
  todayStr: string,
): Promise<{ ai_summary: string; ai_suggestion: string; completion_rate: number }> {
  const plannedCount = tasks.filter(t => t.datetime?.startsWith(todayStr)).length;
  const completedCount = tasks.filter(t => t.completed && t.completedAt?.startsWith(todayStr)).length;
  const overdueCount = tasks.filter(t => !t.completed && t.datetime && t.datetime < new Date().toISOString()).length;
  const rate = plannedCount > 0 ? Math.round((completedCount / plannedCount) * 100) : 0;

  // 收集未完成原因
  const incompleteTasks = tasks.filter(t => !t.completed && t.datetime?.startsWith(todayStr));
  const blockersList = incompleteTasks.map(t => t.current_blocker_reason || t.title).filter(Boolean);

  try {
    const taskList = tasks.filter(t => t.datetime?.startsWith(todayStr)).map(t =>
      `  [${t.completed ? '✅' : '⬜'}] ${t.title}${t.current_blocker_reason ? ' (原因：' + t.current_blocker_reason + ')' : ''}`
    ).join('\n');

    const result = await callAI([
      { role: 'system', content: `你是一个贴心的每日工作复盘助手。今天是 ${todayStr}。

生成简短的中文复盘，包含：
1. 今天完成情况和完成率
2. 未完成的主要卡点
3. 一个明确的明日建议

返回纯 JSON：{"summary":"...","suggestion":"..."}。不要用 \`\`\`json 包裹。` },
      { role: 'user', content: `今天计划 ${plannedCount} 件，完成 ${completedCount} 件，完成率 ${rate}%。\n任务详情：\n${taskList || '  无今日任务'}` },
    ], true);

    const parsed = JSON.parse(result);
    return {
      ai_summary: parsed.summary || `今天完成 ${completedCount}/${plannedCount} 件事，完成率 ${rate}%。`,
      ai_suggestion: parsed.suggestion || '继续保持。',
      completion_rate: rate,
    };
  } catch {
    return {
      ai_summary: `今天完成 ${completedCount}/${plannedCount} 件事，完成率 ${rate}%。`,
      ai_suggestion: '继续保持。',
      completion_rate: rate,
    };
  }
}

// --- 每周复盘生成 ---
export async function generateWeeklyReview(
  tasks: Task[],
  weekStart: string,
): Promise<{ ai_summary: string; ai_suggestion: string; completion_rate: number; total_planned: number; total_completed: number }> {
  const weekEnd = new Date(new Date(weekStart).getTime() + 6 * 86400000).toISOString().slice(0, 10);
  const weekTasks = tasks.filter(t => {
    const d = t.datetime?.slice(0, 10);
    return d && d >= weekStart && d <= weekEnd;
  });
  const totalPlanned = weekTasks.length;
  const totalCompleted = weekTasks.filter(t => t.completed).length;
  const rate = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;

  try {
    const taskList = weekTasks.map(t =>
      `  [${t.completed ? '✅' : '⬜'}] ${t.datetime?.slice(0, 10)} ${t.title}${t.current_blocker_reason ? ' (原因：' + t.current_blocker_reason + ')' : ''}`
    ).join('\n');

    const result = await callAI([
      { role: 'system', content: `你是一个贴心的每周工作复盘助手。本周是 ${weekStart} ~ ${weekEnd}。

生成简短的中文周复盘，包含：
1. 本周总完成情况和完成率
2. 本周主要卡点和未完成原因汇总
3. 一个明确的下周改进建议

返回纯 JSON：{"summary":"...","suggestion":"..."}。不要用 \`\`\`json 包裹。` },
      { role: 'user', content: `本周计划 ${totalPlanned} 件，完成 ${totalCompleted} 件，完成率 ${rate}%。\n任务详情：\n${taskList || '  本周无任务'}` },
    ], true);

    const parsed = JSON.parse(result);
    return {
      ai_summary: parsed.summary || `本周完成 ${totalCompleted}/${totalPlanned} 件事，完成率 ${rate}%。`,
      ai_suggestion: parsed.suggestion || '继续保持。',
      completion_rate: rate,
      total_planned: totalPlanned,
      total_completed: totalCompleted,
    };
  } catch {
    return {
      ai_summary: `本周完成 ${totalCompleted}/${totalPlanned} 件事，完成率 ${rate}%。`,
      ai_suggestion: '继续保持。',
      completion_rate: rate,
      total_planned: totalPlanned,
      total_completed: totalCompleted,
    };
  }
}