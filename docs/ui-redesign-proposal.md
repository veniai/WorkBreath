# WorkBreath UI 视觉优化实施方案

> 状态：待实施 ｜ 产出日期：2026-08-11 ｜ 对应版本：v1.4.2 (ac48b27)
> 本文档是唯一事实来源。实施时逐条对照验收，不要自行增减范围。
> 参考对比图：仓库根目录 `compare-overview.png` / `compare-ask.png` / `compare-dark.png`

## 0. 背景与目标

上一轮优化已完成"Apple 化收敛"（零阴影、8pt 网格、边框 token 化），界面干净了，但出现三个系统性问题：

1. **无品牌色灵魂**：全站 accent 是 Tailwind 默认企业蓝 `#3b82f6`，与 emerald 绿状态灯并存，色彩叙事混乱。产品叫"息刻/WorkBreath"、主业是护眼休息，但视觉上零体现。
2. **圆角节奏失衡**：窗口外壳 32px 大圆角 vs 内部卡片 16px，内外不同心，观感"外软内硬"。
3. **空状态雷同且无生气**：五个页面空态都是"大图标+两行字+两按钮"，是离用户最近的情感触点，目前完全浪费。

目标：建立"呼吸绿"品牌视觉语言，让应用在保持克制的前提下拥有可识别的个性。

## 1. 设计 Token 变更（所有改动的根基）

### 1.1 新增品牌色（`tailwind.config.js`）

在 `theme.extend.colors` 中新增，**保留现有 `primary` 不动**（避免一次性破坏 200+ 处引用，见 §6 迁移策略）：

```js
brand: {
  50:  '#effcf7',
  100: '#d7f5e9',
  200: '#b2ebd6',
  300: '#7fdcbd',
  400: '#4cc7a1',
  500: '#34c3a0',  // 主品牌色
  600: '#1daa86',  // hover / 深色文字
  700: '#0f9d78',
  800: '#0d7a5f',
  900: '#0b5f4b',
},
```

### 1.2 CSS 变量（`src/app.css` `:root` 与 `.dark`）

```css
:root {
  --brand-accent: #34c3a0;
  --brand-accent-deep: #0f9d78;
  --brand-accent-soft: rgba(52, 195, 160, 0.12);
  /* 对比度修正：卡片边框 0.05 → 0.08 */
  --surface-border-subtle: rgba(0, 0, 0, 0.08);
}
.dark {
  --brand-accent: #5eead4;
  --brand-accent-deep: #2dd4bf;
  --brand-accent-soft: rgba(94, 234, 212, 0.14);
  --surface-border-subtle: rgba(255, 255, 255, 0.10); /* 0.07 → 0.10 */
}
```

### 1.3 圆角 token 修正（同心规则）

规则：**外半径 = 内半径 + 间距**。当前 `--app-shell-frame-radius: 2rem` 与内层 `1.78rem` 差值仅 0.22rem，视觉上内外弧线明显不同心。修正为：

```css
--app-shell-frame-radius: 1.5rem;   /* 24px，原 32px */
--app-shell-inner-radius: 1.3rem;   /* ≈20.8px，保持 0.2rem 边距 */
```

全站圆角收敛为三档：`--radius-sm: 8px` / `--radius-md: 12px` / `--radius-lg: 20px`。
**审计并删除游离值**：`rounded-[22px]`（`.empty-state-icon`）改为 `rounded-[20px]`；shell 内 `1.78rem` 等魔法数随 token 自动收敛。

## 2. 逐项改动规格

### P0-1 品牌色替换主操作与选中态

| 位置 | 现状 | 改为 |
|---|---|---|
| `.page-action-brand`（主按钮） | `bg-primary-500` 平色 | 渐变 `linear-gradient(180deg, #3fd4ae, #1daa86)`；hover 用 `brand-600`；暗色下文字改 `#062e26` 保证对比 |
| `.page-control-btn-active`（选中 chip，如 Timeline"全部"） | 蓝底蓝边 | `background: var(--brand-accent-soft)`、`border-color: var(--brand-accent)`、文字 `var(--brand-accent-deep)` |
| `.sidebar-nav-item-active`（侧边栏当前页） | 仅文字加深 | 加 `background: var(--brand-accent-soft)`，图标与文字用 `var(--brand-accent-deep)`（暗色用 `--brand-accent`） |

注意：暗色模式下品牌按钮的浅色文字直接沿用白色会对比不足，必须按上表处理。

### P0-2 空状态呼吸动效 + 品牌光晕

涉及类：`.empty-state`、`.empty-state-lg`（`.empty-state-compact` 不动，它是虚线框风格）。

1. 光晕色：`rgba(224, 231, 255, …)`（indigo）→ 亮 `rgba(52,195,160,0.20)` / 暗 `rgba(45,212,191,0.16)`。
2. `.empty-state-icon`：图标色改 `var(--brand-accent-deep)`，投影色改 `rgba(52,195,160,0.18)`。
3. 新增呼吸动效（加在 app.css 动画区，与 fadeIn 同级）：

