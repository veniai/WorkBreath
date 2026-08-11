<p align="center">
  <img src="src-tauri/icons/icon.png" width="100" alt="WorkBreath">
</p>

<h1 align="center">WorkBreath</h1>

<p align="center">
  <strong>工作有迹，双眼有息。自动记录工作上下文，也认真照顾每一次休息。</strong>
</p>

<p align="center">
  自动整理你使用过的应用、访问过的网站、窗口标题和可选截图，把零散工作痕迹变成可回看、可统计、可追问的时间线。
</p>

<p align="center">
  所有数据默认仅保存在本地设备，不上传任何服务器。AI 功能完全可选；关闭后照常使用。
</p>

<p align="center">
  <strong>🔒 仅供个人使用 —— 所有数据只存在你的设备上。</strong>
</p>

<p align="center">
  <a href="./README.md">English</a> · <strong>简体中文</strong> · <a href="./README.tw.md">繁體中文</a>
</p>

<p align="center">
  <a href="https://github.com/veniai/WorkBreath/releases/latest">
    <img src="https://img.shields.io/github/v/release/veniai/WorkBreath?style=flat-square&color=blue" alt="Release">
  </a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/%F0%9F%94%92%20all%20data%20local-green?style=flat-square" alt="All Data Local">
  <img src="https://img.shields.io/github/license/veniai/WorkBreath?style=flat-square" alt="License">
</p>

---

## 它解决什么问题

WorkBreath 面向个人工作复盘，适合用来回答这些问题：

- 我今天到底做了什么？
- 这几天主要在推进什么？
- 某个任务大概花了多少时间？
- 我当时看过哪个页面、哪个窗口、哪些上下文？
- 今天的日报怎么快速整理出来？

它的重点不是“监督”，而是帮助你**回忆、整理和复盘**自己的工作过程。

---

## 核心能力

- **自动记录工作上下文** — 记录前台应用、浏览器页面、窗口标题、使用时长、可选截图和 OCR 文本，减少手动补记
- **统一时间线和统计** — 概览、时间线、工作助手、日报共用同一份本地记录，既能看趋势，也能追到具体上下文
- **本地记录问答** — 用基础模板或你配置的模型回答“今天做了什么”“某个任务花了多久”“最近在推进什么”等问题
- **日报生成与导出** — 生成结构化日报，支持 Markdown 导出、自动导出、段落编辑、钉选/隐藏和 AI 编排顺序
- **隐私优先，本地可控** — 数据默认保存在本地 SQLite；AI 可不启用，模型调用使用你自己的 API Key，不经第三方中转
- **护眼休息** — 默认估算有效使用 40 分钟后强制休息 3 分钟，覆盖每块显示器；休息结束后默认锁屏，可在护眼设置中关闭
- **多语言界面** — 支持简体中文、English、繁體中文、العربية（阿拉伯语，RTL 布局）

---

## 界面预览

以下截图由本地运行中的桌面应用自动截取，使用对应语言界面和代表性的本地数据，覆盖主要工作流和配置界面。

### 核心工作流

<p align="center">
  <img src="docs/Introduction_zh/工作流.gif" alt="核心工作流动图" width="720" />
</p>

<p align="center"><strong>概览</strong></p>
<p align="center">
  <img src="docs/Introduction_zh/概览.png" alt="概览" width="720" />
</p>

<p align="center"><strong>时间线</strong></p>
<p align="center">
  <img src="docs/Introduction_zh/时间线.png" alt="时间线" width="720" />
</p>

<p align="center"><strong>时间线详情</strong></p>
<p align="center">
  <img src="docs/Introduction_zh/时间线详情.png" alt="时间线详情" width="720" />
</p>

<p align="center"><strong>日报</strong></p>
<p align="center">
  <img src="docs/Introduction_zh/日报.png" alt="日报" width="720" />
</p>

<p align="center"><strong>工作助手</strong></p>
<p align="center">
  <img src="docs/Introduction_zh/助手.png" alt="工作助手" width="720" />
</p>

<p align="center"><strong>接入管理</strong></p>
<p align="center">
  <img src="docs/Introduction_zh/接入管理.png" alt="接入管理和 MCP Server 设置" width="720" />
