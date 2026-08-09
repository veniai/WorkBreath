const icon = (name, extra = '') => `<svg class="${extra}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;

const navItems = [
  ['overview', '概览'], ['eye', '护眼'], ['timeline', '时间线'], ['report', '日报'],
  ['ask', '助手'], ['settings', '设置'], ['info', '关于'],
];

const categories = [
  { key: 'dev', name: '开发', value: '3h07m', pct: 42, color: '#2f78e8' },
  { key: 'meet', name: '会议', value: '1h20m', pct: 18, color: '#cf812c' },
  { key: 'doc', name: '文档', value: '1h07m', pct: 15, color: '#835ad8' },
  { key: 'comm', name: '沟通', value: '53m', pct: 12, color: '#159b76' },
  { key: 'ent', name: '娱乐', value: '36m', pct: 8, color: '#d34b5d' },
  { key: 'other', name: '其他', value: '21m', pct: 5, color: '#8b9aa6' },
];

const hours = {
  7: { other: 5 }, 8: { comm: 10, other: 4 }, 9: { dev: 12, comm: 6, other: 4 },
  10: { dev: 40, doc: 8, meet: 4 }, 11: { dev: 36, doc: 6, comm: 5 },
  12: { meet: 14, comm: 6, ent: 4 }, 13: { ent: 8, other: 5 },
  14: { meet: 22, dev: 10, doc: 6 }, 15: { dev: 30, doc: 10, comm: 4 },
  16: { dev: 28, doc: 9, comm: 4 }, 17: { dev: 15, doc: 11, meet: 6, comm: 5 },
  18: { dev: 12, comm: 8, ent: 5 }, 19: { ent: 6 }, 20: { other: 8 },
  21: { dev: 22, doc: 10 }, 22: { dev: 12, ent: 9 },
};

const domains = [
  ['G', 'github.com', '代码评审 · 21 页', 100, '1h52m'],
  ['L', 'localhost:5173', '本地开发', 52, '58m'],
  ['D', 'docs.google.com', '方案文档 · 6 页', 37, '41m'],
  ['S', 'stackoverflow.com', '搜索 · 11 页', 29, '33m'],
  ['C', 'chat.openai.com', 'AI 辅助', 24, '27m'],
  ['B', 'bilibili.com', '娱乐 · 4 页', 17, '19m'],
];

const apps = [
  ['P', 'PyCharm', '开发', 100, '3h12m'], ['C', 'Chrome', '浏览', 76, '2h26m'],
  ['i', 'iTerm', '终端', 24, '47m'], ['微', '微信', '沟通', 20, '38m'],
  ['F', 'Figma', '设计', 11, '21m'], ['O', 'Obsidian', '笔记', 7, '13m'],
];

function symbols() {
  return `<svg class="sr-only" width="0" height="0" aria-hidden="true">
    <symbol id="i-overview" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></symbol>
    <symbol id="i-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M2.8 12s3.5-5.2 9.2-5.2 9.2 5.2 9.2 5.2-3.5 5.2-9.2 5.2S2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="2.4"/></symbol>
    <symbol id="i-timeline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5l3.2 2"/></symbol>
    <symbol id="i-report" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 3.8h8l4 4V20H6z"/><path d="M14 3.8V8h4M9 12h6M9 15.5h6"/></symbol>
    <symbol id="i-ask" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 5.5h16v12H9l-4.5 3v-3H4z"/><path d="M8 10h8M8 13.5h5"/></symbol>
    <symbol id="i-settings" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.6a7 7 0 0 0-.7-1.6l1-1.8-2.1-2.1-1.8 1A7 7 0 0 0 11.5 5l-.6-2h-3l-.6 2a7 7 0 0 0-1.6.7l-1.8-1-2.1 2.1 1 1.8A7 7 0 0 0 2 10.5l-2 .6v3l2 .6a7 7 0 0 0 .7 1.6l-1 1.8 2.1 2.1 1.8-1a7 7 0 0 0 1.6.7l.6 2h3l.6-2a7 7 0 0 0 1.6-.7l1.8 1 2.1-2.1-1-1.8a7 7 0 0 0 .7-1.6Z" transform="translate(2.1 -.6) scale(.82)"/></symbol>
    <symbol id="i-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8.5"/><path d="M12 10.5v6M12 7.5h.01"/></symbol>
    <symbol id="i-pause" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></symbol>
    <symbol id="i-play" viewBox="0 0 24 24" fill="currentColor"><path d="m7 4 13 8-13 8z"/></symbol>
    <symbol id="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20 15.4A8.5 8.5 0 0 1 8.6 4 8.5 8.5 0 1 0 20 15.4Z"/></symbol>
    <symbol id="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"/></symbol>
    <symbol id="i-spark" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.7 1.8 6 6 1.8-6 1.8-1.8 6-1.8-6-6-1.8 6-1.8zM19 16l.8 2.2 2.2.8-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/></symbol>
    <symbol id="i-view" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 7h14M5 12h10M5 17h7"/></symbol>
    <symbol id="i-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m7 7 10 10M17 7 7 17"/></symbol>
    <symbol id="i-min" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 12h12"/></symbol>
    <symbol id="i-max" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="6" y="6" width="12" height="12"/></symbol>
    <symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 4 4 10-10"/></symbol>
  </svg>`;
}

function usageRows(items, type) {
  return items.map(([letter, title, subtitle, width, time]) => `
    <button class="usage-row" data-detail="${type === 'domain' ? title : ''}" type="button">
      <span class="usage-name"><span class="usage-icon">${letter}</span><span class="usage-copy"><span class="usage-title">${title}</span><span class="usage-subtitle">${subtitle}</span></span></span>
      <span class="usage-track"><span class="usage-fill" style="width:${width}%"></span></span>
      <span class="usage-time num">${time}</span>
    </button>`).join('');
}

function template() {
  const isCompact = document.body.dataset.variant === 'compact';
  const variantName = isCompact ? '紧凑工作台' : '克制演进';
  const themeControl = isCompact
    ? ''
    : `<button class="icon-button" id="themeButton" type="button" aria-label="切换深色模式">${icon('moon')}</button>`;
  return `${symbols()}
  <main class="prototype-page">
    <section class="app-window" aria-label="Work Review ${variantName}原型">
      <header class="windowbar">
        <span class="windowbar-title">Work Review</span>
        <div class="window-controls" aria-hidden="true"><button class="window-control">${icon('min')}</button><button class="window-control">${icon('max')}</button><button class="window-control close">${icon('close')}</button></div>
      </header>
      <div class="workspace">
        <aside class="sidebar">
          <div class="brand-row"><span class="brand-mark"><img src="./assets/icon.png" alt="" /></span><div class="brand-copy"><h2 class="brand-name">Work Review</h2><div class="brand-edition">本地工作回顾</div></div></div>
          <div class="capture-panel" id="capturePanel"><span class="capture-dot"></span><span class="capture-copy"><span class="capture-title">正在记录</span><span class="capture-meta">仅保存在本机</span></span><button class="pause-btn" id="pauseButton" type="button" aria-label="暂停记录">${icon('pause')}</button></div>
          <div class="nav-label">工作空间</div>
          <nav class="nav-list" aria-label="主导航">
            ${navItems.map(([key, label], index) => `<button class="nav-item ${index === 0 ? 'active' : ''}" data-nav="${key}" type="button">${icon(key)}<span>${label}</span>${key === 'report' ? '<span class="count">1</span>' : ''}</button>`).join('')}
          </nav>
          <div class="sidebar-spacer"></div>
          <div class="sidebar-tools ${isCompact ? 'sidebar-tools-light-only' : ''}"><button class="locale-button" type="button">简体中文</button>${themeControl}</div>
        </aside>

        <section class="main">
          <div class="main-inner">
            <header class="page-head">
              <div class="heading-row"><span class="heading-icon">${icon('overview')}</span><div class="page-heading"><h1>概览</h1><p class="page-subtitle" id="pageSubtitle">8月9日 · 周日 · 16:26<span class="live-dot"></span></p></div></div>
              <div class="date-range"><input value="2026-08-03" aria-label="开始日期" /><span>—</span><input value="2026-08-09" aria-label="结束日期" /></div>
              <div class="range-control" role="group" aria-label="统计范围"><button class="range-button active" data-mode="today" type="button">今天</button><button class="range-button" data-mode="week" type="button">本周</button><button class="range-button" data-mode="custom" type="button">自定义</button></div>
            </header>

            <section class="insight"><span class="insight-mark">${icon('spark')}</span><p>今天最专注的是 <strong>10:00–12:00</strong>，连续工作 1h47m；总投入比上周日 <strong>多 42 分钟</strong>，主要来自「开发」。</p><button class="insight-link" type="button">查看本周回顾 →</button></section>

            <section class="summary-band" aria-label="关键指标">
              <article class="metric"><div class="metric-label">总投入</div><div class="metric-value num">7<small>h</small>24<small>m</small></div><div class="metric-delta"><span class="delta-up">↑ 42m</span> 较上周日</div></article>
              <article class="metric"><div class="metric-label">工作时长</div><div class="metric-value num">5<small>h</small>47<small>m</small></div><div class="metric-delta">占比 78% · 含加班 32m</div></article>
              <article class="metric"><div class="metric-label">专注峰值</div><div class="metric-value num">10–12<small>时</small></div><div class="metric-delta">最长连续专注 1h47m</div></article>
              <article class="metric"><div class="metric-label">娱乐占比</div><div class="metric-value num">8<small>%</small></div><div class="metric-delta"><span class="delta-down">↓ 5%</span> 较上周日</div></article>
            </section>

            <section class="panel panel-main">
              <div class="panel-head"><h2 class="panel-title" id="rhythmTitle">今日节奏</h2><span class="panel-meta" id="rhythmMeta">工作时段 09:00–18:00 · 点击分类筛选</span></div>
              <div class="today-view"><div class="composition" aria-label="分类构成">${categories.map(category => `<button type="button" data-category="${category.key}" style="width:${category.pct}%;background:${category.color}" aria-label="${category.name} ${category.value}"></button>`).join('')}</div>
                <div class="legend">${categories.map(category => `<button class="legend-item" type="button" data-category="${category.key}"><span class="legend-swatch" style="background:${category.color}"></span><span>${category.name}</span><b class="num">${category.value}</b><em>${category.pct}%</em></button>`).join('')}</div>
                <div class="chart-area"><div class="chart-grid">${'<span class="grid-line"></span>'.repeat(4)}</div><span class="work-zone"></span><span class="work-zone-label">工作时段</span><span class="chart-axis"><span>60m</span><span>40m</span><span>20m</span><span>0</span></span><div class="hour-bars" id="hourBars"></div></div>
                <div class="chart-note">高峰时段 10:00–12:00 · 累计 99m 开发、14m 文档、4m 会议</div>
              </div>
              <div class="week-view"><div class="week-chart">${[['一',72,'6h18m'],['二',84,'7h06m'],['三',64,'5h31m'],['四',92,'8h02m'],['五',82,'7h04m'],['六',28,'2h12m'],['日',78,'6h42m']].map(([day,height,value], index) => `<div class="day-bar ${index === 6 ? 'today' : ''}"><span class="day-value num">${index === 3 ? value : ''}</span><i style="height:${height}%"></i><span class="day-label">${day}</span></div>`).join('')}</div></div>
            </section>

            <div class="detail-grid">
              <section class="panel detail-panel"><div class="panel-head"><h2 class="panel-title">常驻网站</h2><span class="panel-meta">按域名聚合</span></div><div class="usage-list">${usageRows(domains, 'domain')}</div><div class="panel-footer">23 个站点 · 经 Chrome、Safari 访问 · <button type="button">查看全部 →</button></div></section>
              <section class="panel detail-panel"><div class="panel-head"><h2 class="panel-title">应用投入</h2><button class="panel-action" id="viewButton" type="button" aria-label="切换应用图表形态">${icon('view')}</button></div><div class="usage-list" id="appList">${usageRows(apps, 'app')}</div><div class="panel-footer">共 21 个应用 · <button type="button">查看全部 →</button></div></section>
            </div>
          </div>
        </section>
      </div>
    </section>
  </main>
  <div class="tooltip" id="tooltip"></div>
  <div class="modal-backdrop" id="modalBackdrop" role="presentation"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><header class="modal-head"><span class="usage-icon">G</span><div class="modal-head-copy"><h2 id="modalTitle">github.com</h2><p>代码评审 · 今日访问 21 个页面</p></div><button class="modal-close" id="modalClose" type="button" aria-label="关闭">${icon('close')}</button></header><div class="modal-body"><div class="modal-stat-grid"><div class="modal-stat"><span>总时长</span><b class="num">1h52m</b></div><div class="modal-stat"><span>活跃页面</span><b class="num">21</b></div><div class="modal-stat"><span>语义分类</span><b>开发</b></div></div><div class="modal-pages"><h3>主要页面</h3><div class="modal-page-row"><span>Pull requests · Work Review</span><b class="num">38m</b></div><div class="modal-page-row"><span>Issues · UI convergence</span><b class="num">27m</b></div><div class="modal-page-row"><span>Actions · Release build</span><b class="num">16m</b></div></div></div></section></div>
  <div class="toast" id="toast">${icon('check')}<span></span></div>`;
}

document.querySelector('#app').innerHTML = template();

const tooltip = document.querySelector('#tooltip');
const hourBars = document.querySelector('#hourBars');
const colorMap = Object.fromEntries(categories.map(category => [category.key, category.color]));
const nameMap = Object.fromEntries(categories.map(category => [category.key, category.name]));

for (let hour = 0; hour < 24; hour += 1) {
  const values = hours[hour] || {};
  const total = Object.values(values).reduce((sum, value) => sum + value, 0);
  const stack = document.createElement('div');
  stack.className = 'hour-column';
  stack.dataset.hour = hour;
  const labels = [0, 6, 12, 18, 23].includes(hour) ? `<span class="hour-label num">${hour}</span>` : '';
  const peak = hour === 10 ? '<span class="peak-tag num">峰值 52m</span>' : '';
  stack.innerHTML = `${peak}<div class="hour-stack" style="height:${Math.max(total / 60 * 100, 2)}%">${Object.entries(values).map(([key, value]) => `<span class="hour-segment" data-category="${key}" style="height:${value / Math.max(total, 1) * 100}%;background:${colorMap[key]}"></span>`).join('')}</div>${labels}`;
  stack.addEventListener('mouseenter', event => {
    const breakdown = Object.entries(values).map(([key, value]) => `${nameMap[key]} ${value}m`).join(' · ') || '暂无记录';
    tooltip.innerHTML = `<strong class="num">${String(hour).padStart(2, '0')}:00–${String(hour + 1).padStart(2, '0')}:00 · ${total}m</strong>${breakdown}`;
    tooltip.classList.add('visible');
    moveTooltip(event);
  });
  stack.addEventListener('mousemove', moveTooltip);
  stack.addEventListener('mouseleave', () => tooltip.classList.remove('visible'));
  hourBars.append(stack);
}

function moveTooltip(event) {
  tooltip.style.left = `${Math.min(event.clientX + 12, window.innerWidth - 230)}px`;
  tooltip.style.top = `${Math.max(event.clientY - 52, 10)}px`;
}

let selectedCategory = null;
document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => {
  selectedCategory = selectedCategory === button.dataset.category ? null : button.dataset.category;
  document.querySelectorAll('.legend-item, .composition button').forEach(item => item.classList.toggle('is-dim', Boolean(selectedCategory) && item.dataset.category !== selectedCategory));
  document.querySelectorAll('.hour-segment').forEach(item => item.classList.toggle('is-dim', Boolean(selectedCategory) && item.dataset.category !== selectedCategory));
}));

document.querySelectorAll('.range-button').forEach(button => button.addEventListener('click', () => {
  document.body.dataset.mode = button.dataset.mode;
  document.querySelectorAll('.range-button').forEach(item => item.classList.toggle('active', item === button));
  const isToday = button.dataset.mode === 'today';
  document.querySelector('#rhythmTitle').textContent = isToday ? '今日节奏' : button.dataset.mode === 'week' ? '按天投入（本周）' : '按天投入（自定义）';
  document.querySelector('#rhythmMeta').textContent = isToday ? '工作时段 09:00–18:00 · 点击分类筛选' : button.dataset.mode === 'week' ? '最重：周四 8h02m' : '2026-08-03 — 2026-08-09';
  document.querySelector('#pageSubtitle').innerHTML = isToday ? '8月9日 · 周日 · 16:26<span class="live-dot"></span>' : button.dataset.mode === 'week' ? '8月3日 — 8月9日' : '自定义统计范围';
}));

const themeButton = document.querySelector('#themeButton');
if (themeButton) {
  themeButton.addEventListener('click', () => {
    const next = document.body.dataset.theme === 'light' ? 'dark' : 'light';
    document.body.dataset.theme = next;
    themeButton.innerHTML = next === 'light' ? icon('moon') : icon('sun');
    themeButton.setAttribute('aria-label', next === 'light' ? '切换深色模式' : '切换浅色模式');
  });
}

let recording = true;
const capturePanel = document.querySelector('#capturePanel');
document.querySelector('#pauseButton').addEventListener('click', event => {
  recording = !recording;
  capturePanel.classList.toggle('paused', !recording);
  capturePanel.querySelector('.capture-title').textContent = recording ? '正在记录' : '记录已暂停';
  event.currentTarget.innerHTML = recording ? icon('pause') : icon('play');
  showToast(recording ? '记录已继续' : '记录已暂停，这里只演示界面状态');
});

document.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.nav === 'overview') return;
  showToast('第一轮只设计“应用外壳 + 概览页”，其他页面暂未改动');
}));

document.querySelector('.insight-link').addEventListener('click', () => {
  document.querySelector('[data-mode="week"]').click();
  showToast('已切换到本周视图');
});

document.querySelector('#viewButton').addEventListener('click', () => showToast('应用投入支持行图 / 柱图切换；本轮先保留更易比较的行图'));
document.querySelectorAll('.panel-footer button').forEach(button => button.addEventListener('click', () => showToast('“查看全部”将复用现有详情能力，本原型只展示入口反馈')));

const modalBackdrop = document.querySelector('#modalBackdrop');
document.querySelectorAll('[data-detail]').forEach(button => button.addEventListener('click', () => {
  if (!button.dataset.detail) return;
  document.querySelector('#modalTitle').textContent = button.dataset.detail;
  modalBackdrop.classList.add('open');
}));
function closeModal() { modalBackdrop.classList.remove('open'); }
document.querySelector('#modalClose').addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', event => { if (event.target === modalBackdrop) closeModal(); });
window.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });

let toastTimer;
function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.querySelector('span').textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2300);
}