```css
@keyframes breath {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.05); }
}
.empty-state-icon { animation: breath 4s ease-in-out infinite; }
```

4. **必须**挂到已有的 `@media (prefers-reduced-motion: reduce)`（app.css:4847 附近）里关闭：`animation: none`。

### P0-3 圆角收敛

按 §1.3 改两个 token 值即可，逐页截图确认窗口四角与卡片嵌套观感。

### P1-4 暗色阴影统一

现状：亮色 `--shadow-sm/md` 被清零（"阴影只属于浮层"），暗色却保留完整阴影，同一弹窗两主题观感不一致。
改法：暗色 `--shadow-sm/md` 同样置 `none`，浮层统一只靠 `--shadow-lg` + 边框 `var(--surface-border-default)` 分层。检查点：语言切换菜单、日期选择器 popover、ConfirmDialog。

### P1-5 图标描边与品牌 mark

- 侧边栏图标 `stroke-width` 有 1.5 与 1.8（语言切换地球图标）混用 → 统一 1.75。
- Sidebar 品牌 mark（40px logo）容器 `rounded-xl` 改 `rounded-[12px]` 保持与三档一致，并去掉亮色下的 `shadow-md`（违反零阴影纪律，暗色本就 `shadow-none`，顺带统一）。

### P1-6 字号纪律回收

代码自述规矩为 10/11/12/14 四档，但存在泄漏：`text-[13px]` × 13 处（Ask.svelte、Overview.svelte、StatsCard.svelte、ActivityHourlyChart.svelte、SettingsAI.svelte 等）、`text-[2.15rem]/[1.9rem]/[1.55rem]` 各 1 处。
处理：13px → 归 12 或 14（按语义：正文→14、辅助→12）；三个散装大字号归入 `text-2xl/3xl` 并确认不破坏 Timeline 热区布局。

### P2-7 emerald 状态色与品牌绿的关系（需决策，默认 A）

侧边栏录制状态灯、若干成功态用 `emerald-*`（52 处）。两个选择：
- **A（默认，推荐）**：emerald 保留为"语义绿"（成功/录制中），品牌绿只用于交互 accent 与品牌触点。二者色相接近（emerald-500 #10b981 vs brand-500 #34c3a0），肉眼可共存。
- **B**：全量并入 brand，语义成功色另选。成本高、收益低，不建议本轮做。

## 3. 迁移策略（重要，防破坏）

`primary-*` 全站约 207 处引用（svelte 153 + app.css 54）。**不要全局替换**。只改两类：

1. §2 P0-1 列出的三个类（主按钮/选中 chip/侧边栏激活）。
2. 品牌触点：focus ring（`focus:ring-primary-500`）→ `focus:ring-brand-500`，全站约 10 处，可安全替换。

其余 `primary-*`（如报告链接色、blockquote 强调条）本轮保留蓝色，作为"内容色"存在。是否全面换绿留待下一版评估——先看 P0 落地效果。

## 4. 验收标准（实施者自检清单）

视觉验收（每页亮/暗各一张截图，1440×900）：
- [ ] Overview / Timeline / Report / Ask / Settings / About / EyeCare 七页无布局错位
- [ ] 主按钮为绿色渐变，hover 变深；暗色下按钮文字非白色
- [ ] 侧边栏当前页有绿色软底 + 绿色图标文字
- [ ] Ask/Timeline 空态图标为绿色、光晕为青绿，4s 呼吸循环可见
- [ ] 开启系统"减少动态效果"后呼吸停止
- [ ] 窗口四角圆角与主卡片同心感明显（对比前后截图）
- [ ] 暗色下弹窗与菜单不再有厚重投影

工程验收：
- [ ] `npm test`（如有脚本）/ 现有 `src/*.test.js` 全绿，重点关注 `UiVisualStyle.test.js`、`SurfaceConsistency.test.js`、`AppShellVisual.test.js`、`ApplicationVisualPolish.test.js`——这些测试可能断言了旧的蓝色值或圆角值，属预期内修改，随方案一并更新断言
- [ ] `npm run build` 无警告
- [ ] `grep -rn "rounded-\[22px\]" src` 无结果
- [ ] `grep -rn "text-\[13px\]" src` 无结果

## 5. 工作量估计

| 项 | 估时 |
|---|---|
| Token 落地（§1） | 0.5 天 |
| P0-1/2/3 三件套 | 1 天 |
| P1-4/5/6 | 1 天 |
| 测试断言更新 + 七页截图回归 | 0.5 天 |
| **合计** | **约 3 天**（P2-7 决策走默认 A，不占工时） |

## 6. 明确不做

- 不重排信息架构、不改交互流程、不动 i18n 文案
- 不引入新依赖（动效用纯 CSS，不上 framer-motion 之类）
- 不做 Header 节奏分化（原分析中的次级项，视觉收益不明确，本轮砍掉）
- emerald 语义绿不全量合并（§2 P2-7 默认 A）
