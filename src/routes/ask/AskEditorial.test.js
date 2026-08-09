import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [source, appCssSource, sidebarSource] = await Promise.all([
  readFile(new URL('./Ask.svelte', import.meta.url), 'utf8'),
  readFile(new URL('../../app.css', import.meta.url), 'utf8'),
  readFile(new URL('../../lib/components/Sidebar.svelte', import.meta.url), 'utf8'),
]);

function countMatches(value, pattern) {
  return value.match(pattern)?.length ?? 0;
}

test('助手左上角应复用其他页面的统一页头结构', () => {
  const header = source.match(/<div class="page-header page-axis-operation">[\s\S]*?<\/div>\s*<div bind:this=\{chatBody\}/)?.[0] ?? '';

  assert.ok(header, '应渲染统一 page-header');
  assert.match(header, /page-title-group/);
  assert.match(header, /page-title-badge/);
  assert.match(header, /page-title-copy/);
  assert.match(header, /t\('sidebar\.nav\.ask'\)/);
  assert.match(header, /currentConversationTitle/);
  assert.match(header, /ask-header-history/);
  assert.match(header, /ask-header-new/);
  const sharedAssistantIcon = /d="M8 10h8M8 14h4m-6 6h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/;
  assert.match(header, sharedAssistantIcon);
  assert.match(sidebarSource, sharedAssistantIcon);
  assert.doesNotMatch(source, /ask-conversation-bar/);
  assert.doesNotMatch(source, /ask-context-strip/);
});

test('历史会话与新对话入口应位于统一页头，而不是输入器内部', () => {
  const header = source.match(/<div class="page-header page-axis-operation">[\s\S]*?<\/div>\s*<div bind:this=\{chatBody\}/)?.[0] ?? '';
  const composer = source.match(/<div class="ask-composer-shell[\s\S]*?<\/div>\s*<\/div>/)?.[0] ?? '';

  assert.match(header, /ask-header-history/);
  assert.match(header, /ask-header-new/);
  assert.doesNotMatch(composer, /ask-header-history|ask-header-new/);
});

test('欢迎态应使用短标题和短说明，并保持四条快捷问题', () => {
  const welcome = source.match(/<section class="[^"]*ask-welcome-panel[^"]*"[\s\S]*?<\/section>/)?.[0] ?? '';

  assert.ok(welcome, '应保留欢迎态容器');
  assert.match(welcome, /ask-welcome-kicker/);
  assert.match(welcome, /ask-assistant-mark/);
  assert.match(welcome, /t\('ask\.subtitle'\)/);
  assert.doesNotMatch(welcome, /ask-welcome-product-mark|\/icons\/128x128\.png/);
  assert.match(welcome, /t\('ask\.welcomeTitle'\)/);
  assert.match(welcome, /t\('ask\.welcomeBrief'\)/);
  assert.match(welcome, /ask-starter-grid/);
  assert.match(welcome, /starterPrompts\.slice\(0, 4\)/);
  assert.match(welcome, /ask-starter-index/);
  assert.match(welcome, /String\(promptIndex \+ 1\)\.padStart\(2, '0'\)/);
  assert.match(welcome, /ask-starter-arrow/);
  assert.match(appCssSource, /\.ask-workbench-shell \.ask-starter-card\s*\{[^}]*justify-content:\s*flex-start[^}]*text-align:\s*start/s);
});

