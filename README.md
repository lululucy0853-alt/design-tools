# design-tools · 设计工具集 🎨

**A small set of zero-install, offline, single-file design helpers for game-UI work — a parametric pattern generator, a perspective calibrator, plus a couple of utility scripts.**

**一套零安装、离线、单文件的游戏 UI 设计辅助工具 —— 参数化纹样生成器、透视校准器,外加两个小脚本。**

![license](https://img.shields.io/badge/license-MIT-c9a227)
![deps](https://img.shields.io/badge/dependencies-zero-8888aa)
![offline](https://img.shields.io/badge/offline-yes-2a9d8f)

---

## 🧰 Tools / 工具

### 🎨 Pattern Generator / 纹样生成器 · `pattern-gen/纹样生成器.html`
- **EN** — Parametric decorative-pattern generator with native SVG vector output, zero dependencies, fully offline. Multiple motif families (Chinese / Modern-minimal / Sci-fi / Cartoon / European-fantasy / …) × arrangements (seamless tile, linear, radial, **perspective ground**, …) × 6 materials × color palettes. Import your own shapes as motifs, extract the repeating unit from a seamless image, remove a solid background (live tolerance), and save presets & palettes — all in browser `localStorage`. Export seamless **SVG / PNG** with a transparent background.
- **中文** — 参数化装饰纹样生成器,SVG 矢量原生输出、零依赖、完全离线。多族纹样(中国 / 现代简约 / 科技 / 卡通 / 欧式西幻 / …)× 组合形式(无缝平铺 / 线性 / 环状 / **透视地面** …)× 6 材质 × 配色预设。可导入自己的图形当纹样、从连续大图提取重复单元、去纯色背景(容差实时调)、存预设与色板 —— 全部浏览器本地保存。导出无缝 **SVG / PNG**,支持透明底。
- 📄 [Bitmap → editable vector (AI trace) / 位图纹样矢量化-AI描摹](pattern-gen/位图纹样矢量化-AI描摹.md)

### 🧭 Perspective Calibrator / 透视校准器 · `perspective/透视校准器.html`
- **EN** — Drop a UI screenshot onto a plane and rotate it to any bird's-eye / tilted angle with mathematically correct single-plane perspective (CSS 3D). Sliders for pitch / yaw / roll / perspective strength / scale; preset angles; optional ground grid and on-plane perspective grid; **one-click export of a transparent-background perspective PNG**. Use it as a perspective ground-truth reference or a hand-drawing underlay.
- **中文** — 把界面截图贴到平面上,拖动转到俯视 / 斜角任意角度,单平面透视数学正确(CSS 3D)。俯仰 / 左右 / 旋转 / 透视强度 / 缩放滑块;预设视角;可叠地面网格 + 界面透视网格;**一键导出透明底透视 PNG**。当透视真值参照或手绘底图用。

### 📄 md2pdf · `md2pdf/`
- **EN** — Markdown → PDF with proper CJK fonts (tables & code blocks render correctly), via a small HTML converter + Edge headless print. Usage: `node md2pdf/md2html.js <in.md> <tmp.html>`, then print `tmp.html` to PDF with headless Edge.
- **中文** — Markdown → 带中文字体的 PDF(表格 / 代码块正常显示),经一个 HTML 转换器 + Edge 无头打印。用法:`node md2pdf/md2html.js <输入.md> <临时.html>`,再用 Edge 无头把 HTML 打成 PDF。

### 📥 capture · `capture.py` / `capture.js`
- **EN** — Tiny helper scripts that fetch a web page's title/meta and append it to a local inbox note (paired with a personal note-taking workflow). Niche / personal — included for completeness.
- **中文** — 抓取网页标题等元信息、追加到本地 inbox 笔记的小脚本(配个人笔记流用)。较私人化,一并附上。

### ✂️ Sprite Cutout — separate repo / 已独立开源
Transparent-edge trimming + 9-slice is split into its own open-source repo:
裁透明边 + 9-slice 九宫格已拆成独立开源仓库:
👉 **https://github.com/lululucy0853-alt/sprite-cutout**

## 🚀 Quick start / 快速开始

**EN** — The two design tools are single self-contained HTML files: **double-click to open in a browser** (Chrome / Edge recommended). No install, no build, no server. → Full guide: **[docs/USAGE.md](docs/USAGE.md)**

**中文** — 两个设计工具是单个自包含 HTML 文件:**双击用浏览器打开**(推荐 Chrome / Edge)。无需安装 / 构建 / 服务器。 → 完整使用文档:**[docs/USAGE.md](docs/USAGE.md)**

## 🔒 Privacy / 隐私

**EN** — The HTML tools are 100% client-side — images and data stay in your browser and are **never uploaded**.

**中文** — HTML 工具纯前端处理 —— 图片和数据只在你本地浏览器里,**绝不上传**。

## 📄 License / 许可

[MIT](LICENSE) © 2026 wanglu
