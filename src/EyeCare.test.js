import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('护眼配置默认 40/3/60/5/30 且旧提醒字段有确定性迁移', async () => {
  const [config, settings] = await Promise.all([
    read('../crates/core/src/config.rs'),
    read('./routes/settings/components/SettingsEyeCare.svelte'),
  ]);

  assert.match(config, /fn default_eye_care_work_minutes\(\)[\s\S]*?40/);
  assert.match(config, /fn default_eye_care_rest_minutes\(\)[\s\S]*?3/);
  assert.match(config, /fn default_eye_care_input_grace_seconds\(\)[\s\S]*?60/);
  assert.match(config, /fn default_eye_care_natural_rest_minutes\(\)[\s\S]*?5/);
  assert.match(config, /fn default_eye_care_pre_break_seconds\(\)[\s\S]*?30/);
  assert.match(config, /deserialize_config_with_legacy_migration/);
  assert.match(config, /remove\("break_reminder_enabled"\)/);
  assert.match(config, /remove\("break_reminder_interval_minutes"\)/);
  for (const field of [
    'eye_care_enabled',
    'eye_care_work_minutes',
    'eye_care_rest_minutes',
    'eye_care_input_grace_seconds',
    'eye_care_natural_rest_minutes',
    'eye_care_pre_break_seconds',
    'eye_care_lock_on_rest_end',
    'eye_care_paused',
  ]) {
    assert.match(settings, new RegExp(`config\\.${field}`));
  }
});

test('护眼从设置迁到概览下方的独立主页并保留全部可配置项', async () => {
  const [app, sidebar, settings, dashboard] = await Promise.all([
    read('./App.svelte'),
    read('./lib/components/Sidebar.svelte'),
    read('./routes/settings/Settings.svelte'),
    read('./routes/eye-care/EyeCare.svelte'),
  ]);

  assert.match(app, /'\/eye-care'[\s\S]*EyeCare\.svelte/);
  assert.match(sidebar, /path: '\/'[\s\S]*path: '\/eye-care'[\s\S]*path: '\/timeline'/);
  assert.match(sidebar, /sidebar\.nav\.eyeCare/);
  assert.doesNotMatch(settings, /SettingsEyeCare|activeTab === 'eyeCare'|id: 'eyeCare'/);
  assert.match(dashboard, /SettingsEyeCare/);
  assert.match(dashboard, /get_eye_care_status/);
  assert.match(dashboard, /eye-care-status-changed/);
  assert.match(dashboard, /countedWorkSeconds/);
  assert.match(dashboard, /excludedSeconds/);
  assert.match(dashboard, /recentEvents/);
});