test('快捷问题应从扩展问题池随机抽取，并在关键操作后刷新', () => {
  assert.match(source, /import \{ selectStarterPrompts \} from '\.\/starterPromptPresentation\.js';/);
  assert.match(source, /function refreshStarterPrompts\(/);
  assert.match(source, /tm\('ask\.starterPrompts'\)/);
  assert.match(source, /selectStarterPrompts\(\{/);
  assert.ok(countMatches(source, /refreshStarterPrompts\(/g) >= 4, '进入页面、新对话、切换模型和动态生成后都应刷新');
});

test('语言切换应刷新对应语言的动态问题，并避免首次挂载重复洗牌', () => {
  const localeBlock = source.match(/\$: if \(currentLocale && currentLocale !== starterPromptLocale\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
  const mountBlock = source.match(/onMount\(async \(\) => \{[\s\S]*?\n  \}\);/)?.[0] ?? '';

  assert.match(localeBlock, /void refreshDynamicPrompts\(\)/);
  assert.match(mountBlock, /if \(starterPrompts\.length === 0\)/);
});

test('动态问题请求在读取统计后应再次校验请求是否仍有效', () => {
  const dynamicFunction = source.match(/async function refreshDynamicPrompts\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
  const statsIndex = dynamicFunction.indexOf("invoke('get_today_stats')");
  const generateIndex = dynamicFunction.indexOf("invoke('generate_text_with_model'");
  const staleCheckIndex = dynamicFunction.indexOf('requestId !== starterPromptRequestId', statsIndex);

  assert.ok(statsIndex >= 0 && generateIndex > statsIndex, '应先读取统计，再调用模型');
  assert.ok(staleCheckIndex > statsIndex && staleCheckIndex < generateIndex, '模型调用前应丢弃已失效请求');
});

test('助手回答应直接排版在阅读画布上，不再使用整张回答卡', () => {
  assert.match(source, /assistant-markdown/);
  assert.match(source, /ask-message-row-assistant/);
  assert.doesNotMatch(source, /ask-answer-card/);
});

test('工具过程与高风险操作确认能力应继续保留', () => {
  assert.match(source, /ask-tool-summary/);
  assert.match(source, /respondConfirm\(message\.id, step, true\)/);
  assert.match(source, /respondConfirm\(message\.id, step, false\)/);
});

test('输入框内部应说明参考记录的范围和来源', () => {
  const composer = source.match(/<div class="ask-composer-shell[\s\S]*?<\/div>\s*<\/div>/)?.[0] ?? '';

  assert.ok(composer, '应渲染输入框容器');
  assert.match(composer, /ask-context-menu/);
  assert.match(composer, /<summary aria-label=\{t\('ask\.recordContext'\)\}/);
  assert.match(composer, /t\('ask\.recordContext'\)/);
  assert.match(composer, /t\('ask\.contextScope'\)/);
  assert.match(composer, /t\('ask\.contextSources'\)/);
  assert.doesNotMatch(composer, /currentContextDate|ask\.workContext/);
  assert.doesNotMatch(composer, /\{currentModelLabel\}/);
});

test('引用应改为回答依据线，不再默认展示来源卡片网格', () => {
  assert.match(source, /ask-reference-trail/);
  assert.match(source, /t\('ask\.referenceTrail', \{ count: message\.references\.length \}\)/);
  assert.match(source, /aria-label=\{t\('ask\.referenceTrail', \{ count: message\.references\.length \}\)\}/);
  assert.doesNotMatch(source, /ask-reference-grid|ask-reference-card/);
});

test('真实模型标签应只在输入框内可见一次', () => {
  assert.match(source, /resolveModelOptionLabel/);
  assert.equal(countMatches(source, /\{currentModelLabel\}/g), 0);
  assert.doesNotMatch(source, /t\('ask\.contextModel'/);
});

test('模型选项应逐 profile 展示，不能复用当前选中标签', () => {
  const selector = source.match(/<select[\s\S]*?class="ask-model-select"[\s\S]*?<\/select>/)?.[0] ?? '';

  assert.ok(selector);
  assert.match(selector, /<option value=\{BASIC_ASSISTANT_MODEL_ID\}>[\s\S]*?t\('ask\.basicTemplate'\)[\s\S]*?<\/option>/);
  assert.match(selector, /displayModelProfileName\(profile\)/);
  assert.doesNotMatch(selector, /currentModelLabel/);
});

test('流式回答、错误状态和历史会话能力应继续保留', () => {
  assert.match(source, /aria-busy=\{message\.role === 'assistant'/);
  assert.match(source, /class="ask-error-callout" role="alert"/);
  assert.match(source, /ask-history-drawer/);
  assert.match(source, /ask-history-delete/);
});

test('欢迎态应使用成熟 AI 产品常见的左对齐阅读轴和两列快捷入口', () => {
  const welcomeRule = appCssSource.match(/\.ask-workbench-shell \.ask-welcome-panel\s*\{[^}]*\}/)?.[0] ?? '';
  const kickerRule = appCssSource.match(/\.ask-workbench-shell \.ask-welcome-kicker\s*\{[^}]*\}/)?.[0] ?? '';
  const titleRule = appCssSource.match(/\.ask-workbench-shell \.ask-welcome-copy h2\s*\{[^}]*\}/)?.[0] ?? '';
  const gridRule = appCssSource.match(/\.ask-workbench-shell \.ask-starter-grid\s*\{[^}]*\}/)?.[0] ?? '';
  const cardRule = appCssSource.match(/\.ask-workbench-shell \.ask-starter-card\s*\{[^}]*\}/)?.[0] ?? '';
  const mobileBlock = appCssSource.match(/@media \(max-width: 560px\) \{[\s\S]*?\n\}/)?.[0] ?? '';

  assert.match(welcomeRule, /max-width:\s*51\.25rem/);
  assert.match(welcomeRule, /align-items:\s*stretch/);
  assert.match(welcomeRule, /text-align:\s*start/);
  assert.match(kickerRule, /color:\s*#1d64d6/);
  assert.match(titleRule, /font-size:\s*1\.5rem/);
  assert.match(titleRule, /white-space:\s*normal/);
  assert.match(gridRule, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(cardRule, /border-radius:\s*0\.5rem/);
  assert.match(cardRule, /justify-content:\s*flex-start/);
  assert.match(mobileBlock, /\.ask-workbench-shell \.ask-starter-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s);
});

test('对话正文与输入框应共用同一阅读轴，并采用固定亮色蓝色主动作', () => {
  assert.match(appCssSource, /\.ask-workbench-shell \.ask-thread-shell\s*\{[^}]*max-width:\s*51\.25rem/s);
  assert.match(appCssSource, /\.ask-workbench-shell \.ask-composer-shell\s*\{[^}]*max-width:\s*51\.25rem/s);
  assert.match(appCssSource, /\.ask-workbench-shell\s*\{[^}]*background:\s*#f8fafb[^}]*--ask-accent:\s*#2f78e8/s);
  assert.match(appCssSource, /\.ask-workbench-shell \.ask-send-button\s*\{[^}]*border-radius:\s*0\.42rem[^}]*background:\s*#2f78e8/s);
});

test('工具过程、回答依据和历史会话应保持紧凑且可展开', () => {
  assert.match(appCssSource, /\.ask-workbench-shell \.ask-tool-summary\s*\{[^}]*border-block-color:\s*#ebf0f3/s);
  assert.match(appCssSource, /\.ask-workbench-shell \.ask-reference-line\s*\{[^}]*background:\s*#dfe6eb/s);
  assert.match(appCssSource, /\.ask-history-drawer\s*\{[^}]*width:\s*min\(25rem, 85vw\)/s);
});
