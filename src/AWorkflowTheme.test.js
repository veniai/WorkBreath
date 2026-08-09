import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('产品应固定使用亮色，同时保留旧配置字段用于向后兼容', async () => {
  const [appSource, sidebarSource, configSource] = await Promise.all([
    readFile(new URL('./App.svelte', import.meta.url), 'utf8'),
    readFile(new URL('./lib/components/Sidebar.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../crates/core/src/config.rs', import.meta.url), 'utf8'),
  ]);

  assert.match(appSource, /document\.documentElement\.classList\.remove\('dark'\)/);
  assert.match(appSource, /document\.documentElement\.style\.colorScheme\s*=\s*'light'/);
  assert.doesNotMatch(appSource, /prefers-color-scheme:\s*dark/);
  assert.doesNotMatch(appSource, /function applyTheme|function detectSystemTheme|handleThemeChange/);
  assert.doesNotMatch(appSource, /on:themeChange|\{theme\}/);

  assert.doesNotMatch(sidebarSource, /export let theme|cycleTheme|themeChange|sidebar\.themeTitle/);
  assert.match(sidebarSource, /sidebar-footer-light-only/);

  // 方案 1：运行时不再消费主题，但配置字段暂留，避免破坏旧配置反序列化。
  assert.match(configSource, /pub theme:\s*String/);
});
