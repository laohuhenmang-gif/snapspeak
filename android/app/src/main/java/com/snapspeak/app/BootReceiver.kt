package com.snapspeak.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON" ||
            intent.action == "com.htc.intent.action.QUICKBOOT_POWERON") {

            Log.d(TAG, "Boot completed, restoring alarms...")

            val prefs = context.getSharedPreferences("snapspeak_alarms", Context.MODE_PRIVATE)
            val alarms = prefs.all

            for ((key, value) in alarms) {
                if (key.startsWith("alarm_") && value is Long) {
                    val taskId = key.removePrefix("alarm_")
                    val title = prefs.getString("title_$taskId", "任务提醒") ?: "任务提醒"
                    val body = prefs.getString("body_$taskId", "你有一个任务需要处理") ?: "你有一个任务需要处理"

                    if (value > System.currentTimeMillis()) {
                        AlarmHelper.scheduleAlarm(context, taskId, value, title, body)
                        Log.d(TAG, "Restored alarm for task $taskId at $value")
                    } else {
                        prefs.edit().remove("alarm_$taskId").remove("title_$taskId").remove("body_$taskId").apply()
                    }
                }
            }

            Log.d(TAG, "Alarm restoration complete")
        }
    }
}
