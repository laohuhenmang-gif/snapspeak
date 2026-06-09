import { getWeekTasks } from './api.js';
import { renderPriorityBadge } from './components.js';

export async function renderWeeklyView() {
  const container = document.getElementById('view-weekly');
  container.innerHTML = '<div class="view-header"><h2>周视图</h2></div><div class="week-grid"></div>';

  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const grid = container.querySelector('.week-grid');

  const startStr = monday.toISOString().slice(0, 10);
  const endDate = new Date(monday);
  endDate.setDate(monday.getDate() + 6);
  const endStr = endDate.toISOString().slice(0, 10);

  let tasksByDay = {};
  try {
    const tasks = await getWeekTasks(startStr, endStr);
    for (const task of tasks) {
      const dayKey = task.datetime ? task.datetime.slice(0, 10) : '';
      if (!tasksByDay[dayKey]) tasksByDay[dayKey] = [];
      tasksByDay[dayKey].push(task);
    }
  } catch (e) {
    // empty
  }

  const todayStr = now.toISOString().slice(0, 10);

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateStr = date.toISOString().slice(0, 10);
    const isToday = dateStr === todayStr;
    const isPast = date < new Date(todayStr) && !isToday;
    const dayTasks = tasksByDay[dateStr] || [];

    const dayEl = document.createElement('div');
    dayEl.className = `week-day${isToday ? ' today' : ''}${isPast ? ' past' : ''}`;
    dayEl.innerHTML = `
      <div class="week-day-header">
        ${days[i]}<br/>
        <small>${date.getMonth() + 1}/${date.getDate()}</small>
      </div>
      ${dayTasks.map(task => `
        <div class="week-task" style="border-left: 3px solid ${getPriorityColor(task.priority)}" data-id="${task.id}">
          <strong>${formatHour(task.datetime)}</strong><br/>
          ${task.title}
        </div>
      `).join('')}
    `;

    dayEl.querySelectorAll('.week-task').forEach(el => {
      el.addEventListener('click', () => {
        location.hash = '#today';
      });
    });

    grid.appendChild(dayEl);
  }
}

function getPriorityColor(p) {
  return p === '高' ? '#e74c3c' : p === '中' ? '#f39c12' : '#27ae60';
}

function formatHour(datetime) {
  if (!datetime) return '';
  const d = new Date(datetime);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
