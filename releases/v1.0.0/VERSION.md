# SnapSpeak v1.0.0

## 发布信息
- **版本号**: 1.0.0
- **发布日期**: 2026-06-14
- **定位**: 个人 AI 工作助理（安卓 App）

## 核心功能
- ✅ 聊天式单屏主界面（非 OA/后台风格）
- ✅ 底部固定输入栏（语音 + 文字 + 相机）
- ✅ 真实语音识别（expo-speech-recognition）
- ✅ 拍照/相册 + AI Vision OCR
- ✅ AI 对话（DeepSeek/OpenAI/Agnes/自定义）
- ✅ AI Action 确认卡机制
- ✅ SQLite 数据持久化（8 张表）
- ✅ 通知提醒（expo-notifications）
- ✅ 知识库记忆系统
- ✅ 每日复盘
- ✅ 多主题 + 深色模式
- ✅ 数据导出

## 集成模块（v1.0.0 修复）
- ✅ reminder-service：通知触发语音播报
- ✅ conversations：对话记录持久化
- ✅ captures：文字/语音/拍照输入记录
- ✅ network：网络状态监控 + 离线提示

## 已知限制
- 无"全部任务"Tab 页面
- 无每周复盘
- 无历史搜索
- 前置卡点提醒依赖 AI Prompt 判断
- 知识库迭代依赖 AI Prompt 行为

## 依赖版本
- Expo SDK 52
- React Native 0.76.7
- React 18.3.1
- TypeScript 5.3.3

## 文件结构
```
app/              路由页面（首页、设置、任务详情）
components/       UI 组件
services/         服务层（AI、存储、语音、OCR、通知等）
types/            TypeScript 类型定义
constants/        常量（主题、交互状态）
scripts/          构建脚本
assets/           资源文件（图标、启动图）
```
