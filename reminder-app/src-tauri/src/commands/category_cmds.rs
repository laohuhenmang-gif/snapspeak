use std::sync::Arc;
use tauri::State;
use crate::error::AppError;
use crate::models::{Category, CategoryInput};
use crate::storage::{JsonStorage, CategoryRepository};

#[tauri::command]
pub fn list_categories(storage: State<'_, Arc<JsonStorage>>) -> Result<Vec<Category>, AppError> {
    Ok(storage.list_categories())
}

#[tauri::command]
pub fn add_category(storage: State<'_, Arc<JsonStorage>>, input: CategoryInput) -> Result<Category, AppError> {
    if input.name.trim().is_empty() {
        return Err(AppError::Validation("分类名称不能为空".into()));
    }
    Ok(storage.add_category(input))
}

#[tauri::command]
pub fn update_category(storage: State<'_, Arc<JsonStorage>>, id: String, input: CategoryInput) -> Result<Category, AppError> {
    if input.name.trim().is_empty() {
        return Err(AppError::Validation("分类名称不能为空".into()));
    }
    storage.update_category(&id, input).ok_or_else(|| AppError::NotFound(format!("分类 {} 不存在", id)))
}

#[tauri::command]
pub fn delete_category(storage: State<'_, Arc<JsonStorage>>, id: String) -> Result<(), AppError> {
    if !storage.delete_category(&id) {
        return Err(AppError::NotFound(format!("分类 {} 不存在", id)));
    }
    Ok(())
}
