use std::fs;
use std::sync::Arc;
use tauri::State;
use crate::error::AppError;
use crate::models::{Task, Category};
use crate::storage::{JsonStorage, TaskRepository, CategoryRepository};

#[derive(serde::Serialize)]
pub struct ExportData {
    pub version: String,
    pub exported_at: String,
    pub tasks: Vec<Task>,
    pub categories: Vec<Category>,
}

#[tauri::command]
pub fn export_data(storage: State<'_, Arc<JsonStorage>>) -> Result<ExportData, AppError> {
    let tasks = storage.list_tasks();
    let categories = storage.list_categories();
    let now = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    Ok(ExportData {
        version: "1.0".into(),
        exported_at: now,
        tasks,
        categories,
    })
}

#[tauri::command]
pub fn write_export_file(path: String, data: String) -> Result<(), AppError> {
    Ok(fs::write(&path, &data)?)
}
