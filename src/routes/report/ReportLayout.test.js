import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('日报页头部应使用独立布局以适配英文长标题与日期信息', async () => {
  const [reportSource, appCssSource] = await Promise.all([
    readFile(new URL('./Report.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../../app.css', import.meta.url), 'utf8'),
  ]);

  assert.match(reportSource, /class="report-hero"/);
  assert.match(reportSource, /class="report-hero-main"/);
  assert.match(reportSource, /class="report-hero-meta"/);
  assert.match(reportSource, /class="report-hero-actions"/);
  assert.match(reportSource, /report-hero-date-row/);
  assert.match(reportSource, /report-hero-mode-chip/);
  assert.match(reportSource, /report-hero-mode-note/);
  assert.match(reportSource, /report-regenerate-action/);
  assert.doesNotMatch(reportSource, /<div class="page-header">/);

  assert.match(appCssSource, /\.report-hero\b/);
  assert.match(appCssSource, /\.report-hero-main\b/);
  assert.match(appCssSource, /\.report-hero-meta\b/);
  assert.match(appCssSource, /\.report-hero-actions\b/);
  assert.match(appCssSource, /\.report-hero-date-row\b/);
  assert.match(appCssSource, /\.report-hero-mode-chip\b/);
  assert.match(appCssSource, /\.report-hero-mode-note\b/);
});

test('日报生成设置应使用独立右侧抽屉，不挤压正文阅读区', async () => {
  const [reportSource, appCssSource] = await Promise.all([
    readFile(new URL('./Report.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../../app.css', import.meta.url), 'utf8'),
  ]);

  assert.match(reportSource, /class="report-generate-overlay"/);
  assert.match(reportSource, /class="report-generate-backdrop"/);
  assert.match(reportSource, /role="dialog"/);
  assert.match(reportSource, /aria-modal="true"/);
  assert.match(appCssSource, /\.report-generate-overlay\s*\{[\s\S]*position:\s*fixed/);
  assert.match(appCssSource, /\.report-editorial-shell \.report-generate-drawer\s*\{[\s\S]*width:\s*min\(27\.5rem, 100%\)/);
});

test('日报抽屉进入预设编辑时应切换为单一弹窗层，并统一键盘与视觉规范', async () => {
  const [reportSource, appCssSource] = await Promise.all([
    readFile(new URL('./Report.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../../app.css', import.meta.url), 'utf8'),
  ]);

  assert.match(reportSource, /import \{ trapFocus \} from '\$lib\/utils\/focusTrap\.js'/);
  assert.match(
    reportSource,
    /function openPresetEditor[\s\S]*presetReturnsToGenerateDrawer = showGenerateDrawer;[\s\S]*showGenerateDrawer = false;[\s\S]*showPresetModal = true;/,
  );
  assert.match(
    reportSource,
    /function closePresetEditor[\s\S]*showPresetModal = false;[\s\S]*showGenerateDrawer = true;/,
  );
  assert.match(reportSource, /on:keydown=\{handleReportKeydown\}/);
  assert.equal((reportSource.match(/use:trapFocus/g) || []).length, 4);
  assert.equal((reportSource.match(/role="dialog"/g) || []).length, 4);
  assert.match(reportSource, /class="modal-panel report-modal-panel-preset"[\s\S]*aria-modal="true"/);
  assert.doesNotMatch(reportSource, /style="max-width:\s*(?:32|36)rem;"/);

  assert.match(appCssSource, /\.modal-overlay\s*\{[\s\S]*z-index:\s*150/);
  assert.match(appCssSource, /\.modal-panel\s*\{[\s\S]*border-radius:\s*0\.75rem/);
  assert.match(appCssSource, /\.report-modal-button-primary\s*\{/);
  assert.match(appCssSource, /\.report-layer-close\s*\{/);
});

test('昨日日报提示条应为独立动作区提供响应式布局，避免生成中按钮被压扁', async () => {
  const [reportSource, appCssSource] = await Promise.all([
    readFile(new URL('./Report.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../../app.css', import.meta.url), 'utf8'),
  ]);

  assert.match(reportSource, /report-fallback-banner/);
  assert.match(reportSource, /report-fallback-copy/);
  assert.match(reportSource, /report-fallback-action/);
  assert.match(reportSource, /report-fallback-button/);

  assert.match(appCssSource, /\.report-fallback-banner\b/);
  assert.match(appCssSource, /\.report-fallback-copy\b/);
  assert.match(appCssSource, /\.report-fallback-action\b/);
  assert.match(appCssSource, /\.report-fallback-button\b/);
});

test('日报页纸面容器应复用统一 editorial surface，而不是额外偏黄底色', async () => {
  const appCssSource = await readFile(new URL('../../app.css', import.meta.url), 'utf8');

  assert.match(appCssSource, /\.report-sheet-controls\s*\{[\s\S]*background:\s*var\(--editorial-surface-subtle\)/);
  assert.match(appCssSource, /\.report-article-card\s*\{[\s\S]*background:\s*var\(--editorial-surface-featured\)/);
  // 极简风：主卡片用统一 token 阴影，不再叠斜纹纹理伪元素
  assert.match(appCssSource, /\.report-article-card\s*\{[\s\S]*box-shadow:\s*none/);
});

test('日报正文段落应提供稳定动作区、导语和表格阅读样式', async () => {
  const [reportSource, appCssSource] = await Promise.all([
    readFile(new URL('./Report.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../../app.css', import.meta.url), 'utf8'),
  ]);

  assert.match(reportSource, /report-section-actions/);
  assert.match(appCssSource, /\.report-section\s*\{[\s\S]*padding:/);
  assert.match(appCssSource, /\.report-section-content\s+blockquote:first-of-type\b/);
  assert.match(appCssSource, /\.report-section-actions\b/);
  // 表格不再自身加阴影（卡片已有阴影）；断言改为统计卡新结构
  assert.match(reportSource, /report-stat-card/);
  assert.match(appCssSource, /\.report-stat-card\b/);
});
