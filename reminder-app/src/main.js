import { initRouter, registerView, navigateTo } from './js/router.js';
import { initNotification } from './js/notification.js';
import { showAddForm, showEditForm } from './js/task-form.js';
import { renderTaskCard, closeModal, showToast } from './js/components.js';
import { renderWeeklyView } from './js/weekly-grid.js';
import * as api from './js/api.js';

let currentTasks = [];
let currentCategories = [];

function nowLocalStr() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 19);
}

async function renderTodayView() {
  const container = document.getElementById('view-today');
  const today = new Date().toISOString().slice(0, 10);
  let tasks = [];
  try {
    tasks = await api.getTasksByDate(today);
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><p>加载失败，请重试</p><button class="btn-primary" onclick="window.__refreshCurrentView()">重试</button></div>';
    return;
  }
  currentTasks = tasks;
  currentCategories = await api.listCategories();

  const nowLocal = nowLocalStr();
  const overdue = tasks.filter(t => !t.completed && t.datetime < nowLocal);
  const upcoming = tasks.filter(t => !t.completed && t.datetime >= nowLocal);
  const completed = tasks.filter(t => t.completed);

  container.innerHTML = `
    <div class="view-header">
      <h2>📅 今日待办</h2>
      <span style="color:#7f8c8d;font-size:14px">${tasks.filter(t => !t.completed).length} 项未完成</span>
    </div>
    ${overdue.length > 0 ? `
      <h3 style="color:#e74c3c;margin-bottom:12px">⚠️ 已逾期 (${overdue.length})</h3>
      ${overdue.map(t => renderTaskCard(t, currentCategories)).join('')}
    ` : ''}
    ${upcoming.length > 0 ? `
      <h3 style="margin-bottom:12px;margin-top:16px">📌 待完成 (${upcoming.length})</h3>
      ${upcoming.map(t => renderTaskCard(t, currentCategories)).join('')}
    ` : ''}
    ${completed.length > 0 ? `
      <h3 style="margin-bottom:12px;margin-top:16px;color:#7f8c8d">✅ 已完成 (${completed.length})</h3>
      ${completed.map(t => renderTaskCard(t, currentCategories)).join('')}
    ` : ''}
    ${tasks.length === 0 ? '<div class="empty-state"><p>今日暂无任务</p><p style="font-size:13px">点击左侧「新建任务」添加</p></div>' : ''}
  `;

  attachTaskEvents();
}

async function renderAllTasksView() {
  const container = document.getElementById('view-tasks');
  let tasks = [];
  try {
    tasks = await api.listTasks();
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><p>加载失败</p></div>';
    return;
  }
  currentTasks = tasks;
  currentCategories = await api.listCategories();

  container.innerHTML = `
    <div class="view-header">
      <h2>📝 全部任务</h2>
      <span style="color:#7f8c8d;font-size:14px">共 ${tasks.length} 项</span>
    </div>
    <div class="filter-bar">
      <input type="text" id="task-search" placeholder="搜索任务..." />
      <select id="filter-priority">
        <option value="">全部优先级</option>
        <option value="高">高</option>
        <option value="中">中</option>
        <option value="低">低</option>
      </select>
      <select id="filter-status">
        <option value="">全部状态</option>
        <option value="active">未完成</option>
        <option value="completed">已完成</option>
      </select>
    </div>
    <div id="tasks-list">
      ${renderFilteredTasks(tasks, currentCategories)}
    </div>
  `;

  document.getElementById('task-search')?.addEventListener('input', applyFilters);
  document.getElementById('filter-priority')?.addEventListener('change', applyFilters);
  document.getElementById('filter-status')?.addEventListener('change', applyFilters);
  attachTaskEvents();
}

function renderFilteredTasks(tasks, categories) {
  const search = (document.getElementById('task-search')?.value || '').toLowerCase();
  const priority = document.getElementById('filter-priority')?.value || '';
  const status = document.getElementById('filter-status')?.value || '';

  let filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search) && !(t.description || '').toLowerCase().includes(search)) return false;
    if (priority && t.priority !== priority) return false;
    if (status === 'active' && t.completed) return false;
    if (status === 'completed' && !t.completed) return false;
    return true;
  });

  if (filtered.length === 0) {
    return '<div class="empty-state"><p>没有匹配的任务</p></div>';
  }
  return filtered.map(t => renderTaskCard(t, categories)).join('');
}

