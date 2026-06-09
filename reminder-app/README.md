# 工作备忘 WorkMemo

**版本 1.0.0** — 跨平台桌面任务管理应用

基于 Tauri v2 构建的轻量级工作备忘与任务提醒桌面软件。支持任务分类、优先级、定期重复、桌面通知，数据本地存储，无需联网。

## 功能

- **今日待办** — 查看当天逾期、待完成和已完成任务
- **周视图** — 7 天日历网格，直观查看每周安排
- **全部任务** — 全文搜索、按优先级/状态筛选
- **分类管理** — 自定义任务分类与颜色标识
- **定期任务** — 支持每天/每周/每月自动重复推进
- **桌面通知** — 临近任务系统原生通知提醒
- **纯本地存储** — JSON 文件存储，不联网、不泄露

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | [Tauri v2](https://v2.tauri.app) |
| 前端 | Vanilla JavaScript (ES Modules) |
| 打包工具 | [Vite 5](https://vitejs.dev) |
| 后端 | Rust (2021 edition) |
| 通知 | Tauri Notification Plugin |

## 快速开始

```bash
# 开发
npm run tauri dev

# 仅前端开发
npm run dev

# 构建生产包
npm run tauri build
```

## 系统要求

- **Node.js** >= 18
- **Rust** (通过 rustup 安装)
- **Windows** — WebView2 (Windows 10+ 内置)
- **macOS / Linux** — WebKitGTK

## 构建产物

`npm run tauri build` 将生成：
- Windows: `.msi` 或 `.exe` 安装包
- macOS: `.dmg`
- Linux: `.deb` / `.AppImage`

## 数据存储

应用数据存储在系统应用数据目录下的 `work-memo/data/`：
- `tasks.json` — 任务数据
- `categories.json` — 分类数据

## 许可证

MIT License
