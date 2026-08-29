# design-tools · 设计工具集 🎨

[English](README.md) · **中文**

**一套零安装、离线、单文件的游戏 UI 设计辅助工具 —— 参数化纹样生成器、透视校准器,外加两个小脚本。**

![license](https://img.shields.io/badge/license-MIT-c9a227)
![deps](https://img.shields.io/badge/dependencies-zero-8888aa)
![offline](https://img.shields.io/badge/offline-yes-2a9d8f)

---

## 🌐 在线使用

**在线地址 → https://wanglustudio.com/tools/design-tools/**

打开链接、挑一个工具、直接在浏览器里用 —— 免安装、免配置,全程本地运行、离线可用。

---

## 🧰 工具

### 🎨 纹样生成器 · `pattern-gen/纹样生成器.html`
参数化装饰纹样生成器,SVG 矢量原生输出、零依赖、完全离线。多族纹样(中国 / 现代简约 / 科技 / 卡通 / 欧式西幻 / …)× 组合形式(无缝平铺 / 线性 / 环状 / **透视地面** …)× 6 材质 × 配色预设。可导入自己的图形当纹样、从连续大图提取重复单元、去纯色背景(容差实时调)、存预设与色板 —— 全部浏览器本地保存。导出无缝 **SVG / PNG**,支持透明底。
- 📄 [位图纹样矢量化-AI描摹](pattern-gen/位图纹样矢量化-AI描摹.md)

### 🧭 透视校准器 · `perspective/透视校准器.html`
把界面截图贴到平面上,拖动转到俯视 / 斜角任意角度,单平面透视数学正确(CSS 3D)。俯仰 / 左右 / 旋转 / 透视强度 / 缩放滑块;预设视角;可叠地面网格 + 界面透视网格;**一键导出透明底透视 PNG**。当透视真值参照或手绘底图用。

### 📄 md2pdf · `md2pdf/`
Markdown → 带中文字体的 PDF(表格 / 代码块正常显示),经一个 HTML 转换器 + Edge 无头打印。用法:`node md2pdf/md2html.js <输入.md> <临时.html>`,再用 Edge 无头把 HTML 打成 PDF。

### 📥 capture · `capture.py` / `capture.js`
抓取网页标题等元信息、追加到本地 inbox 笔记的小脚本(配个人笔记流用)。较私人化,一并附上。

### 🔷 形状组合器 · `shape-lab/形状组合器.html`
灰模刚变成形状那一步最贵——形状组合只有真做出来才看得出好不好看。这个工具一屏同时出 **12 个变体**,锁住对的那一轴、重掷其余的;选中一个后看**同一套形状语言套在五种件上**(主按钮 / 返回键 / 长条框 / 道具格 / 标题条),导出 SVG 拖进 PS 继续画。参数轴 = 轮廓(基底·转角·边缘)× 分割 × 填充 × 转角装饰。
⭐ 内置四条硬约束(轮廓封闭 / 与背景有明度差 / 留出文字位 / 同类成组),替你守住"像不像能点的东西",你只判断好不好看和符不符合世界观。

### 📋 策划案看板 · `spec-reader/`
把一份游戏 UI 策划案变成**一个能双击打开的看板**,按游戏 UI 制作的 5 层流程排:第 1 层给因(业务目标 / 用户任务 / 使用频次 + 装什么 + 排优先级),第 2 层给果(视觉层级高 / 中 / 低 + 视线路径 + 主 CTA),问题按「卡住第几层」归位、可一键复制去问策划。它不做总结,做的是**指出策划案里没说的话**——漏掉的界面、没写的状态、必须开工前定死的边界。
`board-template.html` 是模板,`build.py` 把数据塞进模板。🔒 分析数据含真实项目内容,不入库。

### ✂️ Sprite Cutout —— 已独立开源
裁透明边 + 9-slice 九宫格已拆成独立开源仓库:
👉 **https://github.com/lululucy0853-alt/sprite-cutout**

## 🚀 快速开始

两个设计工具是单个自包含 HTML 文件:**双击用浏览器打开**(推荐 Chrome / Edge)。无需安装 / 构建 / 服务器。 → 完整使用文档:**[docs/USAGE.zh-CN.md](docs/USAGE.zh-CN.md)**

## 🛫 自己部署

这里托管的东西全是静态、单文件、零依赖 —— 放到任意静态托管上一分钟搞定。

- **Cloudflare Pages**(推荐):后台 → *Workers & Pages → Create → Pages → 连接 Git* → 选这个仓库 → **构建命令:_留空_**,**输出目录:`/`**。在同一后台加自定义域名即可。
- **GitHub Pages**:仓库 **Settings → Pages → Source:_Deploy from a branch_ → `main` / `(root)`**,上线地址 `https://<用户名>.github.io/design-tools/`。

`index.html` 是落地页,链到各浏览器工具。`md2pdf/` 与 `capture` 是本地命令行脚本(Node / Python),需本地运行时,**不**属于托管站点。

## 🔒 隐私

HTML 工具纯前端处理 —— 图片和数据只在你本地浏览器里,**绝不上传**。

## 📚 文档

- [中文使用文档](docs/USAGE.zh-CN.md) · [English usage](docs/USAGE.md)

## 📄 许可

[MIT](LICENSE) © 2026 wanglu