</p>

<details>
<summary>更多截图：小时总结、设置与关于页</summary>

<p align="center"><strong>小时总结</strong></p>
<p align="center">
  <img src="docs/Introduction_zh/小时总结.png" alt="小时总结" width="720" />
</p>

<p align="center"><strong>通用设置</strong></p>
<p align="center">
  <img src="docs/Introduction_zh/设置-通用.png" alt="通用设置" width="720" />
</p>

<p align="center"><strong>外观设置</strong></p>
<p align="center">
  <img src="docs/Introduction_zh/设置-外观.png" alt="外观设置" width="720" />
</p>

<p align="center"><strong>AI 模型</strong></p>
<p align="center">
  <img src="docs/Introduction_zh/设置-AI模型.png" alt="AI 模型设置" width="720" />
</p>


<p align="center"><strong>隐私设置</strong></p>
<p align="center">
  <img src="docs/Introduction_zh/设置-隐私.png" alt="隐私设置" width="720" />
</p>

<p align="center"><strong>存储设置</strong></p>
<p align="center">
  <img src="docs/Introduction_zh/设置-存储.png" alt="存储设置" width="720" />
</p>

<p align="center"><strong>关于</strong></p>
<p align="center">
  <img src="docs/Introduction_zh/关于.png" alt="关于 WorkBreath" width="720" />
</p>

</details>

---

## 隐私与边界

WorkBreath 从设计上面向个人使用，不适用于：员工监控 · 团队考勤 · 绩效考核 · 隐形追踪

你可以按需控制记录范围：

- 按应用设置为「正常 / 脱敏 / 忽略」，脱敏模式自动跳过截图和 OCR
- 敏感关键词自动过滤 · 域名黑名单
- 锁屏自动暂停 · 手动暂停/恢复
- AI 仅在你主动配置模型后启用，默认关闭

---

## 功能概览

### 自动记录

- 前台应用、窗口标题、浏览器 URL、使用时长和分类记录
- 可选截图与 OCR，支持多屏策略
- 键鼠活动 + 屏幕变化空闲检测，减少挂机误记
- 时间线回看任意时段的页面、窗口和上下文

### 智能整理

- 工作助手基于本地记录问答，支持基础模板、AI 增强，以及配置模型后显示动态开场提示
- 概览页答案优先：一句话洞察总结、KPI 卡带较上周同日对比、「今日节奏」主视觉卡（分类构成条 + 按天投入柱状图）
- 常驻网站按域名聚合，展示浏览器来源、页面数和时长，支持卡片内展开全部网站并编辑语义分类
- 支持时长统计、分类筛选、趋势对比、自然语言时间范围，并可按今日、本周、指定日期、日期范围查看小时活跃度
- 碎片活动聚合为连续工作 Session
- 内置分类知识库（约 140 个域名 + 70 个应用）+ AI 自动学习归类，并回溯修正历史

### 日报与复盘

- 结构化日报，含 TL;DR 洞察条、参照系 KPI、数据对照面板
- 导出下拉菜单（Markdown / 区间合并导出 / 复制全文）+ 生成设置抽屉（预设 / 系统提示覆盖 / 段落管理）
- 生成中骨架屏 + 昨日日报醒目横幅
- 历史回看、自动导出、段落级钉选/隐藏/恢复，AI 编排顺序可缓存复用
- AI 增强下的附加提示词和自定义模型
- 网站语义分类：修改域名分类后自动回填历史
- 多段工作时间：如上午 + 下午，休息时间不计入

---

## AI 模式

WorkBreath 的核心始终是**本地记录**。AI 的作用是让记录更容易阅读和复盘，而不是使用前提。

| 模式 | 说明 |
|------|------|
| **基础模板** | 零配置，输出稳定的结构化结果 |
| **AI 增强** | 调用你自行配置的模型服务，让问答和总结更自然 |

支持的提供商：Ollama (本地) / LM Studio (本地) / OpenAI 兼容 / DeepSeek / 通义千问 / 智谱 / Kimi / 豆包 / MiniMax / SiliconFlow / Gemini / Claude / OpenRouter / Groq / xAI Grok / Mistral / 自定义接口

---

