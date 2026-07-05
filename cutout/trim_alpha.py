#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量裁透明边 —— 按 alpha 包围盒，把 PNG / WebP / TGA 四周多余的透明像素裁掉。
用途：切图后去掉透明留白，让每张图紧贴内容边缘（做九宫格 / 引擎导入前的常规一步）。

两种用法：
  1) 直接把「文件夹」或「一堆图片」拖到  拖我-裁透明边.bat  上（推荐，最省事）。
  2) 命令行：
       python trim_alpha.py <文件或文件夹> [更多...] [选项]

选项：
  --pad N          裁完后四周各保留 N 像素透明边（默认 0，紧贴内容）
  --threshold N    alpha 阈值：<= N 的像素算「透明」（默认 0，只裁完全透明的；
                   若边缘有半透明羽化想一起裁掉，调大到如 10）
  --out DIR        输出目录（默认写到每张图同目录下的 _trimmed 子文件夹，不覆盖原图）
  --inplace        直接覆盖原图（谨慎！默认不覆盖）
  --no-recursive   拖文件夹时不进入子文件夹（默认会递归所有子目录）
  --meta           额外在输出目录写 _trim_meta.csv，记录每张的原尺寸/裁后尺寸/裁掉的偏移
                   （引擎里要还原锚点/位置时用得上）

