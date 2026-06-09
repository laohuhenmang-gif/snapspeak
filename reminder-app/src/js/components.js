export function renderPriorityBadge(priority) {
  return `<span class="priority-badge ${priority}">${priority}</span>`;
}

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function renderTagBadge(tag) {
  return `<span class="tag-badge">${escapeHtml(tag)}</span>`;
}

export function renderTaskCard(task, categories = []) {
  const cat = categories.find(c => c.id === task.category_id);
  const catBadge = cat ? `<span class="category-badge" style="background:${cat.color}22;color:${cat.color}">${cat.name}</span>` : '';
  const tagsHtml = task.tags.map(t => renderTagBadge(t)).join('');

  const timeHtml = task.datetime
    ? `<span class="task-time">${formatTime(task.datetime)}</span>`
    : '';

  return `
    <div class="task-card ${task.completed ? 'completed' : ''}" data-id="${task.id}">
      <div class="task-checkbox ${task.completed ? 'checked' : ''}" data-action="toggle">${task.completed ? '✓' : ''}</div>
      <div class="task-body">
        <div class="task-title">${escapeHtml(task.title)}</div>
        ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}
        <div class="task-meta">
          ${renderPriorityBadge(task.priority)}
          ${catBadge}
          ${tagsHtml}
          ${timeHtml}
          ${task.recurring !== 'none' ? `<span class="tag-badge">🔄 ${task.recurring}</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-icon" data-action="edit" title="编辑">✏️</button>
        <button class="btn-icon danger" data-action="delete" title="删除">🗑️</button>
      </div>
    </div>
  `;
}

export function renderModal(html) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  content.innerHTML = html;
  overlay.classList.remove('hidden');

  overlay.dataset.listenerAttached = 'true';
}

document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) {
    closeModal();
  }
});

export function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

export function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px;
    padding: 12px 24px; border-radius: 8px;
    background: ${type === 'error' ? '#e74c3c' : '#27ae60'};
    color: white; font-size: 14px; z-index: 2000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    animation: fadeIn 0.3s;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function formatTime(datetime) {
  if (!datetime) return '';
  const d = new Date(datetime);
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  if (d.toDateString() === now.toDateString()) return `今天 ${time}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return `明天 ${time}`;

  return `${d.getMonth() + 1}/${d.getDate()} ${time}`;
}
