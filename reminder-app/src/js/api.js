import { invoke } from '@tauri-apps/api/core';

export async function listTasks() {
  return await invoke('list_tasks');
}

export async function getTask(id) {
  return await invoke('get_task', { id });
}

export async function addTask(input) {
  return await invoke('add_task', { input });
}

export async function updateTask(id, input) {
  return await invoke('update_task', { id, input });
}

export async function deleteTask(id) {
  return await invoke('delete_task', { id });
}

export async function toggleComplete(id) {
  return await invoke('toggle_complete', { id });
}

export async function getTasksByDate(date) {
  return await invoke('get_tasks_by_date', { date });
}

export async function getWeekTasks(start, end) {
  return await invoke('get_week_tasks', { start, end });
}

export async function getUpcoming(withinMins) {
  return await invoke('get_upcoming', { withinMins });
}

export async function listCategories() {
  return await invoke('list_categories');
}

export async function addCategory(input) {
  return await invoke('add_category', { input });
}

export async function updateCategory(id, input) {
  return await invoke('update_category', { id, input });
}

export async function deleteCategory(id) {
  return await invoke('delete_category', { id });
}

export async function exportData() {
  return await invoke('export_data');
}

export async function writeExportFile(path, data) {
  return await invoke('write_export_file', { path, data });
}