function applyFilters() {
  const list = document.getElementById('tasks-list');
  if (list) {
    list.innerHTML = renderFilteredTasks(currentTasks, currentCategories);
    attachTaskEvents();
  }
}

async function renderSettingsView() {
  const container = document.getElementById('view-settings');
  const categories = await api.listCategories();

  container.innerHTML = `
    <div class="view-header">
      <h2>⚙️ 设置</h2>
    </div>
    <div class="settings-section">
      <h3>分类管理</h3>
      <div id="categories-list">
        ${categories.map(c => `
          <div class="category-item">
            <span class="category-color" style="background:${c.color}"></span>
            <span class="category-name">${c.name}</span>
            <div class="category-actions">
              <button class="btn-icon" onclick="window.__editCat('${c.id}')">✏️</button>
              <button class="btn-icon danger" onclick="window.__deleteCat('${c.id}')">�️</button>
            </div>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:12px">
        <button class="btn-primary" onclick="window.__addCat()">+ 添加分类</button>
      </div>
    </div>
    <div class="settings-section">
      <h3>数据管理</h3>
      <button class="btn-primary" id="btn-export-data">📦 导出数据</button>
      <p style="color:#7f8c8d;font-size:13px;margin-top:8px">导出所有任务和分类为 JSON 文件</p>
    </div>
    <div class="settings-section">
      <h3>关于</h3>
      <p style="color:#7f8c8d;font-size:14px">工作备忘 v1.0.0</p>
      <p style="color:#7f8c8d;font-size:14px">Tauri + Rust 桌面提醒应用 · 成熟稳定版</p>
    </div>
  `;

  window.__addCat = async () => {
    const name = prompt('分类名称:');
    if (!name) return;
    const color = prompt('颜色 (如 #4A90D9):', '#4A90D9');
    if (!color) return;
    await api.addCategory({ name, color });
    renderSettingsView();
  };

  window.__editCat = async (id) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;
    const name = prompt('分类名称:', cat.name);
    if (!name) return;
    const color = prompt('颜色:', cat.color);
    if (!color) return;
    await api.updateCategory(id, { name, color });
    renderSettingsView();
  };

  window.__deleteCat = async (id) => {
    if (!confirm('确定删除该分类？')) return;
    await api.deleteCategory(id);
    renderSettingsView();
  };

  document.getElementById('btn-export-data')?.addEventListener('click', async () => {
    try {
      const data = await api.exportData();
      const dialog = await import('@tauri-apps/plugin-dialog');
      const path = await dialog.save({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        defaultPath: `工作备忘-${new Date().toISOString().slice(0, 10)}.json`,
      });
      if (!path) return;
      await api.writeExportFile(path, JSON.stringify(data, null, 2));
      showToast('数据已导出', 'success');
    } catch (e) {
      showToast('导出失败: ' + e, 'error');
    }
  });
}

function attachTaskEvents() {
  document.querySelectorAll('.task-card').forEach(card => {
    const id = card.dataset.id;

    card.querySelector('[data-action="toggle"]')?.addEventListener('click', async () => {
      await api.toggleComplete(id);
      refreshCurrentView();
    });

    card.querySelector('[data-action="edit"]')?.addEventListener('click', async () => {
      const task = currentTasks.find(t => t.id === id);
      if (task) await showEditForm(task);
    });

    card.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
      if (!confirm('确定删除？')) return;
      await api.deleteTask(id);
      refreshCurrentView();
    });
  });
}

async function refreshCurrentView() {
  const hash = location.hash.replace('#', '') || 'today';
  await navigateTo(hash);
}

window.__refreshCurrentView = refreshCurrentView;

document.getElementById('btn-add-task')?.addEventListener('click', () => {
  showAddForm();
});

registerView('today', renderTodayView);
registerView('weekly', renderWeeklyView);
registerView('tasks', renderAllTasksView);
registerView('settings', renderSettingsView);

initRouter();

if (window.__TAURI__) {
  initNotification();
}