## 快速开始

1. 从 [Releases](https://github.com/veniai/WorkBreath/releases/latest) 下载对应平台安装包
2. macOS 需授予屏幕录制、辅助功能权限
3. 保持后台运行一段时间
4. 回到概览 / 时间线 / 日报查看当天记录

| 平台 | 安装包 |
|------|--------|
| macOS (Apple Silicon / Intel) | `.dmg` |
| Windows | `.exe` / 便携版 `.zip` |
| Linux x86_64 (X11 / Wayland) | `.deb` / `.rpm` / `.AppImage` |
| Linux ARM64 (aarch64) | `.deb` |

**macOS：** 截图需「屏幕录制」，活动识别需「辅助功能」，护眼空闲检测可能需「输入监控」。首次提示"已损坏"时：`sudo xattr -rd com.apple.quarantine "/Applications/WorkBreath.app"`

**Windows：** 依赖 Microsoft Edge WebView2 Runtime。

> **Windows 11 智能应用控制**：若系统提示「智能应用控制阻止了程序启动」，是因为本应用使用自签名证书（非 EV 商业证书）。可在「Windows 安全中心 → 应用和浏览器控制 → 智能应用控制」中将其关闭后运行。详见上游 issue [#139](https://github.com/wm94i/Work-Review/issues/139)。

**Linux：** 截图和窗口追踪依赖当前会话类型与工具链。<details><summary>依赖说明</summary>

```bash
# 基础
sudo apt install xprintidle tesseract-ocr
# X11
sudo apt install xdotool x11-utils scrot
# Wayland: gdbus (GNOME) / kdotool (KDE) / swaymsg (Sway) / hyprctl (Hyprland)
# 截图: grim / gnome-screenshot / spectacle

# RPM-based distributions
sudo dnf install xprintidle tesseract xdotool xorg-x11-utils gnome-screenshot procps-ng
sudo zypper install xprintidle tesseract-ocr xdotool xorg-x11-tools gnome-screenshot procps
```

</details>

Ubuntu 24.04 / 24.10 Wayland (GNOME 46–47) 用户如遇截图闪屏/快门声问题，可使用一键安装脚本自动修复：

```bash
bash scripts/deb/reinstall.sh      # deb 方案（推荐）
bash scripts/deb/reinstall.sh --dry-run  # 预览操作
```

详见 [scripts/ubuntu-wayland-README.md](scripts/ubuntu-wayland-README.md)。

**KDE Plasma / Wayland 启动崩溃（Fedora、Arch、openSUSE 等）：** 若应用启动后立即退出并报 `Gdk-Message: Error 71 (Protocol error) dispatching to Wayland display.`，这是 webkit2gtk/GTK 在 Wayland 下的上游缺陷（见 [tauri#10702](https://github.com/tauri-apps/tauri/issues/10702)），在 KDE Plasma + NVIDIA 上最常见。新版本已在启动时自动注入 `WEBKIT_DISABLE_DMABUF_RENDERER=1`。旧版本若仍崩溃，优先手动用同一个 workaround 启动：

```bash
WEBKIT_DISABLE_DMABUF_RENDERER=1 ./WorkBreath
```

如果仍无法启动，再强制走 X11 后端作为最后兜底。部分 Wayland 桌面下 X11 兜底可能会出现渲染异常：

```bash
GDK_BACKEND=x11 ./WorkBreath
```

---

## 扩展能力（Beta）

<details>
<summary>护眼休息</summary>

使用独立计时器，默认 40 分钟工作 / 3 分钟强制休息；支持提前预告、自然离开重置、每块显示器同步遮挡，以及回来后的本轮回顾。

</details>

<details>
<summary>Bot 联动（Telegram / 飞书 / 钉钉 / 企业微信）</summary>

通过本地 API + 多设备注册，从 Telegram / 飞书 / 钉钉 / 企业微信远程查询记录与生成日报。支持命令：`/devices`、`/report`、`/generate` 等。仅限个人和本人多设备联动使用。

</details>

<details>
<summary>Localhost API</summary>

开启 Localhost API 后，应用会在本地开放 HTTP API（默认 `127.0.0.1:47831`），鉴权方式为 Bearer Token（首次启动自动生成，保存在数据目录的 `localhost_api_token.txt`）。

### 认证

所有请求（`/health` 和飞书回调除外）需携带 Token：

```
Authorization: Bearer <token>
```

或通过 Query 参数：`?token=<token>`

### 接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查（免鉴权） |
| GET | `/v1/device` | 设备信息 |
| GET | `/v1/timeline/{date}` | 时间线（`date` 格式 `YYYY-MM-DD`，支持 `?limit=&offset=`） |
| GET | `/v1/activities/{date}` | 活动列表（支持 `?limit=&offset=&category=`） |
| GET | `/v1/stats/today` | 今日统计 |
| GET | `/v1/stats/overview` | 综合统计（`?mode=today|date|week|range`） |
| GET | `/v1/stats/daily/{date}` | 指定日期统计 |
| GET | `/v1/reports` | 日报列表（`?limit=`） |
| GET | `/v1/reports/{date}` | 指定日期日报（`?locale=`） |
| GET | `/v1/reports/generate` | 生成日报（`?date=&locale=&force=true`） |
| POST | `/v1/reports/export-markdown` | 导出日报 Markdown（body: `{ date, locale }`） |
| GET | `/v1/apps/recent` | 最近使用的应用 |
| GET | `/v1/apps/category-overview` | 应用分类概览 |
| GET | `/v1/categories` | 应用分类列表 |
| GET | `/v1/categories/semantic` | 语义分类列表 |
| GET | `/v1/hourly-summaries/{date}` | 按小时汇总 |
| GET | `/v1/hourly-app-breakdown/{date}` | 按小时应用分布 |
| GET | `/v1/weekly-review` | 周报（`?date_from=&date_to=&limit=`） |
| GET | `/v1/storage/stats` | 存储统计 |

### 示例

```bash
# 获取今日时间线
curl -H "Authorization: Bearer $(cat ~/work-review/localhost_api_token.txt)" \
  http://127.0.0.1:47831/v1/timeline/2026-05-20

# 生成日报
curl -H "Authorization: Bearer $(cat ~/work-review/localhost_api_token.txt)" \
  "http://127.0.0.1:47831/v1/reports/generate?date=2026-05-20"
```

</details>

<details>
<summary>MCP Server</summary>

通过 stdio 协议将工作记录接入 AI 编码工具（Claude Code / Cursor / VS Code Copilot 等）。

```bash
cargo build --release -p work-review-mcp-server
```

```json
{
  "mcpServers": {
    "work-review": {
      "command": "/path/to/work-review-mcp-server",
      "env": {
        "WORK_REVIEW_DB_PATH": "/path/to/work_review.db",
        "WORK_REVIEW_CONFIG_PATH": "/path/to/config.json"
      }
    }
  }
}
```

</details>

---

## 开发

```bash
npm install
npm run tauri:dev    # 开发
npm run tauri:build  # 构建
```

要求：Node.js 18+ / Rust stable / Tauri 2 CLI · 技术栈：Tauri 2 + Rust + Svelte 4 + SQLite

---

## 社区交流

<p align="center"><strong>微信群</strong></p>

<p align="center">
  <img src="docs/group/wechat-group.png" alt="微信群" width="220" />
</p>

<p align="center"><small>如果二维码失效，关注下方公众号获取最新进群方式，或者进 TG 群吐槽</small></p>

---

<p align="center"><strong>公众号</strong></p>

<p align="center">
  <img src="docs/group/official-account.png" alt="公众号" width="220" />
</p>

---

<p align="center">
  <a href="https://t.me/+stYJLlkZbDYwM2Rl"><img src="https://img.shields.io/badge/Telegram-加入群组-26A5E4?style=flat-square&logo=telegram&logoColor=white" alt="Telegram"></a>
</p>

## 致谢

- 感谢 [linux.do](https://linux.do/) 社区的交流与讨论支持

## License

[MIT](./LICENSE) © 2026 wm94i, veniai

---

## 历史星标

<a href="https://www.star-history.com/#veniai/WorkBreath&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/star-history-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="docs/star-history.svg" />
    <img alt="Star History" src="docs/star-history.svg" width="720" />
  </picture>
</a>
