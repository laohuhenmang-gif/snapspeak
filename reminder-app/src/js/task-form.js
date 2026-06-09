import { addTask, updateTask, listCategories } from './api.js';
import { renderModal, closeModal, escapeHtml } from './components.js';

function toLocalDatetime(dt) {
  if (!dt) return '';
  return dt.slice(0, 19);
}

export async function showAddForm() {
  const categories = await listCategories();
  const catOptions = categories.map(c =>
    `<option value="${c.id}">${escapeHtml(c.name)}</option>`
  ).join('');

  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const localISo = new Date(now.getTime() - offset).toISOString().slice(0, 16);

  renderModal(`
    <h3>新建任务</h3>
    <form id="task-form">
      <div class="form-group">
        <label>标题 *</label>
        <input type="text" name="title" required placeholder="输入任务标题" />
      </div>
      <div class="form-group">
        <label>描述</label>
        <textarea name="description" placeholder="任务描述（可选）"></textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>日期时间</label>
          <input type="datetime-local" name="datetime" value="${localISo}" />
        </div>
        <div class="form-group">
          <label>优先级</label>
          <select name="priority">
            <option value="中">中</option>
            <option value="高">高</option>
            <option value="低">低</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>分类</label>
          <select name="category_id">
            <option value="">无分类</option>
            ${catOptions}
          </select>
        </div>
        <div class="form-group">
          <label>重复</label>
          <select name="recurring">
            <option value="none">不重复</option>
            <option value="每天">每天</option>
            <option value="每周">每周</option>
            <option value="每月">每月</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>标签（逗号分隔）</label>
        <input type="text" name="tags" placeholder="如: 工作,紧急" />
      </div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" onclick="window.__closeModal()">取消</button>
        <button type="submit" class="btn-primary">创建</button>
      </div>
    </form>
  `);

  window.__closeModal = closeModal;

  document.getElementById('task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const tags = data.get('tags') ? data.get('tags').split(/[,，]/).map(s => s.trim()).filter(Boolean) : [];
    const input = {
      title: data.get('title'),
      description: data.get('description') || '',
      datetime: toLocalDatetime(data.get('datetime')),
      priority: data.get('priority'),
      category_id: data.get('category_id') || null,
      tags,
      recurring: data.get('recurring') || 'none',
      recurring_end: null,
    };
    try {
      await addTask(input);
      closeModal();
      window.__refreshCurrentView && window.__refreshCurrentView();
    } catch (err) {
      alert('创建失败: ' + err);
    }
  });
}

export async function showEditForm(task) {
  const categories = await listCategories();
  const catOptions = categories.map(c =>
    `<option value="${c.id}" ${c.id === task.category_id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
  ).join('');

  const dt = task.datetime ? task.datetime.slice(0, 16) : '';

  renderModal(`
    <h3>编辑任务</h3>
    <form id="task-form">
      <div class="form-group">
        <label>标题 *</label>
        <input type="text" name="title" required value="${escapeHtml(task.title)}" />
      </div>
      <div class="form-group">
        <label>描述</label>
        <textarea name="description">${escapeHtml(task.description || '')}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>日期时间</label>
          <input type="datetime-local" name="datetime" value="${dt}" />
        </div>
        <div class="form-group">
          <label>优先级</label>
          <select name="priority">
            <option value="高" ${task.priority === '高' ? 'selected' : ''}>高</option>
            <option value="中" ${task.priority === '中' ? 'selected' : ''}>中</option>
            <option value="低" ${task.priority === '低' ? 'selected' : ''}>低</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>分类</label>
          <select name="category_id">
            <option value="">无分类</option>
            ${catOptions}
          </select>
        </div>
        <div class="form-group">
          <label>重复</label>
          <select name="recurring">
            <option value="none" ${task.recurring === 'none' ? 'selected' : ''}>不重复</option>
            <option value="每天" ${task.recurring === '每天' ? 'selected' : ''}>每天</option>
            <option value="每周" ${task.recurring === '每周' ? 'selected' : ''}>每周</option>
            <option value="每月" ${task.recurring === '每月' ? 'selected' : ''}>每月</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>标签（逗号分隔）</label>
        <input type="text" name="tags" value="${(task.tags || []).join(',')}" />
      </div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" onclick="window.__closeModal()">取消</button>
        <button type="submit" class="btn-primary">保存</button>
      </div>
    </form>
  `);

  window.__closeModal = closeModal;

  document.getElementById('task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const tags = data.get('tags') ? data.get('tags').split(/[,，]/).map(s => s.trim()).filter(Boolean) : [];
    const input = {
      title: data.get('title'),
      description: data.get('description') || '',
      datetime: toLocalDatetime(data.get('datetime')),
      priority: data.get('priority'),
      category_id: data.get('category_id') || null,
      tags,
      recurring: data.get('recurring') || 'none',
      recurring_end: null,
    };
    try {
      await updateTask(task.id, input);
      closeModal();
      window.__refreshCurrentView && window.__refreshCurrentView();
    } catch (err) {
      alert('更新失败: ' + err);
    }
  });
}
