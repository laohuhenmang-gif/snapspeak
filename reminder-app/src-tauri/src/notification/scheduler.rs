use std::sync::Arc;
use std::collections::HashSet;
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use tauri::AppHandle;
use tauri::Emitter;
use crate::models::Task;
use crate::storage::{JsonStorage, TaskRepository};

type NotifiedKey = (String, String);

pub struct ReminderScheduler {
    storage: Arc<JsonStorage>,
    app_handle: AppHandle,
    notified: Arc<Mutex<HashSet<NotifiedKey>>>,
}

impl ReminderScheduler {
    pub fn new(storage: Arc<JsonStorage>, app_handle: AppHandle) -> Self {
        ReminderScheduler {
            storage,
            app_handle,
            notified: Arc::new(Mutex::new(HashSet::new())),
        }
    }

    pub fn start(&self) {
        let storage = self.storage.clone();
        let app_handle = self.app_handle.clone();
        let notified = self.notified.clone();

        thread::spawn(move || {
            loop {
                thread::sleep(Duration::from_secs(30));

                let upcoming: Vec<Task> = storage.get_upcoming(5);
                let mut notified_set = notified.lock().unwrap();

                for task in &upcoming {
                    let key = (task.id.clone(), task.datetime.clone());
                    if !notified_set.contains(&key) {
                        let _ = app_handle.emit("reminder", task);
                        notified_set.insert(key);
                    }
                }

                if notified_set.len() > 5000 {
                    notified_set.clear();
                }
            }
        });
    }
}
