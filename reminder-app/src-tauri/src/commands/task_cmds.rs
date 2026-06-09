use std::sync::Arc;
use tauri::State;
use crate::error::AppError;
use crate::models::{Task, TaskInput};
use crate::storage::{JsonStorage, TaskRepository};

#[tauri::command]
pub fn list_tasks(storage: State<'_, Arc<JsonStorage>>) -> Result<Vec<Task>, AppError> {
    Ok(storage.list_tasks())
}

#[tauri::command]
pub fn get_task(storage: State<'_, Arc<JsonStorage>>, id: String) -> Result<Task, AppError> {
    storage.get_task(&id).ok_or_else(|| AppError::NotFound(format!("任务 {} 不存在", id)))
}

#[tauri::command]
pub fn add_task(storage: State<'_, Arc<JsonStorage>>, input: TaskInput) -> Result<Task, AppError> {
    if input.title.trim().is_empty() {
        return Err(AppError::Validation("任务标题不能为空".into()));
    }
    Ok(storage.add_task(input))
}

#[tauri::command]
pub fn update_task(storage: State<'_, Arc<JsonStorage>>, id: String, input: TaskInput) -> Result<Task, AppError> {
    if input.title.trim().is_empty() {
        return Err(AppError::Validation("任务标题不能为空".into()));
    }
    storage.update_task(&id, input).ok_or_else(|| AppError::NotFound(format!("任务 {} 不存在", id)))
}

#[tauri::command]
pub fn delete_task(storage: State<'_, Arc<JsonStorage>>, id: String) -> Result<(), AppError> {
    if !storage.delete_task(&id) {
        return Err(AppError::NotFound(format!("任务 {} 不存在", id)));
    }
    Ok(())
}

#[tauri::command]
pub fn toggle_complete(storage: State<'_, Arc<JsonStorage>>, id: String) -> Result<Task, AppError> {
    let task = storage.toggle_complete(&id).ok_or_else(|| AppError::NotFound(format!("任务 {} 不存在", id)))?;

    if task.completed {
        if let Some(advanced) = storage.advance_recurring_task(&id) {
            return Ok(advanced);
        }
    }

    Ok(task)
}

#[tauri::command]
pub fn get_tasks_by_date(storage: State<'_, Arc<JsonStorage>>, date: String) -> Result<Vec<Task>, AppError> {
    Ok(storage.get_tasks_by_date(&date))
}

#[tauri::command]
pub fn get_week_tasks(storage: State<'_, Arc<JsonStorage>>, start: String, end: String) -> Result<Vec<Task>, AppError> {
    Ok(storage.get_tasks_by_week(&start, &end))
}

#[tauri::command]
pub fn get_upcoming(storage: State<'_, Arc<JsonStorage>>, within_mins: i64) -> Result<Vec<Task>, AppError> {
    Ok(storage.get_upcoming(within_mins))
}
