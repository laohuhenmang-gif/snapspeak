const views = {
  today: 'view-today',
  weekly: 'view-weekly',
  tasks: 'view-tasks',
  settings: 'view-settings',
};

let currentRoute = 'today';
let renderFunctions = {};

export function registerView(name, renderFn) {
  renderFunctions[name] = renderFn;
}

export async function navigateTo(route) {
  if (!views[route]) return;
  currentRoute = route;

  document.querySelectorAll('.view').forEach(el => el.classList.remove('active-view'));
  document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));

  const viewEl = document.getElementById(views[route]);
  if (viewEl) viewEl.classList.add('active-view');

  const navLink = document.querySelector(`.nav-link[href="#${route}"]`);
  if (navLink) navLink.classList.add('active');

  if (renderFunctions[route]) {
    await renderFunctions[route]();
  }
}

export function initRouter() {
  const handleHash = async () => {
    const hash = location.hash.replace('#', '') || 'today';
    await navigateTo(hash);
  };

  window.addEventListener('hashchange', handleHash);
  handleHash();
}
