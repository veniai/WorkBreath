const { useEffect, useRef, useState } = React;

const secondarySurfaceIconPaths = {
  overview: <><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></>,
  eye: <><path d="M2.8 12s3.5-5.2 9.2-5.2 9.2 5.2 9.2 5.2-3.5 5.2-9.2 5.2S2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="2.4"/></>,
  timeline: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5l3.2 2"/></>,
  report: <><path d="M6 3.8h8l4 4V20H6z"/><path d="M14 3.8V8h4M9 12h6M9 15.5h6"/></>,
  ask: <><path d="M4 5.5h16v12H9l-4.5 3v-3H4z"/><path d="M8 10h8M8 13.5h5"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.3 13.5v-3l-2-.6a7 7 0 0 0-.7-1.6l1-1.8-2.1-2.1-1.8 1A7 7 0 0 0 12 4.7l-.6-2h-3l-.6 2a7 7 0 0 0-1.6.7l-1.8-1-2.1 2.1 1 1.8a7 7 0 0 0-.7 1.6l-2 .6v3l2 .6a7 7 0 0 0 .7 1.6l-1 1.8 2.1 2.1 1.8-1a7 7 0 0 0 1.6.7l.6 2h3l.6-2a7 7 0 0 0 1.6-.7l1.8 1 2.1-2.1-1-1.8a7 7 0 0 0 .7-1.6Z" transform="translate(1.8 -.2) scale(.86)"/></>,
  info: <><circle cx="12" cy="12" r="8.5"/><path d="M12 10.5v6M12 7.5h.01"/></>,
  close: <path d="m7 7 10 10M17 7 7 17"/>,
  min: <path d="M6 12h12"/>,
  max: <rect x="6" y="6" width="12" height="12"/>,
  pause: <path d="M8 6v12M16 6v12"/>,
  download: <><path d="M12 4v10m0 0 4-4m-4 4-4-4"/><path d="M5 18h14"/></>,
  sliders: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></>,
  trash: <><path d="M5 7h14M9 7V4h6v3M8 10v7M12 10v7M16 10v7M7 7l1 13h8l1-13"/></>,
  check: <path d="m5 12 4 4 10-10"/>,
  alert: <><path d="M12 4 3.5 19h17Z"/><path d="M12 9v4M12 16h.01"/></>,
  shield: <><path d="M12 3.5 19 6v5.2c0 4.4-2.9 7.5-7 9.3-4.1-1.8-7-4.9-7-9.3V6Z"/><path d="M9.2 12.1 11 14l3.9-4"/></>,
  tag: <><path d="M4 5h7l9 9-6 6-9-9Z"/><circle cx="8.5" cy="8.5" r="1"/></>,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></>,
  edit: <><path d="m5 16-.8 3.8L8 19l9.5-9.5-3-3Z"/><path d="m13.5 7.5 3 3"/></>,
  arrow: <path d="m9 6 6 6-6 6"/>,
  back: <path d="m15 6-6 6 6 6"/>,
};

function Icon({ name, className = '' }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{secondarySurfaceIconPaths[name]}</svg>;
}

const navItems = [['overview', '概览'], ['eye', '护眼'], ['timeline', '时间线'], ['report', '日报'], ['ask', '助手'], ['settings', '设置'], ['info', '关于']];

function useFocusBoundary(active, onEscape) {
  const ref = useRef(null);
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;
  useEffect(() => {
    if (!active || !ref.current) return undefined;
    const root = ref.current;
    const previouslyFocused = document.activeElement;
    const selector = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusables = () => [...root.querySelectorAll(selector)].filter((node) => !node.hidden && node.offsetParent !== null);
    const first = root.querySelector('[data-autofocus="true"]') || focusables()[0];
    window.setTimeout(() => first?.focus(), 0);
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        escapeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.setTimeout(() => {
        if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus();
      }, 0);
    };
  }, [active]);
  return ref;
}

