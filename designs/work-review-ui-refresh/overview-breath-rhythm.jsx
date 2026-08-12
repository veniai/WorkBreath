const { DesignCanvas, DCSection, DCArtboard, DCPostIt } = window;

function Icon({ name }) {
  const paths = {
    home: <><path d="M3 11.5 12 4l9 7.5"></path><path d="M5.5 10.5V20h13v-9.5M9.5 20v-6h5v6"></path></>,
    eye: <><path d="M2.8 12s3.5-5.2 9.2-5.2 9.2 5.2 9.2 5.2-3.5 5.2-9.2 5.2S2.8 12 2.8 12Z"></path><circle cx="12" cy="12" r="2.4"></circle></>,
    clock: <><circle cx="12" cy="12" r="8.5"></circle><path d="M12 7.5v5l3.2 2"></path></>,
    report: <><path d="M6 3.8h8l4 4V20H6z"></path><path d="M14 3.8V8h4M9 12h6M9 15.5h6"></path></>,
    ask: <><path d="M4 5.5h16v12H9l-4.5 3v-3H4z"></path><path d="M8 10h8M8 13.5h5"></path></>,
    settings: <><circle cx="12" cy="12" r="3"></circle><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"></path></>,
    info: <><circle cx="12" cy="12" r="8.5"></circle><path d="M12 10.5v6M12 7.5h.01"></path></>,
    spark: <><path d="m12 2 1.4 5.4L18 10l-4.6 2.6L12 18l-1.4-5.4L6 10l4.6-2.6Z"></path><path d="m19 16 .6 2.1 1.9 1.1-1.9 1.1L19 22l-.6-1.7-1.9-1.1 1.9-1.1Z"></path></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function BrandMark() {
  return <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="7" width="12" height="18" rx="3" fill="#4168d8"></rect><rect x="17" y="7" width="12" height="18" rx="3" fill="#57bf8f"></rect><path d="M13 16h6" stroke="#fff" strokeWidth="3.2" strokeLinecap="round"></path></svg>;
}

const navItems = [
  ['home', '概览'], ['eye', '护眼'], ['clock', '时间线'], ['report', '日报'], ['ask', '助手'], ['settings', '设置'], ['info', '关于'],
];

function Sidebar() {
  return <aside className="sidebar">
    <div className="brand"><span className="brand-mark"><BrandMark /></span><span className="brand-name">WorkBreath</span></div>
    <div className="recording"><span className="recording-dot"></span><span>记录状态</span><button type="button" aria-label="暂停记录">Ⅱ</button></div>
    <nav className="nav" aria-label="主导航">
      {navItems.map(([icon, label]) => <button key={label} className={`nav-item ${label === '概览' ? 'active' : ''}`} type="button"><Icon name={icon} />{label}</button>)}
    </nav>
    <div className="sidebar-foot">简体中文⌄</div>
  </aside>;
}

function RangeSwitch() {
  const [range, setRange] = React.useState('今日');
  return <div className="range-switch">{['今日', '本周', '指定日期'].map(item => <button key={item} className={range === item ? 'active' : ''} onClick={() => setRange(item)} type="button">{item}</button>)}</div>;
}

function Kpis() {
  return <section className="kpi-band" aria-label="今日指标">
    <div className="kpi"><span>今日活动总时长</span><strong>5时40分</strong><small>较上周同日 +58分</small></div>
    <div className="kpi"><span>今日办公时长</span><strong>5时14分</strong><small>占比 92% · 含加班 26分</small></div>
    <div className="kpi"><span>专注峰值</span><strong>9–12时</strong><small>峰值时段合计 2时23分</small></div>
    <div className="kpi"><span>娱乐占比</span><strong>0%</strong><small>较上周同日 +0%</small></div>
  </section>;
}

function RhythmCard() {
  const heights = [3,3,3,3,3,3,3,6,18,47,62,50,22,14,44,55,42,31,18,3,3,3,3,3];
  return <section className="rhythm-card">
    <div className="card-head"><h2>今日节奏</h2><span>按分类着色 · 点击柱形查看分解</span></div>
    <div className="composition" aria-label="分类构成"><i></i><i></i><i></i><i></i></div>
    <div className="legend"><span><i style={{background:'#3f80ed'}}></i>开发工具 2时45分</span><span><i style={{background:'#15b889'}}></i>办公软件 1时15分</span><span><i style={{background:'#16adc2'}}></i>浏览器 1时10分</span><span><i style={{background:'#8558e8'}}></i>通讯协作 30分</span></div>
    <div className="chart">
      {heights.map((height, index) => <i key={index} className={`bar ${height > 8 ? (index === 8 || index === 14 || index === 16 ? 'purple' : 'live') : ''}`} style={{height:`${height}px`}}></i>)}
      <span className="axis-label start">00:00</span><span className="axis-label six">06:00</span><span className="axis-label noon">12:00</span><span className="axis-label sixpm">18:00</span><span className="axis-label end">23:00</span>
    </div>
  </section>;
}

function BottomRow() {
  return <div className="bottom-row"><section className="mini-panel"><h3>常驻网站</h3><div className="mini-list"><span><strong>github.com</strong> · 20分</span><span><strong>docs.rs</strong> · 10分</span></div></section><section className="mini-panel"><h3>应用使用</h3><div className="mini-list"><span><strong>Cursor</strong> · 2时</span><span><strong>Chrome</strong> · 1时10分</span></div></section></div>;
}

function PlainInsight({ children }) {
  return <section className="insight-strip"><span className="spark"><Icon name="spark" /></span><div className="insight-copy"><strong>今天最专注的时段是 09:00–12:00；</strong>总投入比上周同日多 58 分钟，主要来自「开发工具」。</div>{children || <button className="insight-link" type="button">查看本周回顾 →</button>}</section>;
}

function HeaderCapsule() {
  const [open, setOpen] = React.useState(false);
  return <div className="care-capsule-wrap">
    <button className="care-capsule" type="button" aria-expanded={open} onClick={() => setOpen(!open)}><span className="eye-dot"></span><span className="care-capsule-copy"><strong>13 分钟后休息</strong><span>本轮 27 / 40 分钟</span></span></button>
    {open && <div className="care-popover"><div className="care-popover-head"><Icon name="eye" /><strong>护眼正在计时</strong><span>68%</span></div><div className="mini-progress"><i></i></div><p>预计 10:43 开始 3 分钟休息。无输入、锁屏和休眠时间不会计入。</p><div className="care-popover-actions"><button type="button">暂停本轮</button><button type="button">打开护眼</button></div></div>}
  </div>;
}

function SharedRibbon() {
  const [paused, setPaused] = React.useState(false);
  return <PlainInsight><div className="breath-module"><div className="breath-ring"><svg viewBox="0 0 40 40"><circle className="track" cx="20" cy="20" r="16"></circle><circle className="value" cx="20" cy="20" r="16" strokeDasharray="100.5" strokeDashoffset={paused ? 100.5 : 32}></circle></svg><b>{paused ? '暂停' : '68%'}</b></div><div className="breath-copy"><strong>{paused ? '护眼计时已暂停' : '13 分钟后休息'}</strong><span>{paused ? '点击继续本轮' : '本轮 27 / 40 分钟 · 休息 3 分钟'}</span></div><button className={`breath-action ${paused ? 'paused' : ''}`} type="button" aria-label={paused ? '继续护眼计时' : '暂停护眼计时'} onClick={() => setPaused(!paused)}>{paused ? '▶' : 'Ⅱ'}</button></div></PlainInsight>;
}

function DualRhythm() {
  const [expanded, setExpanded] = React.useState(false);
  return <section className="dual-rhythm"><div className="dual-head"><strong>工作与呼吸节奏</strong><span>把投入与休息放在同一时间轴上</span><button type="button" onClick={() => setExpanded(!expanded)}>{expanded ? '收起说明' : '查看节奏'}</button></div><div className="track-row"><span className="track-label">有效工作</span><div className="track-line work-track"><i></i><i></i><i></i><i></i></div><span className="track-note">5时14分</span></div><div className="track-row"><span className="track-label">护眼休息</span><div className="track-line rest-track"><i></i><i></i><i></i></div><span className="track-note">2 次 · 6 分钟</span></div>{expanded && <p style={{margin:'9px 0 0 63px',color:'var(--ink-3)',fontSize:'8px'}}>下一次休息预计 10:43；上午已完成两次完整休息，节奏稳定。</p>}</section>;
}

function AppShell({ variant }) {
  return <main className="prototype-window" data-screen-label={`概览护眼融合 · ${variant}`}><header className="window-bar">WorkBreath</header><div className="workspace"><Sidebar /><section className="page"><header className="page-head"><div className="page-title"><h1>概览</h1><p>2026年7月28日周二 · 10:30 <span style={{color:'var(--green)'}}>●</span></p></div><div className="head-actions">{variant === 'A' && <HeaderCapsule />}<RangeSwitch /></div></header>{variant === 'B' ? <SharedRibbon /> : <PlainInsight />}{variant === 'C' && <DualRhythm />}<Kpis /><RhythmCard /><BottomRow /></section></div></main>;
}

function App() {
  return <DesignCanvas minScale={0.24} maxScale={1.25} style={{background:'#eceff2'}}>
    <DCSection id="overview-rhythm" title="概览 × 护眼节奏" subtitle="三种方案均保持现有页面骨架；点击画板右上角可全屏比较，画面内控件可交互。">
      <DCArtboard id="a" label="A · 页头状态胶囊" width={1120} height={720}><AppShell variant="A" /></DCArtboard>
      <DCArtboard id="b" label="B · 洞察与呼吸合流（推荐）" width={1120} height={720}><AppShell variant="B" /></DCArtboard>
      <DCArtboard id="c" label="C · 工作 / 休息双轨" width={1120} height={720}><AppShell variant="C" /></DCArtboard>
      <DCPostIt top={-28} right={30} width={245} rotate={1}>推荐 B：不新增卡片高度；用户一眼同时得到“今天做得怎样”和“多久后该休息”。</DCPostIt>
    </DCSection>
  </DesignCanvas>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
