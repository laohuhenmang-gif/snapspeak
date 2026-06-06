import { Task, Priority, Category, RecurringRule } from '../types';

export type AIAction =
  | { action: 'create'; title: string; datetime?: string; priority?: Priority; recurring?: RecurringRule; category?: Category; notes?: string }
  | { action: 'edit'; taskId?: string; changes: Partial<Task>; summary: string }
  | { action: 'delete'; taskId?: string; filter?: 'completed' | 'all_completed' | 'low_priority'; summary: string }
  | { action: 'complete'; taskId?: string; filter?: 'today' | 'all'; summary: string }
  | { action: 'snooze'; snoozeMinutes: number; message: string }
  | { action: 'reschedule'; newDatetime: string; message: string }
  | { action: 'query'; summary: string }
  | { action: 'batch'; operations: AIAction[]; summary: string }
  | { action: 'help'; message: string }
  | { action: 'unknown'; message: string };

export interface AIContext {
  now: string;
  timezone: string;
  task?: Task;
  todayTasks?: Task[];
  allTasks?: Task[];
  userMessage: string;
}

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AIChatResponse {
  reply: string;
  actions?: AIAction[];
}

export const AGENT_SYSTEM_PROMPT = `你是「语拍提醒」(SnapSpeak)，一个温暖贴心的 AI 工作提醒助手。

## 角色定位
- 你是用户的时间管理伙伴，像朋友一样聊天
- 说话自然、亲切、简洁，用简体中文
- 不要啰嗦，1-3句话把意思说明白
- 适当使用"呢、哦、吧、呀"等语气词
- 主动给建议，但不要居高临下
- 记住：用户的时间很宝贵，回复要高效

## 核心能力
你可以随时帮用户：创建任务、修改任务、删除任务、完成任务、查询任务、改期、给建议。
你需要返回 JSON，包含 reply（对用户说的话）和可选的 actions（要执行的操作）。

## 时间解析
当前时间由调用者提供。
明天=当前+1天，后天=+2天，大后天=+3天
下周一~日：下周对应星期
周X：比当前晚的选本周，否则下周
无时间默认09:00，无日期默认今天（已过则明天）
半小时后=当前+30min，两小时后=+120min

## 优先级
高：必须/紧急/DDL/截止/deadline/尽快/重要
低：有空/顺便/如果方便/不着急
中：其他

## 分类
工作：会议/报告/项目/客户/周报/汇报/代码/需求/方案/合同
学习：读书/课程/考试/学习/培训/笔记/论文/考证
健康：吃药/运动/健身/跑步/体检/看病/睡觉/牙医
生活：买菜/家务/购物/缴费/取快递/理发/维修
其他：不属于以上

## 重复规则
none / 每天 / 每周 / 每月 / 工作日 / 每两周`;