function DialogShell({ size = '', kicker, danger = false, title, description, onClose, children, footer, labelledBy }) {
  const dialogRef = useFocusBoundary(true, onClose);
  return <div className="surface-layer">
    <button type="button" className="surface-backdrop" aria-label="关闭弹窗" onClick={onClose}></button>
    <section ref={dialogRef} className={`dialog ${size}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <header className="dialog-head">
        <div className="dialog-head-copy">
          <p className={`dialog-kicker ${danger ? 'danger' : ''}`}>{kicker}</p>
          <h2 className="dialog-title" id={labelledBy}>{title}</h2>
          {description && <p className="dialog-description">{description}</p>}
        </div>
        <button type="button" className="close-btn" aria-label="关闭" onClick={onClose}><Icon name="close" /></button>
      </header>
      <div className="dialog-body">{children}</div>
      <footer className="dialog-footer">{footer}</footer>
    </section>
  </div>;
}

function StandardConfirm({ onClose, onComplete }) {
  return <DialogShell
    size="small"
    kicker="确认变更"
    title="应用分类规则"
    description="只影响后续记录，已有记录保持不变。"
    onClose={onClose}
    labelledBy="standard-confirm-title"
    footer={<><span className="dialog-footer-note">Tab 切换 · Esc 取消</span><button type="button" className="button" data-autofocus="true" onClick={onClose}>取消</button><button type="button" className="button primary" onClick={onComplete}>确认应用</button></>}
  >
    <div className="confirm-layout">
      <span className="confirm-icon"><Icon name="tag" /></span>
      <div className="confirm-copy">
        <h3>将 Figma 标记为「设计工具」？</h3>
        <p>之后来自 Figma 的活动会自动使用这个分类，你仍可以在时间线中单独调整。</p>
        <div className="confirm-detail">匹配应用：Figma · 规则范围：当前设备</div>
      </div>
    </div>
  </DialogShell>;
}

function OcrExportChoice({ onClose, onComplete }) {
  const [includeOcr, setIncludeOcr] = useState(false);
  return <DialogShell
    size="small"
    kicker="时间线导出"
    title="选择导出内容"
    description="导出前确认是否把屏幕识别文本写入 JSON 文件。"
    onClose={onClose}
    labelledBy="ocr-export-choice-title"
    footer={<><span className="dialog-footer-note">默认不包含 · Esc 取消导出</span><button type="button" className="button" onClick={onClose}>取消</button><button type="button" className="button primary" onClick={() => onComplete(includeOcr)}>继续导出</button></>}
  >
    <div className="choice-intro">
      <span className="choice-intro-icon"><Icon name="shield" /></span>
      <p>OCR 来自屏幕内容，可能包含聊天、账号或其他敏感信息。这个选择只影响本次导出。</p>
    </div>
    <div className="choice-group" role="radiogroup" aria-label="OCR 导出范围">
      <button type="button" role="radio" aria-checked={!includeOcr} data-autofocus="true" className={`choice-option ${!includeOcr ? 'active' : ''}`} onClick={() => setIncludeOcr(false)}>
        <span className="choice-radio" aria-hidden="true"></span>
        <span className="choice-copy"><span className="choice-title">不包含 OCR <span className="choice-recommended">推荐</span></span><span className="choice-description">仅导出时间、应用、标题、分类等结构化记录。</span></span>
        {!includeOcr && <Icon name="check" className="choice-check" />}
      </button>
      <button type="button" role="radio" aria-checked={includeOcr} className={`choice-option ${includeOcr ? 'active' : ''}`} onClick={() => setIncludeOcr(true)}>
        <span className="choice-radio" aria-hidden="true"></span>
        <span className="choice-copy"><span className="choice-title">包含 OCR</span><span className="choice-description">额外导出屏幕识别文本，生成的文件需要谨慎分享。</span></span>
        {includeOcr && <Icon name="check" className="choice-check" />}
      </button>
    </div>
    <div className="choice-footnote"><Icon name="info" /><span>不会修改截图、OCR 采集或本地保存设置。</span></div>
  </DialogShell>;
}

function CleanupDialog({ onClose, onComplete }) {
  const [mode, setMode] = useState('today');
  return <DialogShell
    size="wide"
    kicker="危险操作"
    danger
    title="清理活动记录"
    description="日报和小时摘要会保留；对应截图将同时删除，操作无法恢复。"
    onClose={onClose}
    labelledBy="cleanup-dialog-title"
    footer={<><span className="dialog-footer-note">删除前会再次校验范围</span><button type="button" className="button" data-autofocus="true" onClick={onClose}>取消</button><button type="button" className="button danger" onClick={() => onComplete(mode)}>删除所选记录</button></>}
  >
    <div className="cleanup-modes" role="radiogroup" aria-label="清理范围">
      <button type="button" role="radio" aria-checked={mode === 'today'} className={`mode-option ${mode === 'today' ? 'active' : ''}`} onClick={() => setMode('today')}><strong>删除当天</strong><span>2026/08/09 的全部记录</span></button>
      <button type="button" role="radio" aria-checked={mode === 'range'} className={`mode-option ${mode === 'range' ? 'active' : ''}`} onClick={() => setMode('range')}><strong>按时间段</strong><span>选择开始与结束时间</span></button>
      <button type="button" role="radio" aria-checked={mode === 'app'} className={`mode-option ${mode === 'app' ? 'active' : ''}`} onClick={() => setMode('app')}><strong>按应用</strong><span>仅清理指定应用记录</span></button>
    </div>
    <div className="cleanup-warning"><Icon name="alert" /><span>{mode === 'today' ? '预计删除 214 条活动记录和 86 张截图。' : mode === 'range' ? '下一步将选择时间范围，本原型只演示确认层。' : '下一步将选择应用，本原型只演示确认层。'}</span></div>
  </DialogShell>;
}

function BatchExportDialog({ onClose, onComplete }) {
  const [startDate, setStartDate] = useState('2026-08-03');
  const [endDate, setEndDate] = useState('2026-08-09');
  const valid = startDate && endDate && startDate <= endDate;
  return <DialogShell
    kicker="导出日报"
    title="批量导出"
    description="将日期范围内的日报合并为一个 Markdown 文件。"
    onClose={onClose}
    labelledBy="batch-export-title"
    footer={<><span className="dialog-footer-note">仅导出已生成的日报</span><button type="button" className="button" onClick={onClose}>取消</button><button type="button" className="button primary" disabled={!valid} onClick={onComplete}><Icon name="download" />导出</button></>}
  >
    <div className="field-grid">
      <label className="field"><span className="field-label">开始日期</span><input className="input num" data-autofocus="true" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
      <label className="field"><span className="field-label">结束日期</span><input className="input num" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
    </div>
    <div className="confirm-detail">预计合并 7 篇日报 · 文件名：Work Review 2026-08-03—08-09.md</div>
  </DialogShell>;
}

function PresetDialog({ onClose, onComplete }) {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const valid = name.trim() && prompt.trim();
  return <DialogShell
    size="wide"
    kicker="生成设置 · 预设"
    title="添加提示词预设"
    description="抽屉已退出，当前只保留一个可交互层；关闭后返回生成设置。"
    onClose={onClose}
    labelledBy="preset-dialog-title"
    footer={<><span className="dialog-footer-note">保存后返回生成设置</span><button type="button" className="button" onClick={onClose}>取消</button><button type="button" className="button primary" disabled={!valid} onClick={() => onComplete(name)}>保存预设</button></>}
  >
    <div className="dialog-route-note"><Icon name="back" />从“生成设置”进入；弹窗与抽屉不同时存在，避免遮挡和焦点冲突。</div>
    <label className="field"><span className="field-label">预设名称</span><input className="input" data-autofocus="true" value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：项目周报" /></label>
    <label className="field full"><span className="field-label">附加提示词</span><textarea className="textarea" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="强调本周交付、风险和下周计划……"></textarea><span className="field-help">保存后可以在生成日报前快速选择。</span></label>
  </DialogShell>;
}

function SettingsDrawer({ onClose, onOpenPreset, onComplete }) {
  const [activePreset, setActivePreset] = useState('balanced');
  const drawerRef = useFocusBoundary(true, onClose);
  return <div className="drawer-layer">
    <button type="button" className="drawer-backdrop" aria-label="关闭生成设置" onClick={onClose}></button>
    <aside ref={drawerRef} className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <header className="drawer-head">
        <div className="drawer-head-copy"><span className="drawer-kicker">日报</span><h2 className="drawer-title" id="drawer-title">生成设置</h2></div>
        <button type="button" className="close-btn" aria-label="关闭生成设置" onClick={onClose}><Icon name="close" /></button>
      </header>
      <div className="drawer-body">
        <section className="drawer-section">
          <div className="drawer-section-head"><h3 className="drawer-section-title">日报附加提示词</h3><span className="drawer-section-note">生成前选择</span></div>
          <div className="preset-list">
            <button type="button" className={`preset-card ${activePreset === 'balanced' ? 'active' : ''}`} onClick={() => setActivePreset('balanced')}><span className="preset-mark"><Icon name="report" /></span><span className="preset-copy"><strong>均衡复盘</strong><span>兼顾交付、专注、沟通和下一步</span></span>{activePreset === 'balanced' && <Icon name="check" className="preset-check" />}</button>
            <button type="button" className={`preset-card ${activePreset === 'project' ? 'active' : ''}`} onClick={() => setActivePreset('project')}><span className="preset-mark"><Icon name="tag" /></span><span className="preset-copy"><strong>项目推进</strong><span>突出里程碑、阻塞项和责任人</span></span>{activePreset === 'project' && <Icon name="check" className="preset-check" />}</button>
          </div>
          <button type="button" className="preset-add" onClick={onOpenPreset}>＋ 添加预设</button>
        </section>
        <section className="drawer-section">
          <div className="drawer-section-head"><h3 className="drawer-section-title">临时补充</h3><span className="drawer-section-note">仅用于本次生成</span></div>
          <textarea className="textarea drawer-textarea" placeholder="例如：重点说明今天的 UI 收敛工作……"></textarea>
        </section>
        <section className="drawer-section">
          <div className="drawer-section-head"><h3 className="drawer-section-title">报告格式模板</h3><button type="button" className="review-btn">还原默认</button></div>
          <textarea className="textarea drawer-textarea" placeholder="留空使用默认格式……"></textarea>
        </section>
      </div>
      <footer className="drawer-footer"><span className="drawer-status">更改将在生成时生效</span><div className="drawer-actions"><button type="button" className="button" onClick={onClose}>取消</button><button type="button" className="button primary" onClick={onComplete}>应用设置</button></div></footer>
    </aside>
  </div>;
}

function App() {
  const [layer, setLayer] = useState(null);
  const [returnToDrawer, setReturnToDrawer] = useState(false);
  const [toast, setToast] = useState('');
  const lastFocus = useRef(null);
  const toastTimer = useRef(null);

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2200);
  };

  const openLayer = (next) => {
    lastFocus.current = document.activeElement;
    setReturnToDrawer(false);
    setLayer(next);
  };

  const closeLayer = () => {
    if (returnToDrawer && layer === 'preset') {
      setReturnToDrawer(false);
      setLayer('drawer');
      return;
    }
    setLayer(null);
    window.setTimeout(() => lastFocus.current?.focus?.(), 0);
  };

  const complete = (message, next = null) => {
    setLayer(next);
    setReturnToDrawer(false);
    showToast(message);
    if (!next) window.setTimeout(() => lastFocus.current?.focus?.(), 0);
  };

  const openPresetFromDrawer = () => {
    setReturnToDrawer(true);
    setLayer('preset');
  };

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  return <>
    <main className="app-window" aria-label="Work Review 二级交互规范原型">
      <header className="windowbar"><span className="windowbar-title">Work Review</span><div className="window-controls" aria-hidden="true"><button className="window-control"><Icon name="min" /></button><button className="window-control"><Icon name="max" /></button><button className="window-control close"><Icon name="close" /></button></div></header>
      <div className="workspace">
        <aside className="sidebar">
          <div className="brand-row"><span className="brand-mark"><img src="./assets/icon.png" alt="" /></span><div><h2 className="brand-name">Work Review</h2><div className="brand-edition">本地工作回顾</div></div></div>
          <div className="capture-panel"><span className="capture-dot"></span><span className="capture-copy"><span className="capture-title">正在记录</span><span className="capture-meta">仅保存在本机</span></span><button type="button" className="pause-btn" aria-label="暂停记录" onClick={() => showToast('记录状态在本原型中保持不变')}><Icon name="pause" /></button></div>
          <div className="nav-label">工作空间</div>
          <nav className="nav-list" aria-label="主导航">{navItems.map(([key, label]) => <button type="button" className={`nav-item ${key === 'report' ? 'active' : ''}`} key={key} onClick={() => key !== 'report' && showToast('本原型只演示日报中的二级交互')}><Icon name={key} /><span>{label}</span></button>)}</nav>
          <div className="sidebar-spacer"></div><div className="sidebar-tools"><button type="button" className="locale-button">简体中文</button></div>
        </aside>

        <section className="main">
          <div className="main-inner">
            <header className="page-head">
              <div className="heading-row"><span className="heading-icon"><Icon name="report" /></span><div className="page-heading"><h1>日报</h1><p className="page-subtitle">回顾当天的投入、进展与下一步</p></div></div>
              <div className="toolbar"><button type="button" className="control-btn" onClick={() => openLayer('batch')}><Icon name="download" /><span className="control-label">批量导出</span></button><button type="button" className="control-btn danger-quiet" onClick={() => openLayer('cleanup')}><Icon name="trash" /><span className="control-label">清理</span></button><button type="button" className="control-btn" onClick={() => openLayer('drawer')}><Icon name="sliders" /><span className="control-label">生成设置</span></button><button type="button" className="control-btn primary" onClick={() => showToast('已开始重新生成日报')}><Icon name="report" /><span className="control-label">重新生成</span></button></div>
            </header>
            <div className="week-strip"><span className="week-label">本周</span><div className="week-days">{['一 3', '二 4', '三 5', '四 6', '五 7', '六 8', '日 9'].map((day, index) => <button type="button" className={`week-day ${index === 6 ? 'active' : ''}`} key={day}>{day}</button>)}</div><span className="week-meta">已生成 7/7 天 · 合并导出本周 →</span></div>
            <section className="summary-band"><article className="metric"><div className="metric-label">总投入</div><div className="metric-value num">7小时24分钟</div><div className="metric-sub">较上周日 +42 分钟</div></article><article className="metric"><div className="metric-label">专注峰值</div><div className="metric-value num">10:00–12:00</div><div className="metric-sub">峰值段合计 1小时39分</div></article><article className="metric"><div className="metric-label">沟通占比</div><div className="metric-value num">12%</div><div className="metric-sub">较上周同日 −1pt</div></article><article className="metric"><div className="metric-label">数据底座</div><div className="metric-value num">214</div><div className="metric-sub">6 个应用 · 实时口径</div></article></section>
            <div className="reading-layout">
              <article className="report-sheet"><header className="article-head"><p className="article-kicker">今日日报</p><h2 className="article-title">2026年8月9日星期日</h2><div className="article-meta">309 字 · 生成于 16:20 · AI 增强 · 实时统计</div><p className="article-lead">今天围绕 Work Review 前端体验优化展开，概览与时间线页面已完成原型确认和正式落地。</p></header><div className="article-body"><section className="report-section"><div className="section-head"><span className="section-mark"></span><h2>一、今日概览</h2></div><p>完成应用外壳、概览页与时间线的信息层级收敛，统一固定亮色和紧凑工作台结构。</p></section><section className="report-section"><div className="section-head"><span className="section-mark"></span><h2>二、重点进展</h2></div><ul><li>完成主要页面的统一指标带和节奏区优化。</li><li>验证 1024px 与 1440px 两种桌面宽度。</li><li>发现并定位抽屉与弹窗层级冲突。</li></ul></section><section className="report-section"><div className="section-head"><span className="section-mark"></span><h2>三、明日计划</h2></div><p>确认二级交互规范后，统一弹窗、确认框和抽屉，并补齐键盘操作验证。</p></section></div></article>
              <aside className="toc"><h3 className="toc-title">本篇目录</h3><button type="button" className="toc-item active">今日概览</button><button type="button" className="toc-item">重点进展</button><button type="button" className="toc-item">明日计划</button><div className="toc-foot">生成于 16:20<br />AI 增强 · 实时统计</div></aside>
            </div>
          </div>
        </section>
      </div>
    </main>

    <div className="review-dock" role="group" aria-label="原型场景"><span className="review-label">原型场景</span><button type="button" className="review-btn" onClick={() => openLayer('confirm')}>普通确认</button><button type="button" className="review-btn" onClick={() => openLayer('ocr')}>OCR 选择</button><button type="button" className="review-btn danger" onClick={() => openLayer('cleanup')}>危险操作</button><button type="button" className="review-btn" onClick={() => openLayer('batch')}>表单弹窗</button><button type="button" className="review-btn primary" onClick={() => openLayer('drawer')}>抽屉编辑</button></div>

    {layer === 'confirm' && <StandardConfirm onClose={closeLayer} onComplete={() => complete('分类规则已应用')} />}
    {layer === 'ocr' && <OcrExportChoice onClose={closeLayer} onComplete={(includeOcr) => complete(includeOcr ? '已模拟导出：包含 OCR 文本' : '已模拟导出：不包含 OCR 文本')} />}
    {layer === 'cleanup' && <CleanupDialog onClose={closeLayer} onComplete={() => complete('清理范围已确认；原型未删除真实数据')} />}
    {layer === 'batch' && <BatchExportDialog onClose={closeLayer} onComplete={() => complete('已模拟导出 7 篇日报')} />}
    {layer === 'drawer' && <SettingsDrawer onClose={closeLayer} onOpenPreset={openPresetFromDrawer} onComplete={() => complete('生成设置已应用')} />}
    {layer === 'preset' && <PresetDialog onClose={closeLayer} onComplete={(name) => complete(`预设“${name}”已保存`, 'drawer')} />}

    <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite"><Icon name="check" /><span>{toast}</span></div>
  </>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