test('护眼主页应落地紧凑浅色状态工作台并让设置进入首屏', async () => {
  const [dashboard, settings] = await Promise.all([
    read('./routes/eye-care/EyeCare.svelte'),
    read('./routes/settings/components/SettingsEyeCare.svelte'),
  ]);

  assert.match(dashboard, /eye-care-save-status/);
  assert.match(dashboard, /page-header page-axis-operation persistent-save-header/);
  assert.match(dashboard, /eye-care-cycle-row/);
  assert.match(dashboard, /eye-care-middle-grid/);
  assert.match(dashboard, /eyeCare\.dashboard\.cycleRuleValue/);
  assert.match(dashboard, /\.eye-care-dashboard\s*\{[\s\S]*?color-scheme:\s*light/);
  assert.match(dashboard, /\.eye-care-hero\s*\{[\s\S]*?min-height:\s*12\.625rem/);
  assert.match(dashboard, /\.eye-care-middle-grid\s*\{[\s\S]*?grid-template-columns:/);
  assert.match(dashboard, /repeat\(5, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(dashboard, /data-state="(?:counting|away|rest)"/);

  assert.match(settings, /eye-care-config-card/);
  assert.match(settings, /eye-care-config-master/);
  assert.match(settings, /eye-care-config-grid/);
  assert.match(settings, /eye-care-config-field/);
  assert.match(settings, /eye-care-config-lock-row/);
  assert.match(settings, /eye-care-config-pause-row/);
});

test('护眼主页用可审计状态解释计时，并区分全部未计入原因', async () => {
  const [engine, dashboard] = await Promise.all([
    read('../src-tauri/src/eye_care.rs'),
    read('./routes/eye-care/EyeCare.svelte'),
  ]);

  for (const reason of [
    'Counting',
    'ShortIdle',
    'InputUnavailable',
    'Locked',
    'SuspendedOrUnknown',
    'NaturalRest',
    'Paused',
    'Disabled',
  ]) {
    assert.match(engine, new RegExp(`\\b${reason}\\b`));
  }
  for (const field of [
    'counted_work_seconds',
    'excluded_seconds',
    'short_idle_seconds',
    'locked_seconds',
    'suspended_seconds',
    'unavailable_seconds',
    'paused_seconds',
    'observed_seconds',
    'input_idle_seconds',
    'recent_events',
  ]) {
    assert.match(engine, new RegExp(`pub ${field}`));
  }
  assert.match(engine, /MAX_DIAGNOSTIC_EVENTS/);
  assert.match(dashboard, /reason\.\$\{timerReason\}/);
  assert.doesNotMatch(dashboard, /window_title|screenshot|ocr_text/);
});

test('护眼状态机独立使用单调增量并覆盖等待返回、锁屏、挂起和持久化', async () => {
  const [engine, main] = await Promise.all([
    read('../src-tauri/src/eye_care.rs'),
    read('../src-tauri/src/main.rs'),
  ]);

  for (const phase of ['Working', 'PreBreak', 'Resting', 'WaitingReturn']) {
    assert.match(engine, new RegExp(`\\b${phase}\\b`));
  }
  assert.match(main, /std::time::Instant::now\(\)/);
  assert.match(main, /saturating_duration_since\(last_tick\)/);
  assert.match(main, /resolve_tick_timing\(monotonic_delta_ms, suspend_clock_delta_ms\)/);
  assert.match(engine, /GetTickCount64/);
  assert.match(main, /try_get_idle_seconds\(\)/);
  assert.match(main, /lock_monitor\.is_locked\(\)/);
  assert.match(engine, /suspended_or_unknown_gap/);
  assert.match(engine, /eye-care-state\.json|save\(&mut self/);
  assert.doesNotMatch(engine, /ScreenshotService|generate_report|reqwest|AiProvider/);
});

test('预告非阻挡，休息层覆盖每块显示器且 watchdog 会恢复窗口', async () => {
  const [engine, main, overlay, preBreak, capabilities] = await Promise.all([
    read('../src-tauri/src/eye_care.rs'),
    read('../src-tauri/src/main.rs'),
    read('./routes/eye-care/EyeCareOverlay.svelte'),
    read('./routes/eye-care/EyeCarePreBreak.svelte'),
    read('../src-tauri/capabilities/migrated.json'),
  ]);

  assert.match(engine, /available_monitors\(\)/);
  assert.match(engine, /for \(index, monitor\) in monitors\.iter\(\)\.enumerate\(\)/);
  assert.match(engine, /expected_labels/);
  assert.match(engine, /set_ignore_cursor_events\(true\)/);
  assert.match(engine, /set_content_protected\(true\)/);
  assert.match(main, /sync_overlay_windows\(&app, &status\)/);
  assert.match(main, /同步护眼休息层失败，watchdog 将重试/);
  assert.match(main, /api\.prevent_close\(\)/);
  assert.match(main, /api\.prevent_exit\(\)/);
  // 休息遮罩为深色静谧全屏（Apple-grade editorial 收敛后不再使用 78vw 圆角卡片）
  assert.match(overlay, /100vw/);
  assert.match(overlay, /100vh/);
  assert.match(overlay, /radial-gradient/);
  assert.match(overlay, /tabular-nums/);
  assert.doesNotMatch(overlay, /orb-one|orb-two/);
  assert.match(overlay, /EMERGENCY_HOLD_MS\s*=\s*5000/);
  assert.match(overlay, /ControlLeft[\s\S]*AltLeft[\s\S]*ShiftLeft/);
  assert.doesNotMatch(overlay, /skip|postpone|延后|跳过/i);
  assert.match(preBreak, /preBreakDescription/);
  assert.match(preBreak, /overflow:\s*hidden/);
  assert.match(preBreak, /background:.*#141416/);
  assert.doesNotMatch(preBreak, /backdrop-filter/);
  assert.doesNotMatch(preBreak, /clip-path/);
  // 透明窗口根治：根元素加专属 class 强制透明背景，卡片留 gutter 不占满窗口
  assert.match(preBreak, /eye-care-pre-break-root/);
  assert.match(preBreak, /background:\s*transparent\s*!important/);
  assert.match(preBreak, /margin:\s*3px/);
  assert.match(preBreak, /calc\(100%\s*-\s*6px\)/);
  assert.match(capabilities, /eye-care-pre-break/);
  assert.match(capabilities, /eye-care-overlay-\*/);
});

test('周期回顾只读现有活动并复用隐私过滤，自有窗口不进入采集', async () => {
  const [engine, main, recap] = await Promise.all([
    read('../src-tauri/src/eye_care.rs'),
    read('../src-tauri/src/main.rs'),
    read('./lib/components/EyeCareRecap.svelte'),
  ]);

  assert.match(engine, /get_activities_in_range/);
  assert.match(engine, /collect_privacy_filters/);
  assert.match(engine, /filter_activities_by_privacy/);
  assert.match(engine, /build_recap_from_activities/);
  assert.match(engine, /overlap_start/);
  assert.match(engine, /overlap_end/);
  assert.match(main, /if transition\.returned[\s\S]*build_recap/);
  assert.match(main, /is_own_app_window/);
  assert.match(main, /title == "workbreath rest"/);
  assert.match(main, /title == "eye review rest"/);
  assert.match(recap, /recap\.empty/);
  assert.doesNotMatch(engine, /capture\(|upload_screenshot|generate_text_with_model/);
});

test('固定休息正常结束后按配置请求系统锁屏，失败时仍释放遮罩', async () => {
  const [config, main, screenLock, settings] = await Promise.all([
    read('../crates/core/src/config.rs'),
    read('../src-tauri/src/main.rs'),
    read('../src-tauri/src/screen_lock.rs'),
    read('./routes/settings/components/SettingsEyeCare.svelte'),
  ]);

  assert.match(config, /eye_care_lock_on_rest_end:\s*bool/);
  assert.match(config, /eye_care_lock_on_rest_end:\s*true/);
  assert.match(settings, /toggle\('eye_care_lock_on_rest_end'\)/);
  assert.match(main, /transition\.completed_rest && lock_on_rest_end/);
  assert.match(main, /spawn_blocking\(screen_lock::lock_screen_now\)/);
  assert.match(main, /close_overlay_windows/);
  assert.match(main, /已继续释放遮罩/);
  assert.match(screenLock, /LockWorkStation/);
  assert.match(screenLock, /loginctl[\s\S]*lock-session/);
  assert.match(screenLock, /CGSession[\s\S]*-suspend/);
});

test('桌宠运行时、窗口、设置和素材已删除', async () => {
  const removed = [
    '../src-tauri/src/avatar_engine.rs',
    '../src-tauri/src/avatar_input.rs',
    '../src-tauri/src/commands/avatar.rs',
    './routes/avatar/AvatarWindow.svelte',
    './routes/settings/components/SettingsAvatar.svelte',
    './lib/components/Avatar',
  ];
  for (const path of removed) {
    await assert.rejects(access(new URL(path, import.meta.url), constants.F_OK));
  }
});
