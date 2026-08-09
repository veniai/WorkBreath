import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readSources = () => Promise.all([
  readFile(new URL('./Sidebar.svelte', import.meta.url), 'utf8'),
  readFile(new URL('../../app.css', import.meta.url), 'utf8'),
]);

test('侧边栏应提供方案 A 的紧凑导航框架', async () => {
  const [source, css] = await readSources();

  assert.match(source, /sidebar-editorial-shell/);
  assert.match(source, /sidebar-brand-mark/);
  assert.match(source, /sidebar-status-panel/);
  assert.match(source, /sidebar-recording-copy/);
  assert.match(source, /sidebar-recording-toggle/);
  assert.match(source, /sidebar-nav-section/);
  assert.match(source, /sidebar-toolbelt/);
  assert.match(source, /sidebar-footer-light-only/);

  assert.match(css, /\.app-shell \.sidebar-brand-mark\s*\{[^}]*width:\s*2\.125rem;[^}]*height:\s*2\.125rem/);
  assert.match(css, /\.app-shell \.sidebar-recording-toggle-label\s*\{[^}]*display:\s*none/);
  assert.match(css, /\.app-shell \.sidebar-recording-toggle-icon\s*\{[^}]*display:\s*block/);
  assert.match(css, /\.app-shell \.sidebar-footer-light-only\s*\{[^}]*justify-content:\s*flex-start/);
});

test('侧边栏不应再提供主题切换入口', async () => {
  const [source] = await readSources();

  assert.doesNotMatch(source, /export let theme/);
  assert.doesNotMatch(source, /cycleTheme|themeChange|sidebar\.themeTitle/);
  assert.doesNotMatch(source, /sidebar-footer-action/);
});

test('侧边栏品牌区保持精简，不恢复装饰副标题', async () => {
  const [source] = await readSources();

  assert.doesNotMatch(source, /sidebar-brand-line|sidebar-brand-segment|sidebar\.tagline/);
});

test('侧边栏不增加装饰竖条或独立设备节点入口', async () => {
  const [source, css] = await readSources();

  assert.doesNotMatch(source, /sidebar-nav-rail/);
  assert.doesNotMatch(css, /\.sidebar-nav-rail\s*\{/);
  assert.doesNotMatch(source, /path:\s*'\/node'|labelKey:\s*'sidebar\.nav\.node'|item\.icon === 'node'/);
});
