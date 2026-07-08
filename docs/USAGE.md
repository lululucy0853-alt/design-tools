# Usage Guide

**English** · [中文](USAGE.zh-CN.md)

> The two headline tools are single self-contained HTML files — just **double-click to open** in a browser (Chrome / Edge recommended). No install, no build, no server.

---

## 🎨 Pattern Generator — `pattern-gen/纹样生成器.html`

1. **Pick a motif** — choose a family (Modern / Chinese / Sci-fi / …) then a motif chip.
2. **Pick an arrangement** — tile (seamless), linear, radial, ring, **perspective ground**, single-enlarged, etc.
3. **Pick a material** — flat / sketch / embroidery / gold / halftone / paper.
4. **Tune parameters** — element size, density, rotation, jitter, random seed (🎲). Toggle **outline ↔ filled**.
5. **Colors** — pick a palette or set background / main / aux / accent; there's a white-on-gray "inspect shape" default.
6. **Perspective ground** exposes extra sliders: vanishing-point X, horizon, depth.
7. **Custom motifs** — import an image as a motif, or extract the repeating unit from a seamless image; optionally remove a solid background (live tolerance). Save your own presets & palettes (stored in the browser).
8. **Export** — SVG (built-in motifs are editable vector paths) or PNG, with optional transparent background.

> Turning bitmap patterns into editable vector paths in Illustrator: see [位图纹样矢量化-AI描摹.md](../pattern-gen/位图纹样矢量化-AI描摹.md).

---

## 🧭 Perspective Calibrator — `perspective/透视校准器.html`

1. **Load a UI screenshot** — click "＋ pick an image". Without one, a built-in sample interface is used. On load it auto-poses to a tilted bird's-eye view.
2. **Set the angle** — drag anywhere on the stage to rotate, or use the sliders: pitch **X** / yaw **Y** / roll **Z** / perspective strength / scale. Preset views: flat / top-down / tilted / bottom-up / side.
3. **Read the perspective** — toggle **ground grid** (space context) and **on-plane perspective grid** (read the surface deformation). The HUD shows the exact angles so you can reproduce them.
4. **Export** — "Export perspective PNG" renders the loaded image at the current angle to a **transparent-background PNG** (cleaner than a screenshot, drops straight into Photoshop). The built-in sample has no source image → use a system screenshot instead.

> Single-plane perspective (one flat interface at an angle) — perfect for UI. For multi-plane scenes with real thickness/lighting, use Blender / Spline instead.

---

## 📄 md2pdf — `md2pdf/`

Convert a Markdown file to a PDF with proper CJK fonts:
```
node md2pdf/md2html.js <in.md> <tmp.html>
```
then print `tmp.html` to PDF with headless Edge (`msedge --headless=new --print-to-pdf=out.pdf file:///.../tmp.html`). Requires Node.js and a Chromium browser.

---

## 📥 capture — `capture.py` / `capture.js`

Fetch a page's title/meta and append it to a local inbox note. Personal / niche; expects a specific note-folder layout, adapt paths before use.
