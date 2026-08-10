import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('WorkBreath 息刻品牌进入正式壳层、关于页、打包配置和文档', async () => {
  const [html, app, sidebar, about, tauri, readme, icon] = await Promise.all([
    read('../index.html'),
    read('./App.svelte'),
    read('./lib/components/Sidebar.svelte'),
    read('./routes/about/About.svelte'),
    read('../src-tauri/tauri.conf.json'),
    read('../README.zh.md'),
    read('../src-tauri/icons/workbreath-icon.svg'),
  ]);

  assert.match(html, /<title>WorkBreath · 息刻<\/title>/);
  assert.match(html, /href="\/icon\.png"/);
  assert.match(app, />WorkBreath</);
  assert.match(sidebar, /WorkBreath/);
  assert.match(about, /WorkBreath[\s\S]*息刻/);
  assert.equal(JSON.parse(tauri).productName, 'WorkBreath');
  assert.match(readme, /工作有迹，双眼有息/);
  assert.match(icon, /viewBox="0 0 1024 1024"/);
  assert.match(icon, /#3853C9/);
  assert.match(icon, /#66B89B/);
});

test('品牌升级保留内部标识以兼容旧数据、更新和启动路径', async () => {
  const [pkg, tauri] = await Promise.all([
    read('../package.json'),
    read('../src-tauri/tauri.conf.json'),
  ]);
  const packageJson = JSON.parse(pkg);
  const tauriConfig = JSON.parse(tauri);

  assert.equal(packageJson.name, 'work-review');
  assert.equal(tauriConfig.mainBinaryName, 'Work_Review');
  assert.equal(tauriConfig.identifier, 'com.workreview.app');
});
