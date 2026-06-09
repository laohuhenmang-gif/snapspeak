use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum Priority {
    高,
    中,
    低,
}

impl std::fmt::Display for Priority {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Priority::高 => write!(f, "高"),
            Priority::中 => write!(f, "中"),
            Priority::低 => write!(f, "低"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum RecurringType {
    #[serde(rename = "none")]
    None,
    每天,
    每周,
    每月,
}

impl std::fmt::Display for RecurringType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RecurringType::None => write!(f, "none"),
            RecurringType::每天 => write!(f, "每天"),
            RecurringType::每周 => write!(f, "每周"),
            RecurringType::每月 => write!(f, "每月"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: String,
    pub datetime: String,
    pub priority: Priority,
    pub category_id: Option<String>,
    pub tags: Vec<String>,
    pub recurring: RecurringType,
    pub recurring_end: Option<String>,
    pub completed: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskInput {
    pub title: String,
    pub description: String,
    pub datetime: String,
    pub priority: Priority,
    pub category_id: Option<String>,
    pub tags: Vec<String>,
    pub recurring: RecurringType,
    pub recurring_end: Option<String>,
}
