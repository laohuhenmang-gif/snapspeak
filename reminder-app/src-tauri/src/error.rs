use serde::Serialize;

#[derive(Debug)]
pub enum AppError {
    NotFound(String),
    Io(std::io::Error),
    Serde(serde_json::Error),
    CorruptedData(String),
    Validation(String),
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::NotFound(msg) => write!(f, "未找到: {}", msg),
            AppError::Io(e) => write!(f, "IO 错误: {}", e),
            AppError::Serde(e) => write!(f, "序列化错误: {}", e),
            AppError::CorruptedData(msg) => write!(f, "{}", msg),
            AppError::Validation(msg) => write!(f, "验证失败: {}", msg),
        }
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::Io(e)
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        AppError::Serde(e)
    }
}

impl From<AppError> for String {
    fn from(e: AppError) -> String {
        e.to_string()
    }
}
