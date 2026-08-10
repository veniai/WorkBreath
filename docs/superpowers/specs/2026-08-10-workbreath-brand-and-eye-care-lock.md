# WorkBreath 品牌与护眼结束锁屏规格

## 需求

- 正式产品使用 `WorkBreath`、中文名“息刻”和口号“工作有迹，双眼有息”，采用已确认的横向蓝绿品牌符号。
- 用户可见的应用界面、窗口、关于页、当前说明文档、安装包显示名称和图标使用新品牌。
- 为保证已有安装、数据和更新链路连续，内部包名、可执行文件名、Bundle ID、数据目录、更新地址和旧品牌识别别名继续兼容。
- 护眼休息前横幅不得在圆角之外出现透明窗口的方形阴影。
- 新增“休息结束后锁屏”设置，默认开启；固定休息正常倒计时完成后释放遮罩并请求系统锁屏。应急解除、自然休息和功能关闭不得触发锁屏。
- 锁屏失败必须安全降级：不延长遮罩、不阻塞等待返回、不崩溃，只记录本地错误。
- 已追加授权：提交并推送功能分支、创建普通 PR；CI 通过后合并，随后将版本更新为 `1.4.1`、再次通过发布准备检查并推送 `v1.4.1` 标签，由现有 Release workflow 正式发布。

## 调研发现

- 护眼预告原生窗口已经关闭系统阴影；方形轮廓来自覆盖整个透明 WebView 的 CSS `filter: drop-shadow(...)`。
- 护眼状态机已有单次 `completed_rest` 转换，可作为锁屏唯一触发点；结束后现有 `WAITING_RETURN` 与首次输入回顾流程可以继续复用。
- Windows 有原生 `LockWorkStation`；Linux 的 systemd 会话可用 `loginctl lock-session`；macOS 没有适合本项目的公开直接锁屏 API，使用系统自带 `CGSession -suspend` 尽力支持并保留实机验证项。
- `productName` 和用户可见标题可更名；`work-review`、`Work_Review`、`com.workreview.app` 与旧自有窗口识别必须保留，避免数据目录、升级和采集排除发生断裂。

## 可观察结果与检测

| 可观察结果 | 检测 |
|---|---|
| 侧边栏、窗口栏、关于页、休息层和当前 README 使用 WorkBreath 品牌 | 源码品牌扫描；前端测试；生产构建；浏览器截图 |
| 正式应用图标来自横向符号，且各平台/尺寸资源完整 | `npm run icons:build`；PNG 尺寸与 ICO/ICNS 文件检查 |
| 内部兼容标识与旧品牌排除别名仍在 | 配置/工作流源码断言；Rust 自有窗口测试 |
| 预告横幅不再使用全窗口 drop-shadow | 前端源码回归测试；预告视觉截图；原生窗口继续 `shadow(false)` |
| 锁屏设置默认开启，旧配置缺失字段时也为开启 | Rust 配置序列化测试；前端设置测试；四语言文案检查 |
| 只有固定休息正常完成触发一次锁屏请求 | 状态转换测试；主循环源码测试；应急解除/自然休息反例 |
| Windows/Linux/macOS 各有明确实现且失败不阻塞 | 平台条件编译；锁屏模块单元测试；错误路径日志断言 |
| 现有工作记录、回顾和等待返回流程不回退 | `node --test`；`cargo test --workspace`；`npm run build` |
| Linux 当前环境和 Windows 目标能够编译 | `cargo check --workspace --all-targets`；Windows 交叉 `cargo check`（若系统依赖允许） |

Windows 透明窗口与真实锁屏、macOS `CGSession`、Linux 不同桌面会话仍需对应平台实机验收，不能用当前 Linux 浏览器预览代替。
