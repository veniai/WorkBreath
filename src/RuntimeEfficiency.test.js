import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appPath = new URL('./App.svelte', import.meta.url);
const timelinePath = new URL('./routes/timeline/Timeline.svelte', import.meta.url);

test('启动阶段不应预取会被页面重新加载的统计与时间线数据', async () => {
  const source = await readFile(appPath, 'utf8');

  assert.doesNotMatch(source, /function\s+preloadApp\s*\(/);
  assert.doesNotMatch(source, /invoke\('get_today_stats'/);
  assert.doesNotMatch(source, /invoke\('get_timeline'/);
  assert.doesNotMatch(source, /invoke\('get_hourly_summaries'/);
});

test('时间线只在查看详情时加载高清图', async () => {
  const source = await readFile(timelinePath, 'utf8');

  assert.doesNotMatch(source, /activities\.slice\(0,\s*6\)\.forEach\([^\n]*loadFullImage/);
  assert.match(
    source,
    /const fullImagePromise = activity\.screenshot_path[\s\S]*?loadFullImage\(activity\.screenshot_path\)/,
  );
});
