# SnapSpeak v2.0.0 Phase 1

## 发布信息
- **版本号**: 2.0.0-phase1
- **发布日期**: 2026-06-14
- **基于**: v1.2.0 + Android 原生可靠性

## Phase 1：Android 原生可靠性

### A1. AlarmManager 精确提醒
- 新增 `AlarmHelper.kt`：使用 Android AlarmManager 注册精确闹钟
- Android 12+ 支持 `canScheduleExactAlarms()` 检查
- 降级方案：无法精确时使用 `setAndAllowWhileIdle()`

### A2. 开机广播恢复
- 新增 `BootReceiver.kt`：监听 BOOT_COMPLETED 广播
- 重启后自动恢复所有未触发的提醒
- 支持标准启动和快速启动（HTC 等厂商）

### A3. 精确闹钟权限引导
- Android 12+ SCHEDULE_EXACT_ALARM 权限检查
- 自动跳转系统设置页让用户授权

### A4. 电池优化白名单
- 新增 `PermissionHelper.kt`：检查和请求电池优化白名单
- 引导用户关闭电池优化，确保后台提醒不被杀

### A5. 通知权限管理
- Android 13+ POST_NOTIFICATIONS 权限检查
- 一键跳转通知设置页

### A6. 权限引导组件
- 新增 `PermissionGuide.tsx`：设置页顶部显示权限状态
- 未授权项显示开启按钮
- 一键刷新权限状态

## 新增文件
```
android/app/src/main/java/com/snapspeak/app/
├── AlarmHelper.kt           ← AlarmManager 封装
├── AlarmReceiver.kt         ← 闹钟触发接收器
├── BootReceiver.kt          ← 开机恢复接收器
├── PermissionHelper.kt      ← 权限工具类
├── NativeReminderModule.kt  ← React Native 桥接模块
└── NativeReminderPackage.kt ← 模块注册

services/
└── native-reminder.ts       ← JS 层原生桥接

components/
└── PermissionGuide.tsx      ← 权限引导 UI
```

## 修改文件
```
AndroidManifest.xml          ← 添加权限和组件声明
MainApplication.kt           ← 注册 NativeReminderPackage
services/notification.ts     ← 接入原生 AlarmManager
app/(tabs)/settings.tsx      ← 添加权限引导组件
```

## 权限清单
```xml
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM"/>
<uses-permission android:name="android.permission.USE_EXACT_ALARM"/>
<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
<uses-permission android:name="android.permission.WAKE_LOCK"/>
```
