# 语拍提醒 · AI助理 SnapSpeak

**版本 1.0.0** — AI 驱动的智能任务管理移动应用

基于 React Native (Expo SDK 56) 构建的个人 AI 助理。支持文字、语音、拍照多模态输入，AI 自动理解意图并完成任务的创建、提醒、复盘等全流程管理。

## 功能

### 🧠 AI 核心
- **多模态输入** — 文字输入 / 语音识别 / 拍照 OCR
- **自然语言理解** — AI 自动解析并创建/编辑/完成/删除任务
- **每日简报** — 早上自动生成当天任务摘要
- **每日复盘** — 18:00 后自动生成完成率与建议
- **过期提醒** — 主动检测逾期任务并追问原因
- **知识库** — AI 学习用户偏好和习惯，越用越智能

### 📋 任务管理
- 创建、编辑、完成、删除任务
- 优先级、分类、标签、自定义时间
- 定期任务（每天/每周/每月）
- 全文搜索与筛选

### 🎨 个性化
- 6 套像素风格主题
- 深色/浅色/跟随系统
- 减少动画模式

### 🔒 隐私
- 所有数据存储在设备本地 SQLite
- API Key 存储在系统安全存储 (SecureStore)
- 可导出/导入全部数据

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | React Native 0.85.3 / Expo SDK 56 |
| 语言 | TypeScript 6.0 (strict) |
| 路由 | Expo Router (文件路由) |
| 本地存储 | SQLite (expo-sqlite) |
| AI | DeepSeek / OpenAI 兼容 |
| 语音 | expo-speech-recognition STT |
| 通知 | expo-notifications |
| 主题 | 6 套像素主题 + 深色/浅色 |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务
npx expo start

# Android 真机/模拟器
npx expo run:android
```

## 构建 APK

```bash
# 使用 EAS 云端构建
npx eas build --platform android --profile preview

# 生产版本
npx eas build --platform android --profile production
```

## AI 配置

支持 3 种 AI 提供商：

| 提供商 | 可用模型 |
|--------|----------|
| DeepSeek | DeepSeek Chat / Reasoner / V4 Flash / V4 Pro |
| OpenAI 兼容 | GPT-4o / 4o-mini / 4 Turbo / 3.5 Turbo |
| 自定义 | 任意 OpenAI 兼容 API |

在设置页配置 API Key 和模型即可使用。

## 系统要求

- **Android** 7.0+ (API 24)
- **iOS** (需自行构建)
- **Expo 账号** (EAS 构建需要)

## 构建配置

- **包名**: `com.snapspeak.app`
- **最低 SDK**: 24
- **EAS 项目 ID**: `c1da7284-e3e6-46e8-88bb-fcb26421fd40`

## 许可证

MIT License
