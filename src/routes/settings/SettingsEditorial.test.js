import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('设置页应接入编辑部风格壳层并强化保存操作区', async () => {
  const [settingsSource, appCssSource] = await Promise.all([
    readFile(new URL('./Settings.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../../app.css', import.meta.url), 'utf8'),
  ]);

  assert.match(settingsSource, /settings-editorial-shell/);
  assert.match(settingsSource, /settings-editorial-board/);
  assert.match(settingsSource, /settings-stage-layout/);
  assert.match(settingsSource, /<nav class="settings-tab-rail" aria-label=\{t\('settings\.title'\)\}>/);
  assert.match(settingsSource, /aria-current=\{activeTab === tab\.id \? 'page' : undefined\}/);
  assert.match(settingsSource, /settings-stage-shell/);
  assert.match(settingsSource, /settings-stage-intro/);
  assert.match(settingsSource, /settings-tab-rail-note/);
  assert.match(settingsSource, /settings-ai-shell/);
  assert.match(settingsSource, /settings-save-dock/);
  assert.match(settingsSource, /settings-save-status/);
  assert.doesNotMatch(settingsSource, /<div class="page-card">[\s\S]*<SettingsAI/);
  assert.doesNotMatch(settingsSource, /settings-summary-grid/);
  assert.doesNotMatch(settingsSource, /settings-summary-toolbar/);
  assert.doesNotMatch(settingsSource, /settings-summary-manager/);
  assert.doesNotMatch(settingsSource, /settings-hero-panel/);
  assert.doesNotMatch(settingsSource, /settings-hero-kicker/);
  assert.doesNotMatch(settingsSource, /settings-hero-title/);
  assert.doesNotMatch(settingsSource, /settings-hero-note/);
  assert.doesNotMatch(settingsSource, /settings-hero-tags/);
  assert.doesNotMatch(settingsSource, /settings-hero-chip/);
  assert.match(appCssSource, /\.settings-editorial-shell/);
  assert.match(appCssSource, /\.settings-stage-layout/);
  assert.match(appCssSource, /\.settings-tab-rail/);
  assert.match(appCssSource, /\.settings-stage-shell/);
  assert.match(appCssSource, /\.settings-ai-shell/);
  assert.match(appCssSource, /\.settings-save-dock/);
  assert.doesNotMatch(appCssSource, /\.settings-summary-grid/);
  assert.doesNotMatch(appCssSource, /\.settings-summary-toolbar/);
  assert.doesNotMatch(appCssSource, /\.settings-summary-manager/);
  assert.doesNotMatch(appCssSource, /\.settings-hero-panel/);
  assert.doesNotMatch(appCssSource, /\.settings-hero-kicker/);
  assert.doesNotMatch(appCssSource, /\.settings-hero-title/);
  assert.doesNotMatch(appCssSource, /\.settings-hero-note/);
  assert.doesNotMatch(appCssSource, /\.settings-hero-tags/);
  assert.doesNotMatch(appCssSource, /\.settings-hero-chip/);
});

