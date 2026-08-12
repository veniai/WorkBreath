import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const overviewUrl = new URL('./Overview.svelte', import.meta.url);
const appUrl = new URL('../App.svelte', import.meta.url);
const cssUrl = new URL('../app.css', import.meta.url);

test('概览 B 方案应复用 App 的护眼事件状态而不是新增轮询', async () => {
  const [app, overview, store] = await Promise.all([
    readFile(appUrl, 'utf8'),
    readFile(overviewUrl, 'utf8'),
    readFile(new URL('../lib/stores/eyeCare.js', import.meta.url), 'utf8'),
  ]);

  assert.match(app, /import \{ eyeCareStore \} from '\.\/lib\/stores\/eyeCare\.js'/);
  assert.match(app, /eyeCareStatus = await invoke\('get_eye_care_status'\);\s*eyeCareStore\.set\(eyeCareStatus\)/);
  assert.match(app, /safeListen\('eye-care-status-changed',[\s\S]*eyeCareStore\.set\(event\.payload\)/);
  assert.match(overview, /import \{ eyeCareStore \} from '\.\.\/lib\/stores\/eyeCare\.js'/);
  assert.doesNotMatch(overview, /invoke\('get_eye_care_status'\)/);
  assert.doesNotMatch(store, /setInterval|invoke|listen/);
});

test('概览洞察条应覆盖计时、休息、等待返回、暂停和未启用降级', async () => {
  const source = await readFile(overviewUrl, 'utf8');

  assert.match(source, /overview-eye-care-summary/);
  assert.match(source, /eyeCarePhase === 'RESTING'/);
  assert.match(source, /eyeCarePhase === 'WAITING_RETURN'/);
  assert.match(source, /eyeCareIsPaused = Boolean\(\$eyeCareStore\?\.paused\)/);
  assert.match(source, /\{#if \$eyeCareStore\?\.enabled\}/);
  assert.match(source, /\{:else\}[\s\S]*overview\.insightWeekLink/);
  assert.match(source, /role="progressbar"/);
  assert.match(source, /aria-valuenow=\{eyeCareProgressPercent\}/);
});

test('概览护眼快捷暂停应读取最新配置后保存并防止重复提交', async () => {
  const source = await readFile(overviewUrl, 'utf8');

  assert.match(source, /if \(!eyeCareCanTogglePause \|\| togglingEyeCarePause\) return/);
  assert.match(source, /const config = await invoke\('get_config'\)/);
  assert.match(source, /const nextPaused = !eyeCareIsPaused/);
  assert.match(source, /config\.eye_care_paused = nextPaused/);
  assert.match(source, /await invoke\('save_config', \{ config \}\)/);
  assert.match(source, /eyeCareStore\.set\(\{ \.\.\.\$eyeCareStore, paused: nextPaused \}\)/);
  assert.match(source, /disabled=\{togglingEyeCarePause\}/);
  assert.match(source, /formatUserError\(toggleError, t\('overview\.eyeCareToggleFailed'\)\)/);
});

test('概览护眼摘要应在中窄窗口换行且不挤压洞察正文', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /\.overview-eye-care-summary\s*\{[^}]*grid-template-columns:\s*2\.25rem minmax\(0, 1fr\) 2rem/);
  assert.match(css, /@media \(max-width: 920px\)[\s\S]*?\.overview-eye-care-summary\s*\{[^}]*width:\s*100%;[^}]*border-block-start:/);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*?\.overview-eye-care-summary\s*\{[^}]*grid-column:\s*1 \/ -1/);
  assert.match(css, /\.overview-eye-care-copy strong,[\s\S]*?text-overflow:\s*ellipsis/);
});

test('概览护眼文案应覆盖四种语言', async () => {
  const localeNames = ['zh-CN', 'zh-TW', 'en', 'ar'];
  const requiredKeys = [
    'eyeCareBreakIn',
    'eyeCareCycleProgress',
    'eyeCareResting',
    'eyeCareWaitingReturn',
    'eyeCarePaused',
    'eyeCarePause',
    'eyeCareResume',
    'eyeCareToggleFailed',
  ];

  for (const localeName of localeNames) {
    const source = await readFile(new URL(`../lib/i18n/locales/${localeName}.js`, import.meta.url), 'utf8');
    for (const key of requiredKeys) {
      assert.match(source, new RegExp(`\\b${key}:\\s*['\\\"]`), `${localeName} 缺少 ${key}`);
    }
  }
});
