use crate::models::{Task, TaskInput, Category, CategoryInput};

pub trait TaskRepository: Send + Sync {
    fn list_tasks(&self) -> Vec<Task>;
    fn get_task(&self, id: &str) -> Option<Task>;
    fn add_task(&self, input: TaskInput) -> Task;
    fn update_task(&self, id: &str, input: TaskInput) -> Option<Task>;
    fn delete_task(&self, id: &str) -> bool;
    fn toggle_complete(&self, id: &str) -> Option<Task>;
    fn get_tasks_by_date(&self, date: &str) -> Vec<Task>;
    fn get_tasks_by_week(&self, start: &str, end: &str) -> Vec<Task>;
    fn get_upcoming(&self, within_minutes: i64) -> Vec<Task>;
}

pub trait CategoryRepository: Send + Sync {
    fn list_categories(&self) -> Vec<Category>;
    fn add_category(&self, input: CategoryInput) -> Category;
    fn update_category(&self, id: &str, input: CategoryInput) -> Option<Category>;
    fn delete_category(&self, id: &str) -> bool;
}