安全：默认「不覆盖原图」，全部另存到 _trimmed。确认无误再考虑 --inplace。
"""

import sys
import csv
import argparse
from pathlib import Path

# Windows 控制台默认 GBK，中文 print 可能乱码 —— 强制 utf-8 输出
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

try:
    from PIL import Image, ImageOps
except ImportError:
    print("[×] 没装 Pillow。请先运行：python -m pip install Pillow")
    sys.exit(1)

# 支持的图片扩展名（带 alpha 的位图格式）
EXTS = {".png", ".webp", ".tga", ".tiff", ".tif"}


def collect_images(paths, recursive):
    """把传入的文件/文件夹展开成图片文件列表（去重、保序）。"""
    files = []
    seen = set()

    def add(p: Path):
        rp = p.resolve()
        if rp not in seen and p.suffix.lower() in EXTS:
            seen.add(rp)
            files.append(p)

    for raw in paths:
        p = Path(raw)
        if p.is_dir():
            it = p.rglob("*") if recursive else p.glob("*")
            for f in sorted(it):
                if f.is_file():
                    add(f)
        elif p.is_file():
            add(p)
        else:
            print(f"[!] 找不到：{raw}")
    return files


def trim_one(path: Path, pad: int, threshold: int):
    """裁一张图。返回 (状态, 信息dict)。状态 = ok / skip_opaque / skip_empty / error"""
    try:
        im = Image.open(path)
        im.load()
    except Exception as e:
        return "error", {"msg": str(e)}

    orig_w, orig_h = im.size

    # 取出 alpha 通道；没有 alpha 的图（不透明）无从裁，跳过
    if im.mode in ("RGBA", "LA"):
        rgba = im.convert("RGBA")
        alpha = rgba.getchannel("A")
    elif im.mode == "P" and "transparency" in im.info:
        rgba = im.convert("RGBA")
        alpha = rgba.getchannel("A")
    else:
        return "skip_opaque", {"orig": (orig_w, orig_h)}

    # 按阈值二值化 alpha：<= threshold 视为透明(0)，其余视为不透明(255)
    if threshold > 0:
        mask = alpha.point(lambda a: 255 if a > threshold else 0)
    else:
        mask = alpha

    bbox = mask.getbbox()  # (left, top, right, bottom)，全透明时为 None
    if bbox is None:
        return "skip_empty", {"orig": (orig_w, orig_h)}

    left, top, right, bottom = bbox
    # 已经紧贴边缘、且不需要额外 pad → 没必要重写
    if bbox == (0, 0, orig_w, orig_h) and pad == 0:
        return "skip_tight", {"orig": (orig_w, orig_h)}

    cropped = rgba.crop(bbox)
    if pad > 0:
        cropped = ImageOps.expand(cropped, border=pad, fill=(0, 0, 0, 0))

    new_w, new_h = cropped.size
    return "ok", {
        "orig": (orig_w, orig_h),
        "new": (new_w, new_h),
        "offset": (left, top),      # 内容左上角在原图中的位置（还原锚点用）
        "image": cropped,
    }


def out_path_for(src: Path, out_dir, inplace):
    if inplace:
        return src
    if out_dir:
        base = Path(out_dir)
    else:
        base = src.parent / "_trimmed"
    base.mkdir(parents=True, exist_ok=True)
    return base / src.name


def main():
    ap = argparse.ArgumentParser(add_help=False)
    ap.add_argument("inputs", nargs="*")
    ap.add_argument("--pad", type=int, default=0)
    ap.add_argument("--threshold", type=int, default=0)
    ap.add_argument("--out", default=None)
    ap.add_argument("--inplace", action="store_true")
    ap.add_argument("--no-recursive", dest="recursive", action="store_false")
    ap.add_argument("--meta", action="store_true")
    ap.add_argument("-h", "--help", action="store_true")
    args = ap.parse_args()

    if args.help or not args.inputs:
        print(__doc__)
        # 拖拽 bat 场景下双击无参数时，停一下让用户看到说明
        if not args.inputs and sys.stdin and sys.stdin.isatty():
            input("\n按回车关闭…")
        return

    files = collect_images(args.inputs, args.recursive)
    if not files:
        print("没找到可处理的图片（支持 " + " ".join(sorted(EXTS)) + "）。")
        return

    print(f"共 {len(files)} 张待处理"
          + (f"，输出到 _trimmed 子文件夹" if not args.inplace and not args.out else "")
          + (f"，覆盖原图" if args.inplace else "")
          + (f"，pad={args.pad}" if args.pad else "")
          + (f"，阈值={args.threshold}" if args.threshold else "")
          + "\n" + "-" * 56)

    meta_rows = []
    n_ok = n_skip = n_err = 0

    for src in files:
        status, info = trim_one(src, args.pad, args.threshold)
        if status == "ok":
            dst = out_path_for(src, args.out, args.inplace)
            try:
                info["image"].save(dst)
            except Exception as e:
                print(f"[×] 保存失败 {src.name}：{e}")
                n_err += 1
                continue
            ow, oh = info["orig"]
            nw, nh = info["new"]
            ox, oy = info["offset"]
            print(f"[✓] {src.name}: {ow}×{oh} → {nw}×{nh}  (裁掉左上偏移 {ox},{oy})")
            meta_rows.append([src.name, ow, oh, nw, nh, ox, oy])
            n_ok += 1
        elif status == "skip_tight":
            print(f"[=] {src.name}: 已经紧贴边缘，跳过")
            n_skip += 1
        elif status == "skip_opaque":
            print(f"[=] {src.name}: 没有透明通道，跳过")
            n_skip += 1
        elif status == "skip_empty":
            print(f"[=] {src.name}: 整张全透明，跳过")
            n_skip += 1
        else:
            print(f"[×] {src.name}: 打不开 —— {info.get('msg')}")
            n_err += 1

    print("-" * 56)
    print(f"完成：裁了 {n_ok} 张，跳过 {n_skip} 张" + (f"，失败 {n_err} 张" if n_err else ""))

    if args.meta and meta_rows:
        meta_base = Path(args.out) if args.out else (files[0].parent if args.inplace else files[0].parent / "_trimmed")
        meta_base.mkdir(parents=True, exist_ok=True)
        meta_path = meta_base / "_trim_meta.csv"
        with open(meta_path, "w", newline="", encoding="utf-8-sig") as f:
            w = csv.writer(f)
            w.writerow(["文件名", "原宽", "原高", "裁后宽", "裁后高", "裁掉左偏移", "裁掉上偏移"])
            w.writerows(meta_rows)
        print(f"偏移记录已写入：{meta_path}")

    # 拖拽 bat 双击场景，跑完停一下别秒关窗口
    if sys.stdin and sys.stdin.isatty():
        input("\n按回车关闭…")


if __name__ == "__main__":
    main()
