# /lab 光学陈列台：可复用区块

日期：2026-10-03（Australia/Melbourne）  
分支：`discovery`。初稿由用户备份到 `7e3b5e1`；本轮补充手势修正、间距、复用说明与验证脚本，保持未提交。

## 创意与视觉

在实验列表和兴趣区之间加入一个可交互的光学陈列台，让页面从观看波浪过渡到主动探索材质。左侧展示物件，右侧采用编辑式目录与光照控制，手机上改为上下排列。只增加一个视觉停顿，不叠加弹窗、粒子或新的鼠标跟随系统。

三个可替换展品：Lens 的弧面反射、Layers 的霜面叠层、Prism 的切面与柔和色谱。亮色使用暖日光，暗色使用银蓝月光。它们由 CSS 渐变、阴影、半透明背景模糊与少量 SVG 构成，是材质的视觉近似，不是物理折射模拟。现有英文标题、说明和编号均为样例，正式文案可直接替换。

物件有 11 秒周期、约 6px 幅度的缓慢悬浮；切换展品采用 480ms 淡入。横向拖动物件区域或操作原生滑杆可移动光照，Reset 恢复 HTML 中的初始角度。触屏先判断横向意图，纵向手势仍用于页面滚动。没有新增持续 requestAnimationFrame 循环；背景模糊与合成仍有 GPU 开销，不能视作零成本。

## 复用方法

1. 从 `lab/index.html` 复制整个 `section[data-light-study]`，保留内部布局与控件。多个区块的外层锚点 `id` 应不同，或移除外层 `id`。
2. 引入 `lab/light-study.css`，在页面模块中调用控制器：

```js
import { enhanceLightStudies, createLightStudy } from './light-study.js';
const instances = enhanceLightStudies(document);
// 动态插入一个区块时：
const instance = createLightStudy(newSection);
// 删除该区块前清理监听与观察器：
instance?.dispose();
```

`createLightStudy` 可重复调用，返回同一个实例。标题、tab 和面板的无障碍 ID 自动生成，各实例状态独立。控制器不依赖波浪 Canvas；在别的页面使用时调整模块与 CSS 路径，并自行设置外层宽度、留白与字体。宿主的 `.wrap`、`.eyebrow` 属于页面样式，不在组件内定义。

### 内容与展品契约

| 标记 | 用途 |
| --- | --- |
| `data-light-study`、`data-specimen` | 区块根节点、初始展品 key |
| `data-study-art="key"` | 展品容器，key 与选择按钮匹配；内部可换成 CSS、SVG 或图片 |
| `data-study-choice="key"` | 选择按钮；`data-caption`、`data-number` 提供说明与编号 |
| `data-study-display`、`data-study-choices` | 展示面板与目录，初始化后成为 tabpanel/tablist |
| `data-study-title`、`data-study-caption`、`data-study-number` | 标题、当前说明与编号 |
| `data-study-controls`、`data-study-light` | 控件容器、原生 range 输入 |
| `data-study-angle`、`data-study-reset` | 角度输出、复位按钮 |
| `data-study-hint`、`data-study-hint-active` | 可选提示；无 JS 时显示原文，初始化后换成 `data-study-hint-active` 的文案（未提供则不变） |
| `data-format`（在 `data-study-angle` 上） | 角度显示模板，默认 `{signed}°`；`{value}` 为纯数字，`{signed}` 带 −/+ |
| `data-valuetext`（在 range 上） | 读屏文案模板，默认 `{value}°` |
| `data-study-theme` | 可选 `light` / `dark` / `auto`：强制主题或跟随系统，使用区块自带色板 |
| `data-study-motion="paused"` | 仅暂停本区块的自动悬浮 |

所有可见文案都在 HTML 中，JS 不含任何文案。标题和导语不要写 `<br>`，换行由 `text-wrap:balance/pretty` 处理。无需修改 JS 即可替换文案、编号或展品 key。新展品默认只显示第一个，其他容器带 `hidden`；按钮与控件容器默认带 `hidden`，由 JS 成功初始化后显示。SVG 若有内部 ID，需要自行保证多实例时唯一。

角度范围、初始值与复位值都取自 range 的 `min`、`max`、`value`。拖动灵敏度与光源位置会按范围自动换算；`−45° / +45°` 刻度文字是 HTML 文案，改范围时一并修改。

### 光照与主题变量

