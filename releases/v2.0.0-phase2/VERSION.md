# SnapSpeak v2.0.0 Phase 2

## 发布信息
- **版本号**: 2.0.0-phase2
- **发布日期**: 2026-06-14
- **基于**: v2.0.0-phase1 + 稳定性与引导

## Phase 2：稳定性与首次引导

### B1. Error Boundary
- 新增 `ErrorBoundary.tsx`：全局错误边界组件
- 捕获 React 渲染崩溃，显示友好恢复页面
- 支持重新启动、复制错误日志

### B2. 崩溃日志
- 新增 `services/crash-log.ts`：崩溃日志记录服务
- 自动记录错误信息、堆栈、组件树
- 日志大小限制 50KB，自动截断
- 设置页可查看和清除日志

### B3. 状态恢复
- 新增 `services/state-recovery.ts`：应用状态保存与恢复
- 保存输入框内容、待确认 Action
- App 被杀后重启自动恢复
- 24 小时内有效

### B4. 数据库迁移
- 新增 `services/db-migration.ts`：Schema 版本管理
- v2 添加 7 个索引优化查询性能
- 升级时不丢数据

### B5. 离线请求队列
- 新增 `services/offline-queue.ts`：离线请求管理
- 网络断开时请求入队
- 网络恢复后自动重发
- 最多重试 3 次

### C1-C4. 首次使用引导
- 新增 `Onboarding.tsx`：3 页滑动引导
- 第 1 页：功能介绍
- 第 2 页：API Key 配置
- 第 3 页：AI 角色选择
- 首次启动自动显示

## 新增文件
```
components/
├── ErrorBoundary.tsx    ← 全局错误边界
├── Onboarding.tsx       ← 首次使用引导

services/
├── crash-log.ts         ← 崩溃日志服务
├── state-recovery.ts    ← 状态恢复服务
├── db-migration.ts      ← 数据库迁移
└── offline-queue.ts     ← 离线请求队列
```

## 修改文件
```
app/_layout.tsx          ← 集成 ErrorBoundary + Onboarding
app/(tabs)/index.tsx     ← 集成状态恢复
app/(tabs)/settings.tsx  ← 添加崩溃日志导出
services/storage.ts      ← 集成数据库迁移
```
