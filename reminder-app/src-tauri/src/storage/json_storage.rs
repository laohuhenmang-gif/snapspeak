use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use chrono::{Duration, NaiveDateTime, Datelike};
use uuid::Uuid;

use crate::error::AppError;
use crate::models::{Task, TaskInput, Category, CategoryInput, RecurringType};
use super::traits::{TaskRepository, CategoryRepository};

#[derive(serde::Serialize, serde::Deserialize)]
struct JsonData {
    tasks: Vec<Task>,
    categories: Vec<Category>,
}

pub struct JsonStorage {
    data: Mutex<JsonData>,
    tasks_path: PathBuf,
    categories_path: PathBuf,
}

impl JsonStorage {
    pub fn new(data_dir: PathBuf) -> Self {
        fs::create_dir_all(&data_dir).ok();
        let tasks_path = data_dir.join("tasks.json");
        let categories_path = data_dir.join("categories.json");

        let tasks = match Self::load_json::<Task>(&tasks_path) {
            Ok(t) => t,
            Err(e) => {
                eprintln!("[工作备忘] 警告: {}", e);
                Vec::new()
            }
        };
        let categories = match Self::load_json::<Category>(&categories_path) {
            Ok(c) => c,
            Err(e) => {
                eprintln!("[工作备忘] 警告: {}", e);
                Vec::new()
            }
        };

        let data = JsonData { tasks, categories };
        JsonStorage { data: Mutex::new(data), tasks_path, categories_path }
    }

    fn load_json<T: serde::de::DeserializeOwned>(path: &PathBuf) -> Result<Vec<T>, AppError> {
        if path.exists() {
            let content = fs::read_to_string(path)
                .map_err(|e| AppError::Io(e))?;
            serde_json::from_str(&content).map_err(|e| {
                AppError::CorruptedData(format!(
                    "文件损坏 ({}): {}. 将使用空数据替换",
                    path.display(),
                    e
                ))
            })
        } else {
            Ok(Vec::new())
        }
    }

    fn save_tasks(&self, tasks: &[Task]) {
        match serde_json::to_string_pretty(tasks) {
            Ok(json) => {
                if let Err(e) = fs::write(&self.tasks_path, json) {
                    eprintln!("[工作备忘] 错误: 保存任务失败 - {}", e);
                }
            }
            Err(e) => eprintln!("[工作备忘] 错误: 序列化任务失败 - {}", e),
        }
    }

    fn save_categories(&self, categories: &[Category]) {
        match serde_json::to_string_pretty(categories) {
            Ok(json) => {
                if let Err(e) = fs::write(&self.categories_path, json) {
                    eprintln!("[工作备忘] 错误: 保存分类失败 - {}", e);
                }
            }
            Err(e) => eprintln!("[工作备忘] 错误: 序列化分类失败 - {}", e),
        }
    }

    pub fn advance_recurring_task(&self, id: &str) -> Option<Task> {
        let mut data = self.data.lock().unwrap();
        let idx = data.tasks.iter().position(|t| t.id == id)?;
        let task = &data.tasks[idx];

        if task.recurring == RecurringType::None {
            return None;
        }

        if task.datetime.is_empty() {
            return None;
        }

        if let Some(end) = &task.recurring_end {
            if &task.datetime >= end {
                return None;
            }
        }

        let dt = NaiveDateTime::parse_from_str(&task.datetime, "%Y-%m-%dT%H:%M:%S").ok()?;
        let next_dt = match task.recurring {
            RecurringType::None => return None,
            RecurringType::每天 => dt + chrono::Duration::days(1),
            RecurringType::每周 => dt + chrono::Duration::weeks(1),
            RecurringType::每月 => {
                if dt.month() == 12 {
                    NaiveDateTime::new(
                        chrono::NaiveDate::from_ymd_opt(dt.year() + 1, 1, dt.day().min(28)).unwrap_or_default(),
                        dt.time(),
                    )
                } else {
                    NaiveDateTime::new(
                        chrono::NaiveDate::from_ymd_opt(dt.year(), dt.month() + 1, dt.day().min(28)).unwrap_or_default(),
                        dt.time(),
                    )
                }
            }
        };

        if let Some(end) = &task.recurring_end {
            if next_dt.format("%Y-%m-%dT%H:%M:%S").to_string() > *end {
                return None;
            }
        }

        let next_str = next_dt.format("%Y-%m-%dT%H:%M:%S").to_string();
        data.tasks[idx].datetime = next_str;
        data.tasks[idx].completed = false;
        let updated = data.tasks[idx].clone();
        self.save_tasks(&data.tasks);
        Some(updated)
    }
}