控制器更新 `--study-light`（光照方向，−1 为左、+1 为右）、`--study-key`（光源位置）、`--study-angle`（光照角度）、`--study-turn`（轻微物件转角）、`--study-progress`（滑杆进度）。新展品可在自身渐变、反射和变换中使用这些变量；阴影与高光偏移建议写成 `clamp(-a, calc(var(--study-light) * -3a), a)`，光线越过中线时自动翻面。`.study-object` 的直接子元素共享同一网格单元，附加图层（如 Prism 的色散光束）放在其中即可与物件同步悬浮与转动。替换为图片并不会自动获得真实光照响应。

颜色优先继承宿主 `--bg`、`--ink`、`--muted`、`--line`、`--accent`，并有独立默认值。暗色由祖先 `.dark-mode` 控制。可按区块覆盖 `--study-bg`、`--study-glow`、`--study-edge`、`--study-shadow`、`--study-glass`、`--study-reflect`，注意暗色规则的优先级。

### 宿主契约与尺寸

| 宿主提供（均可选） | 缺省时 |
| --- | --- |
| `--bg` `--ink` `--muted` `--line` `--accent` | 区块自带亮色值 |
| `--sans` `--serif` `--mono` | 系统字体栈 |
| 祖先 `.dark-mode` 或 `[data-theme="dark"]` | 亮色；或用 `data-study-theme` |
| `<html>` 上的 `.motion-paused` | 不暂停；或用 `data-study-motion` |

布局按区块自身宽度切换（容器查询 `light-study`）：宽度 ≤990px 时收紧为双栏，≤680px 时上下堆叠；展示区宽度 ≤340px 时隐藏手势提示。展品尺寸使用展示区的 `cqw`，在侧栏或窄栏中同样成立。叠层板的尺寸与间距由 `.study-scene` 上的 `--plate-w`、`--plate-dx`、`--plate-dy`、`--plate-top` 控制。小号等宽标签统一由 `--study-label`（10px）与 `--study-label-sm`（9px）调节。外层上边距仍跟随视口，属于页面节奏。

## 交互与降级

- 目录支持方向键、Home、End；滑杆保留原生键盘与屏幕阅读器语义。
- `.motion-paused`、`data-study-motion="paused"` 或系统减少动态效果偏好关闭自动悬浮与入场（状态写入 `data-still`）；主动切换展品、拖动和滑杆仍可用。
- IntersectionObserver 与页面可见性控制自动悬浮，离屏或后台时停止；离屏、失焦、释放手势及 pagehide 清理拖动状态。
- 无 JavaScript 时保留第一件静态展品与样例说明，隐藏不可用的选择和滑杆控件。

## 验证

`check-light-study.cjs` 另含复用契约检查：480px 容器内堆叠且无溢出、叠层板不越出展示区、提示与角度文案取自 HTML、自定义 range（−10° 至 30°）的进度映射、强制暗色与单区块暂停、标题无 `<br>`。

2026-10-03 复核（分支 `discovery-light-study-reuse`）：上述检查在云端 headless Chromium 通过，另在无 `lab.css` 的独立页面中以 1100/480/320px 容器人工查看。`check-lab.cjs` 在该环境因无 GPU（单帧约 250ms）卡在 “leftward lean” 断言，修改前后结果相同，需在本机复核。暗色 Layers 前板内出现的竖向硬边在软件渲染下可复现，去掉后两块板的背景模糊也未消除，待真机确认。


可选脚本 `scripts/check-light-study.cjs`，使用现有 Playwright 安装，不增加生产依赖。运行前启动本地服务：

```sh
python3 server.py
# 另一终端，系统已有 Playwright 时：
node scripts/check-light-study.cjs
node scripts/check-lab.cjs
```

可配置 `PLAYWRIGHT_MODULE`、`BROWSER_EXECUTABLE`、`LAB_BASE_URL`（默认 http://127.0.0.1:8001）与 `LAB_QA_OUTPUT`（默认系统临时目录 lab-qa）。脚本导出截图，默认不修改正式波浪 poster。

本轮 Chromium 验证通过：三个展品、亮暗主题、鼠标拖动与复位、CDP 触屏横向拖动及纵向滚动、键盘导航、独立实例与 ID、320–1440px 无横向溢出、暂停/减少动态/离屏、无 JS 静态展示、无页面错误。原波浪回归检查亦通过，包括 Canvas 与存储不可用时的降级。人工查看桌面暗色叠层及手机亮色布局。触屏为浏览器模拟，尚未覆盖真实 iOS Safari 与设备性能。
