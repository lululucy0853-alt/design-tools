# Usage Guide / 使用文档

> The two headline tools are single self-contained HTML files — just **double-click to open** in a browser (Chrome / Edge recommended). No install, no build, no server.
> 两个主力工具都是单个自包含 HTML 文件 —— **双击用浏览器打开**即可(推荐 Chrome / Edge)。无需安装、构建或服务器。

---

## 🎨 Pattern Generator / 纹样生成器 — `pattern-gen/纹样生成器.html`

**EN**
1. **Pick a motif** — choose a family (Modern / Chinese / Sci-fi / …) then a motif chip.
2. **Pick an arrangement** — tile (seamless), linear, radial, ring, **perspective ground**, single-enlarged, etc.
3. **Pick a material** — flat / sketch / embroidery / gold / halftone / paper.
4. **Tune parameters** — element size, density, rotation, jitter, random seed (🎲). Toggle **outline ↔ filled**.
5. **Colors** — pick a palette or set background / main / aux / accent; there's a white-on-gray "inspect shape" default.
6. **Perspective ground** exposes extra sliders: vanishing-point X, horizon, depth.
7. **Custom motifs** — import an image as a motif, or extract the repeating unit from a seamless image; optionally remove a solid background (live tolerance). Save your own presets & palettes (stored in the browser).
8. **Export** — SVG (built-in motifs are editable vector paths) or PNG, with optional transparent background.

**中文**
1. **选纹样** —— 先选族(现代简约 / 中国 / 科技 / …),再点具体纹样。
2. **选组合形式** —— 平铺(无缝)、线性、集中、环状、**透视地面**、单张放大等。
3. **选材质** —— 扁平 / 手绘 / 刺绣 / 描金 / 网点 / 纸质。
4. **调参数** —— 元素大小、密度、旋转、抖动、随机种子(🎲)。可切「**线框 ↔ 实心**」。
5. **配色** —— 选色板,或分别设背景 / 主 / 辅 / 点缀;默认是「白纹样 + 灰底」方便看清形状。
6. **透视地面**下会多出滑块:灭点 X、地平线、纵深。
7. **自定义纹样** —— 导入一张图当纹样,或从连续大图提取重复单元;可去纯色背景(容差实时调)。可存自己的预设和色板(浏览器本地保存)。
8. **导出** —— SVG(内置纹样是可编辑矢量路径)或 PNG,可选透明背景。

> 📄 Turning bitmap patterns into editable vector paths in Illustrator: see [位图纹样矢量化-AI描摹.md](../pattern-gen/位图纹样矢量化-AI描摹.md).
> 把位图纹样在 Illustrator 里转成可编辑矢量路径:见 [位图纹样矢量化-AI描摹.md](../pattern-gen/位图纹样矢量化-AI描摹.md)。

---

## 🧭 Perspective Calibrator / 透视校准器 — `perspective/透视校准器.html`

**EN**
1. **Load a UI screenshot** — click "＋ pick an image". Without one, a built-in sample interface is used. On load it auto-poses to a tilted bird's-eye view.
2. **Set the angle** — drag anywhere on the stage to rotate, or use the sliders: pitch **X** / yaw **Y** / roll **Z** / perspective strength / scale. Preset views: flat / top-down / tilted / bottom-up / side.
3. **Read the perspective** — toggle **ground grid** (space context) and **on-plane perspective grid** (read the surface deformation). The HUD shows the exact angles so you can reproduce them.
4. **Export** — "Export perspective PNG" renders the loaded image at the current angle to a **transparent-background PNG** (cleaner than a screenshot, drops straight into Photoshop). The built-in sample has no source image → use a system screenshot instead.

**中文**
1. **载入界面图** —— 点「＋ 选一张界面截图」。不选就用内置示例界面。载入后自动摆成斜俯视。
2. **设角度** —— 在舞台上拖动即可旋转,或用滑块:俯仰 **X** / 左右 **Y** / 旋转 **Z** / 透视强度 / 缩放。预设视角:平视 / 俯视 / 斜俯视 / 仰视 / 侧斜。
3. **读透视** —— 可叠「**地面网格**」(衬空间)和「**界面透视网格**」(读表面变形)。底部 HUD 显示精确角度,方便复现。
4. **导出** —— 「导出透视 PNG」把载入的图按当前角度渲染成**透明底 PNG**(比系统截图干净,可直接叠进 PS)。内置示例没有原图 → 请用系统截图。

> Single-plane perspective (one flat interface at an angle) — perfect for UI. For multi-plane scenes with real thickness/lighting, use Blender / Spline instead.
> 单平面透视(一张平的界面摆角度)—— 正好是 UI 场景。要多面叠加、真实厚度光影的复杂 3D,请用 Blender / Spline。

---

## 📄 md2pdf — `md2pdf/`

**EN** — Convert a Markdown file to a PDF with proper CJK fonts:
```
node md2pdf/md2html.js <in.md> <tmp.html>
```
then print `tmp.html` to PDF with headless Edge (`msedge --headless=new --print-to-pdf=out.pdf file:///.../tmp.html`). Requires Node.js and a Chromium browser.

**中文** —— 把 Markdown 转成带中文字体的 PDF:
```
node md2pdf/md2html.js <输入.md> <临时.html>
```
再用 Edge 无头把 HTML 打成 PDF(`msedge --headless=new --print-to-pdf=输出.pdf file:///.../临时.html`)。需要 Node.js 和 Chromium 内核浏览器。

---

## 📥 capture — `capture.py` / `capture.js`

**EN** — Fetch a page's title/meta and append it to a local inbox note. Personal / niche; expects a specific note-folder layout, adapt paths before use.

**中文** —— 抓取网页标题等元信息、追加到本地 inbox 笔记。较私人化,依赖特定笔记目录结构,用前先改路径。
