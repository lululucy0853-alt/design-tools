# design-tools 🎨

**English** · [中文](README.zh-CN.md)

**A small set of zero-install, offline, single-file design helpers for game-UI work — a parametric pattern generator, a perspective calibrator, plus a couple of utility scripts.**

![license](https://img.shields.io/badge/license-MIT-c9a227)
![deps](https://img.shields.io/badge/dependencies-zero-8888aa)
![offline](https://img.shields.io/badge/offline-yes-2a9d8f)

---

## 🌐 Use it online

**Live → https://lululucy0853-alt.github.io/design-tools/**

Open the link, pick a tool, and use it right in your browser — no install, no setup. Everything runs client-side and offline.

---

## 🧰 Tools

### 🎨 Pattern Generator · `pattern-gen/纹样生成器.html`
Parametric decorative-pattern generator with native SVG vector output, zero dependencies, fully offline. Multiple motif families (Chinese / Modern-minimal / Sci-fi / Cartoon / European-fantasy / …) × arrangements (seamless tile, linear, radial, **perspective ground**, …) × 6 materials × color palettes. Import your own shapes as motifs, extract the repeating unit from a seamless image, remove a solid background (live tolerance), and save presets & palettes — all in browser `localStorage`. Export seamless **SVG / PNG** with a transparent background.
- 📄 [Bitmap → editable vector (AI trace)](pattern-gen/位图纹样矢量化-AI描摹.md)

### 🧭 Perspective Calibrator · `perspective/透视校准器.html`
Drop a UI screenshot onto a plane and rotate it to any bird's-eye / tilted angle with mathematically correct single-plane perspective (CSS 3D). Sliders for pitch / yaw / roll / perspective strength / scale; preset angles; optional ground grid and on-plane perspective grid; **one-click export of a transparent-background perspective PNG**. Use it as a perspective ground-truth reference or a hand-drawing underlay.

### 📄 md2pdf · `md2pdf/`
Markdown → PDF with proper CJK fonts (tables & code blocks render correctly), via a small HTML converter + Edge headless print. Usage: `node md2pdf/md2html.js <in.md> <tmp.html>`, then print `tmp.html` to PDF with headless Edge.

### 📥 capture · `capture.py` / `capture.js`
Tiny helper scripts that fetch a web page's title/meta and append it to a local inbox note (paired with a personal note-taking workflow). Niche / personal — included for completeness.

### ✂️ Sprite Cutout — separate repo
Transparent-edge trimming + 9-slice is split into its own open-source repo:
👉 **https://github.com/lululucy0853-alt/sprite-cutout**

## 🚀 Quick start

The two design tools are single self-contained HTML files: **double-click to open in a browser** (Chrome / Edge recommended). No install, no build, no server. → Full guide: **[docs/USAGE.md](docs/USAGE.md)**

## 🛫 Deploy your own

Everything hosted here is static, single-file, zero-dependency — put it on any static host in a minute.

- **Cloudflare Pages** (recommended): dashboard → *Workers & Pages → Create → Pages → Connect to Git* → pick this repo → **Build command: _(none)_**, **Output directory: `/`**. Add a custom domain in the same dashboard.
- **GitHub Pages**: repo **Settings → Pages → Source: _Deploy from a branch_ → `main` / `(root)`**. It goes live at `https://<user>.github.io/design-tools/`.

`index.html` is a landing page that links the browser tools. `md2pdf/` and `capture` are local command-line scripts (Node / Python) — they need a local runtime and are **not** part of the hosted site.

## 🔒 Privacy

The HTML tools are 100% client-side — images and data stay in your browser and are **never uploaded**.

## 📚 Docs

- [Usage guide](docs/USAGE.md) · [中文使用文档](docs/USAGE.zh-CN.md)

## 📄 License

[MIT](LICENSE) © 2026 wanglu
