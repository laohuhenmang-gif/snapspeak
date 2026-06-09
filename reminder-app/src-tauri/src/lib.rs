mod error;
mod models;
mod storage;
mod commands;
mod notification;

use std::sync::Arc;

use tauri::Manager;
use storage::JsonStorage;
use notification::ReminderScheduler;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()
                .unwrap_or_else(|_| {
                    std::env::current_dir()
                        .unwrap_or_else(|_| std::path::PathBuf::from("."))
                })
                .join("work-memo")
                .join("data");
            let storage = Arc::new(JsonStorage::new(data_dir));
            let scheduler = ReminderScheduler::new(storage.clone(), app.handle().clone());
            scheduler.start();

            app.manage(storage);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::task_cmds::list_tasks,
            commands::task_cmds::get_task,
            commands::task_cmds::add_task,
            commands::task_cmds::update_task,
            commands::task_cmds::delete_task,
            commands::task_cmds::toggle_complete,
            commands::task_cmds::get_tasks_by_date,
            commands::task_cmds::get_week_tasks,
            commands::task_cmds::get_upcoming,
            commands::category_cmds::list_categories,
            commands::category_cmds::add_category,
            commands::category_cmds::update_category,
            commands::category_cmds::delete_category,
            commands::data_cmds::export_data,
            commands::data_cmds::write_export_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