impl TaskRepository for JsonStorage {
    fn list_tasks(&self) -> Vec<Task> {
        self.data.lock().unwrap().tasks.clone()
    }

    fn get_task(&self, id: &str) -> Option<Task> {
        self.data.lock().unwrap().tasks.iter().find(|t| t.id == id).cloned()
    }

    fn add_task(&self, input: TaskInput) -> Task {
        let now = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
        let task = Task {
            id: Uuid::new_v4().to_string(),
            title: input.title,
            description: input.description,
            datetime: input.datetime,
            priority: input.priority,
            category_id: input.category_id,
            tags: input.tags,
            recurring: input.recurring,
            recurring_end: input.recurring_end,
            completed: false,
            created_at: now,
        };
        let mut data = self.data.lock().unwrap();
        data.tasks.push(task.clone());
        self.save_tasks(&data.tasks);
        task
    }

    fn update_task(&self, id: &str, input: TaskInput) -> Option<Task> {
        let mut data = self.data.lock().unwrap();
        if let Some(task) = data.tasks.iter_mut().find(|t| t.id == id) {
            task.title = input.title;
            task.description = input.description;
            task.datetime = input.datetime;
            task.priority = input.priority;
            task.category_id = input.category_id;
            task.tags = input.tags;
            task.recurring = input.recurring;
            task.recurring_end = input.recurring_end;
            let updated = task.clone();
            self.save_tasks(&data.tasks);
            Some(updated)
        } else {
            None
        }
    }

    fn delete_task(&self, id: &str) -> bool {
        let mut data = self.data.lock().unwrap();
        let len_before = data.tasks.len();
        data.tasks.retain(|t| t.id != id);
        if data.tasks.len() < len_before {
            self.save_tasks(&data.tasks);
            true
        } else {
            false
        }
    }

    fn toggle_complete(&self, id: &str) -> Option<Task> {
        let mut data = self.data.lock().unwrap();
        if let Some(task) = data.tasks.iter_mut().find(|t| t.id == id) {
            task.completed = !task.completed;
            let updated = task.clone();
            self.save_tasks(&data.tasks);
            Some(updated)
        } else {
            None
        }
    }

    fn get_tasks_by_date(&self, date: &str) -> Vec<Task> {
        let data = self.data.lock().unwrap();
        data.tasks.iter()
            .filter(|t| t.datetime.starts_with(date))
            .cloned()
            .collect()
    }

    fn get_tasks_by_week(&self, start: &str, end: &str) -> Vec<Task> {
        let data = self.data.lock().unwrap();
        data.tasks.iter()
            .filter(|t| t.datetime.as_str() >= start && t.datetime.as_str() <= end)
            .cloned()
            .collect()
    }

    fn get_upcoming(&self, within_minutes: i64) -> Vec<Task> {
        let now = chrono::Local::now();
        let deadline = now + Duration::minutes(within_minutes);
        let now_str = now.format("%Y-%m-%dT%H:%M:%S").to_string();
        let deadline_str = deadline.format("%Y-%m-%dT%H:%M:%S").to_string();

        let data = self.data.lock().unwrap();
        data.tasks.iter()
            .filter(|t| {
                !t.completed
                && t.datetime >= now_str
                && t.datetime <= deadline_str
            })
            .cloned()
            .collect()
    }
}

impl CategoryRepository for JsonStorage {
    fn list_categories(&self) -> Vec<Category> {
        self.data.lock().unwrap().categories.clone()
    }

    fn add_category(&self, input: CategoryInput) -> Category {
        let cat = Category {
            id: format!("cat-{}", &Uuid::new_v4().to_string()[..8]),
            name: input.name,
            color: input.color,
        };
        let mut data = self.data.lock().unwrap();
        data.categories.push(cat.clone());
        self.save_categories(&data.categories);
        cat
    }

    fn update_category(&self, id: &str, input: CategoryInput) -> Option<Category> {
        let mut data = self.data.lock().unwrap();
        if let Some(cat) = data.categories.iter_mut().find(|c| c.id == id) {
            cat.name = input.name;
            cat.color = input.color;
            let updated = cat.clone();
            self.save_categories(&data.categories);
            Some(updated)
        } else {
            None
        }
    }

    fn delete_category(&self, id: &str) -> bool {
        let mut data = self.data.lock().unwrap();
        let len_before = data.categories.len();
        data.categories.retain(|c| c.id != id);
        if data.categories.len() < len_before {
            self.save_categories(&data.categories);
            true
        } else {
            false
        }
    }
}