test('设置页不应继续渲染顶部摘要卡和摘要卡管理入口', async () => {
  const source = await readFile(new URL('./Settings.svelte', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /SETTINGS_SUMMARY_PREFS_KEY/);
  assert.doesNotMatch(source, /MAX_VISIBLE_SUMMARY_CARDS/);
  assert.doesNotMatch(source, /loadSummaryCardPrefs\(/);
  assert.doesNotMatch(source, /persistSummaryCardPrefs\(/);
  assert.doesNotMatch(source, /toggleSummaryCardVisibility\(/);
  assert.doesNotMatch(source, /moveSummaryCard\(/);
  assert.doesNotMatch(source, /resetSummaryCards\(/);
  assert.doesNotMatch(source, /summaryCards/);
  assert.doesNotMatch(source, /visibleSummaryCards/);
  assert.doesNotMatch(source, /settings-summary-grid/);
  assert.doesNotMatch(source, /settings-glance-card/);
  assert.doesNotMatch(source, /settings-summary-manager/);
  assert.doesNotMatch(source, /t\('settings\.summary\.manage'\)/);
});

test('设置页不应再直接格式化顶部摘要中的存储统计值', async () => {
  const source = await readFile(new URL('./Settings.svelte', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /function normalizeStorageUsageMb\(/);
  assert.doesNotMatch(source, /storageStats\.total_size_mb\.toFixed\(1\)/);
});

test('设置页应使用居中的操作工作台并避免外壳套外壳', async () => {
  const [source, css] = await Promise.all([
    readFile(new URL('./Settings.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../../app.css', import.meta.url), 'utf8'),
  ]);

  assert.match(source, /page-header page-axis-operation/);
  assert.match(source, /settings-editorial-board page-axis-operation/);
  assert.match(css, /\.settings-stage-shell\s*\{[^}]*min-width:\s*0/);
  assert.doesNotMatch(css, /\.settings-stage-shell\s*\{[^}]*(?:background|border|box-shadow):/);
  assert.match(css, /\.settings-editorial-shell \.page-header\s*\{[\s\S]*?border-bottom:\s*1px solid var\(--surface-border-subtle\)/);
  assert.match(css, /\.settings-tab-rail\s*\{[\s\S]*?border-right:\s*1px solid var\(--surface-border-subtle\)/);
  assert.match(css, /\.settings-tab-rail-item\s*\{[^}]*border:\s*1px solid transparent/);
  assert.match(css, /\.settings-tab-rail-item\s*\{[^}]*text-align:\s*start/);
  assert.doesNotMatch(css, /\.settings-tab-rail-item:hover\s*\{[^}]*transform:/);
});

test('设置页应按确认原型使用紧凑浅色导航与仅脏状态保存', async () => {
  const [source, css] = await Promise.all([
    readFile(new URL('./Settings.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../../app.css', import.meta.url), 'utf8'),
  ]);

  assert.match(source, /descriptionKey:\s*'settings\.tabDescriptions\.general'/);
  assert.match(source, /disabled=\{loading \|\| saving \|\| !dirty\}/);
  assert.match(source, /dirty \? t\('settings\.unsaved'\) : t\('settings\.saved'\)/);
  assert.match(source, /settings-tab-rail-spacer/);
  assert.match(source, /settings-tab-rail-note/);
  assert.match(css, /\.settings-editorial-shell\s*\{[^}]*color-scheme:\s*light/);
  assert.match(css, /\.settings-stage-layout\s*\{[^}]*grid-template-columns:\s*10\.375rem minmax\(0, 1fr\)/);
  assert.match(css, /\.settings-tab-rail-item-active::before/);
  assert.match(css, /\.settings-stage-shell\s*\{[^}]*width:\s*min\(54\.375rem, 100%\)/);
  assert.match(css, /\.settings-editorial-shell \.settings-card\s*\{[^}]*border-radius:\s*0\.55rem/);
});

test('设置页全部功能区应共享低对比卡片和分隔线', async () => {
  const css = await readFile(new URL('../../app.css', import.meta.url), 'utf8');

  assert.match(css, /\.settings-card\s*\{[^}]*@apply card p-5 rounded-2xl;/);
  assert.match(css, /\.dark \.settings-card\s*\{[^}]*border-color:\s*color-mix\(in srgb, var\(--surface-border-subtle\) 64%, transparent\)[^}]*box-shadow:\s*none/);
  assert.match(css, /\.settings-section > \.settings-block \+ \.settings-block\s*\{[^}]*58%/);
});

test('共享折叠区应向辅助技术暴露展开状态', async () => {
  const source = await readFile(new URL('../../lib/components/CollapsibleSection.svelte', import.meta.url), 'utf8');

  assert.match(source, /aria-expanded=\{open\}/);
});

test('隐私设置应作为设置工作台中的单层分组内容', async () => {
  const source = await readFile(new URL('./components/SettingsPrivacy.svelte', import.meta.url), 'utf8');

  assert.match(source, /settings-card settings-privacy/);
  assert.match(source, /settings-section settings-privacy-sections/);
  assert.match(source, /settings-block settings-privacy-app-rules/);
  assert.match(source, /settings-block settings-privacy-content-filter/);
  assert.doesNotMatch(source, /<hr\b/);
  assert.doesNotMatch(source, /settings-panel/);
});
