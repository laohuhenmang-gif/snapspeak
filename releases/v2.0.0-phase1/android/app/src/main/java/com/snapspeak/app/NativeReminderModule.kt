package com.snapspeak.app

import android.app.Activity
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class NativeReminderModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "NativeReminder"

    @ReactMethod
    fun scheduleAlarm(taskId: String, triggerAtMillis: Double, title: String, body: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            AlarmHelper.scheduleAlarm(context, taskId, triggerAtMillis.toLong(), title, body)

            val prefs = context.getSharedPreferences("snapspeak_alarms", Context.MODE_PRIVATE)
            prefs.edit()
                .putLong("alarm_$taskId", triggerAtMillis.toLong())
                .putString("title_$taskId", title)
                .putString("body_$taskId", body)
                .apply()

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ALARM_ERROR", e.message)
        }
    }

    @ReactMethod
    fun cancelAlarm(taskId: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            AlarmHelper.cancelAlarm(context, taskId)

            val prefs = context.getSharedPreferences("snapspeak_alarms", Context.MODE_PRIVATE)
            prefs.edit()
                .remove("alarm_$taskId")
                .remove("title_$taskId")
                .remove("body_$taskId")
                .apply()

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ALARM_ERROR", e.message)
        }
    }

    @ReactMethod
    fun canScheduleExactAlarms(promise: Promise) {
        promise.resolve(AlarmHelper.canScheduleExactAlarms(reactApplicationContext))
    }

    @ReactMethod
    fun openExactAlarmSettings() {
        val activity = currentActivity ?: return
        AlarmHelper.openExactAlarmSettings(activity)
    }

    @ReactMethod
    fun isBatteryOptimizationIgnored(promise: Promise) {
        promise.resolve(PermissionHelper.isBatteryOptimizationIgnored(reactApplicationContext))
    }

    @ReactMethod
    fun requestIgnoreBatteryOptimization() {
        val activity = currentActivity ?: return
        PermissionHelper.requestIgnoreBatteryOptimization(activity)
    }

    @ReactMethod
    fun hasNotificationPermission(promise: Promise) {
        promise.resolve(PermissionHelper.hasNotificationPermission(reactApplicationContext))
    }

    @ReactMethod
    fun openNotificationSettings() {
        val context = reactApplicationContext
        PermissionHelper.openNotificationSettings(context)
    }

    @ReactMethod
    fun getPermissionsStatus(promise: Promise) {
        val status = PermissionHelper.getPermissionsStatus(reactApplicationContext)
        val map = Arguments.createMap()
        for ((key, value) in status) {
            map.putBoolean(key, value)
        }
        promise.resolve(map)
    }

    @ReactMethod
    fun addListener(eventName: String) {
    }

    @ReactMethod
    fun removeListeners(count: Int) {
    }
}
